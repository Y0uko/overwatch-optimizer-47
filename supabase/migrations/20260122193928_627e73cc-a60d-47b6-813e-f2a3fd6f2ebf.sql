-- Add new stat columns to items table (percentages as integers)
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS shield_bonus integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS armor_bonus integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cooldown_reduction integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS attack_speed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ability_lifesteal integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_ammo integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS weapon_lifesteal integer DEFAULT 0;

-- Migrate existing boolean values to percentages (10% as default for "has" = true)
UPDATE public.items SET attack_speed = 10 WHERE has_attack_speed = true;
UPDATE public.items SET ability_lifesteal = 10 WHERE has_ability_lifesteal = true;
UPDATE public.items SET max_ammo = 10 WHERE has_max_ammo = true;
UPDATE public.items SET weapon_lifesteal = 10 WHERE has_weapon_lifesteal = true;

-- Drop old boolean columns
ALTER TABLE public.items
DROP COLUMN IF EXISTS has_attack_speed,
DROP COLUMN IF EXISTS has_ability_lifesteal,
DROP COLUMN IF EXISTS has_max_ammo,
DROP COLUMN IF EXISTS has_weapon_lifesteal;