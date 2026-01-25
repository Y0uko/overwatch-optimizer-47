import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import { ItemCategory, ItemRarity } from '@/types/database';
import { PerkBadge, PerkType } from '@/components/ui/PerkBadge';

interface AddItemDialogProps {
  onItemAdded: () => void;
}

const categories: ItemCategory[] = ['weapon', 'ability', 'survival', 'gadget'];
const rarities: ItemRarity[] = ['common', 'rare', 'epic', 'legendary'];

const statFields: { key: string; label: string; perkType?: PerkType }[] = [
  { key: 'weapon_lifesteal', label: 'W.Lifesteal %', perkType: 'weapon-lifesteal' },
  { key: 'ability_lifesteal', label: 'A.Lifesteal %', perkType: 'ability-lifesteal' },
  { key: 'attack_speed', label: 'Atk Speed %', perkType: 'attack-speed' },
  { key: 'max_ammo', label: 'Max Ammo %', perkType: 'max-ammo' },
  { key: 'shield_bonus', label: 'Shield %', perkType: 'shield' },
  { key: 'armor_bonus', label: 'Armor %', perkType: 'armor' },
  { key: 'cooldown_reduction', label: 'CDR %', perkType: 'cooldown' },
];

export function AddItemDialog({ onItemAdded }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    category: 'weapon' as ItemCategory,
    rarity: 'common' as ItemRarity,
    cost: '',
    damage_bonus: '',
    health_bonus: '',
    ability_power: '',
    weapon_lifesteal: '',
    ability_lifesteal: '',
    attack_speed: '',
    max_ammo: '',
    shield_bonus: '',
    armor_bonus: '',
    cooldown_reduction: '',
    image_url: '',
    description: '',
    special_effect: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'weapon',
      rarity: 'common',
      cost: '',
      damage_bonus: '',
      health_bonus: '',
      ability_power: '',
      weapon_lifesteal: '',
      ability_lifesteal: '',
      attack_speed: '',
      max_ammo: '',
      shield_bonus: '',
      armor_bonus: '',
      cooldown_reduction: '',
      image_url: '',
      description: '',
      special_effect: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    
    if (!formData.cost || parseInt(formData.cost) <= 0) {
      toast({ title: 'Valid cost is required', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const itemData = {
      name: formData.name.trim(),
      category: formData.category,
      rarity: formData.rarity,
      cost: parseInt(formData.cost) || 0,
      damage_bonus: formData.damage_bonus ? parseInt(formData.damage_bonus) : 0,
      health_bonus: formData.health_bonus ? parseInt(formData.health_bonus) : 0,
      ability_power: formData.ability_power ? parseInt(formData.ability_power) : 0,
      weapon_lifesteal: formData.weapon_lifesteal ? parseInt(formData.weapon_lifesteal) : 0,
      ability_lifesteal: formData.ability_lifesteal ? parseInt(formData.ability_lifesteal) : 0,
      attack_speed: formData.attack_speed ? parseInt(formData.attack_speed) : 0,
      max_ammo: formData.max_ammo ? parseInt(formData.max_ammo) : 0,
      shield_bonus: formData.shield_bonus ? parseInt(formData.shield_bonus) : 0,
      armor_bonus: formData.armor_bonus ? parseInt(formData.armor_bonus) : 0,
      cooldown_reduction: formData.cooldown_reduction ? parseInt(formData.cooldown_reduction) : 0,
      image_url: formData.image_url.trim() || null,
      description: formData.description.trim() || null,
      special_effect: formData.special_effect.trim() || null,
    };

    const { error } = await supabase.from('items').insert(itemData);

    setSaving(false);

    if (error) {
      toast({ title: 'Failed to create item', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Item created successfully' });
      resetForm();
      setOpen(false);
      onItemAdded();
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name & Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Item name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost *</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost}
                onChange={(e) => updateField('cost', e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
          </div>

          {/* Category & Rarity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => updateField('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rarity</Label>
              <Select
                value={formData.rarity}
                onValueChange={(value) => updateField('rarity', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rarities.map(rar => (
                    <SelectItem key={rar} value={rar} className="capitalize">
                      {rar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Core Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="damage_bonus">Damage Bonus %</Label>
              <Input
                id="damage_bonus"
                type="number"
                value={formData.damage_bonus}
                onChange={(e) => updateField('damage_bonus', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="health_bonus">Health Bonus</Label>
              <Input
                id="health_bonus"
                type="number"
                value={formData.health_bonus}
                onChange={(e) => updateField('health_bonus', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ability_power">Ability Power %</Label>
              <Input
                id="ability_power"
                type="number"
                value={formData.ability_power}
                onChange={(e) => updateField('ability_power', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Perk Stats */}
          <div className="grid grid-cols-4 gap-3">
            {statFields.map(({ key, label, perkType }) => (
              <div key={key} className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  {perkType && <PerkBadge perk={perkType} className="scale-75 origin-left" />}
                  <span className="hidden sm:inline">{label}</span>
                </Label>
                <Input
                  type="number"
                  value={formData[key as keyof typeof formData] as string}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder="0"
                  min={0}
                  max={100}
                />
              </div>
            ))}
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => updateField('image_url', e.target.value)}
              placeholder="https://example.com/image.png"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Item description..."
            />
          </div>

          {/* Special Effect */}
          <div className="space-y-2">
            <Label htmlFor="special_effect">Special Effect</Label>
            <Input
              id="special_effect"
              value={formData.special_effect}
              onChange={(e) => updateField('special_effect', e.target.value)}
              placeholder="Special effect description..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
