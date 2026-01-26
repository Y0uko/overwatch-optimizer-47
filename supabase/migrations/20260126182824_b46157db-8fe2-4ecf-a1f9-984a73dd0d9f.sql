-- Create a table for tracking API rate limits
CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint, window_start)
);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit records
CREATE POLICY "Users can view own rate limits"
ON public.api_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all rate limits (for edge functions)
-- No public INSERT/UPDATE/DELETE - edge functions use service role

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_user_endpoint ON public.api_rate_limits(user_id, endpoint, window_start);

-- Create function to check and increment rate limit
-- Returns true if request is allowed, false if rate limited
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _endpoint text,
  _max_requests integer DEFAULT 50,
  _window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamp with time zone;
  _current_count integer;
BEGIN
  -- Calculate the start of the current time window
  _window_start := date_trunc('hour', now()) + 
    (floor(extract(minute from now()) / _window_minutes) * _window_minutes) * interval '1 minute';
  
  -- Try to insert or update the rate limit record
  INSERT INTO public.api_rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (_user_id, _endpoint, _window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO _current_count;
  
  -- Check if we've exceeded the limit
  RETURN _current_count <= _max_requests;
END;
$$;

-- Create function to get remaining requests
CREATE OR REPLACE FUNCTION public.get_rate_limit_remaining(
  _user_id uuid,
  _endpoint text,
  _max_requests integer DEFAULT 50,
  _window_minutes integer DEFAULT 60
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamp with time zone;
  _current_count integer;
BEGIN
  _window_start := date_trunc('hour', now()) + 
    (floor(extract(minute from now()) / _window_minutes) * interval '1 minute');
  
  SELECT request_count INTO _current_count
  FROM public.api_rate_limits
  WHERE user_id = _user_id 
    AND endpoint = _endpoint 
    AND window_start = _window_start;
  
  IF _current_count IS NULL THEN
    RETURN _max_requests;
  END IF;
  
  RETURN GREATEST(0, _max_requests - _current_count);
END;
$$;

-- Cleanup old rate limit records (can be run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.api_rate_limits
  WHERE window_start < now() - interval '24 hours';
$$;