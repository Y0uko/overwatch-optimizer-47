export type CharacterRole = 'tank' | 'damage' | 'support';
export type ItemCategory = 'weapon' | 'ability' | 'survival' | 'gadget';
export type ItemRarity = 'common' | 'rare' | 'epic';

export interface Character {
  id: string;
  name: string;
  role: CharacterRole;
  health: number;
  base_damage: number;
  image_url: string | null;
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
  special_effect: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  has_weapon_lifesteal: boolean;
  has_ability_lifesteal: boolean;
  has_attack_speed: boolean;
  has_max_ammo: boolean;
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
