-- Add perk columns to items table for easier management
ALTER TABLE public.items
ADD COLUMN has_weapon_lifesteal boolean NOT NULL DEFAULT false,
ADD COLUMN has_ability_lifesteal boolean NOT NULL DEFAULT false,
ADD COLUMN has_attack_speed boolean NOT NULL DEFAULT false,
ADD COLUMN has_max_ammo boolean NOT NULL DEFAULT false;

-- Update existing items based on their special_effect text
UPDATE public.items SET has_attack_speed = true 
WHERE LOWER(special_effect) LIKE '%attack speed%';

UPDATE public.items SET has_max_ammo = true 
WHERE LOWER(special_effect) LIKE '%max ammo%' OR LOWER(special_effect) LIKE '%ammo%';

UPDATE public.items SET has_weapon_lifesteal = true 
WHERE LOWER(special_effect) LIKE '%weapon lifesteal%';

UPDATE public.items SET has_ability_lifesteal = true 
WHERE LOWER(special_effect) LIKE '%ability lifesteal%';