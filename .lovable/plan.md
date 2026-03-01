

# Retirer Attack Speed et Max Ammo des stats Weapon

## Ce qui change

Retirer les stats **Attack Speed** et **Max Ammo** de la catégorie "Weapon" (priorite `damage`) dans l'optimiseur et les composants associes.

## Modifications

### 1. `src/pages/Optimizer.tsx`

- **`getItemStatValue` (ligne ~299-303)** : Retirer `attack_speed` et `max_ammo` du calcul de valeur pour la priorite `damage`. Le cas `damage` ne gardera que `damage_bonus` et `weapon_lifesteal`.

- **`getCapPenalty` (lignes ~320-332)** : Retirer les penalites de cap pour `attack_speed` (cap 20%) et `max_ammo` (cap 40%) dans le cas `damage`. Simplifier ou supprimer ce bloc.

- **`getItemValue` (ligne 271)** : Retirer `attack_speed` du calcul `utilityValue`.

- **Stats Impact section (lignes ~937-995)** : Retirer le calcul et l'affichage de `totalAS` et `totalAmmo` dans le bloc "Impact sur [hero]".

### 2. `src/components/ui/PerkBadge.tsx`

- Retirer `'attack-speed'` et `'max-ammo'` du type `PerkType`, de la config `perkConfig`, et de la logique `getItemPerks` pour qu'ils ne s'affichent plus sur les cartes d'items.

### 3. `src/components/BuildCalculator.tsx`

- Pas de changement necessaire (ce composant n'affiche pas ces stats directement).

## Impact

- L'algorithme DP ne prendra plus en compte Attack Speed ni Max Ammo pour optimiser les builds Weapon/Damage.
- Les badges correspondants disparaitront des cartes d'items.
- Les stats impact du build optimal n'afficheront plus AS ni Ammo.
