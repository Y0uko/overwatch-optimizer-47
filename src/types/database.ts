export type CharacterRole = 'tank' | 'damage' | 'support';
export type ItemCategory = 'weapon' | 'ability' | 'survival' | 'gadget';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Character {
  id: string;
  name: string;
  role: CharacterRole;
  health: number;
  base_damage: number;
  image_url: string | null;
  full_body_url: string | null;
  description: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  cost: number;
  damage_bonus: number | null;
  health_bonus: number | null;
  ability_power: number | null;
  // Percentage-based stats (new schema)
  shield_bonus?: number | null;
  armor_bonus?: number | null;
  cooldown_reduction?: number | null;
  attack_speed?: number | null;
  ability_lifesteal?: number | null;
  max_ammo?: number | null;
  weapon_lifesteal?: number | null;
  // Legacy boolean fields (for backwards compatibility during migration)
  has_weapon_lifesteal?: boolean;
  has_ability_lifesteal?: boolean;
  has_attack_speed?: boolean;
  has_max_ammo?: boolean;
  special_effect: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface UserBuild {
  id: string;
  user_id: string;
  character_id: string;
  name: string;
  notes: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface BuildItem {
  id: string;
  build_id: string;
  item_id: string;
  slot_order: number;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
