import petsData from '../data/pets.json';

export interface PetDef {
  id: string;
  name: string;
  rarity: string;
  description: string;
  baseAttack: number;
  baseDefense: number;
  baseHealth: number;
  loyaltyGain: number;
  tameChance: number;
  emoji: string;
  type: string;
}

const pets = petsData as any;

export function getAllPets(): PetDef[] {
  return pets.pets as PetDef[];
}

export function getPetById(petId: string): PetDef | undefined {
  return (pets.pets as PetDef[]).find(p => p.id === petId);
}

export function getPetsByRarity(rarity: string): PetDef[] {
  return (pets.pets as PetDef[]).filter(p => p.rarity === rarity);
}

export function getRandomPet(): PetDef {
  const allPets = pets.pets as PetDef[];
  return allPets[Math.floor(Math.random() * allPets.length)];
}

export function attemptTame(pet: PetDef, playerLuck: number): { success: boolean; message: string } {
  const adjustedChance = pet.tameChance + (playerLuck / 200);
  const roll = Math.random();
  
  if (roll < adjustedChance) {
    return { success: true, message: `You successfully tamed the **${pet.name}**!` };
  }
  
  return { success: false, message: `The **${pet.name}** escaped! Better luck next time.` };
}

export function getPetCombatBonus(pet: PetDef, petLevel: number, loyalty: number): { attackBonus: number; defenseBonus: number; healthBonus: number } {
  const rarityMultipliers = pets.rarityBonuses[pet.rarity] || pets.rarityBonuses.common;
  const levelMultiplier = 1 + (petLevel - 1) * 0.1;
  const loyaltyMultiplier = Math.min(2, 0.5 + (loyalty / 100) * 1.5);
  
  return {
    attackBonus: Math.floor(pet.baseAttack * rarityMultipliers.attack * levelMultiplier * loyaltyMultiplier),
    defenseBonus: Math.floor(pet.baseDefense * rarityMultipliers.defense * levelMultiplier * loyaltyMultiplier),
    healthBonus: Math.floor(pet.baseHealth * rarityMultipliers.health * levelMultiplier * loyaltyMultiplier),
  };
}

export function calculatePetXp(pet: PetDef, ownerLevel: number): number {
  const baseXp = 20 + (ownerLevel * 5);
  const rarityBonus = { common: 1, rare: 1.5, epic: 2, legendary: 3, mythical: 5 };
  return Math.floor(baseXp * (rarityBonus[pet.rarity as keyof typeof rarityBonus] || 1));
}

export function getPetLoyaltyChange(pet: PetDef, action: 'feed' | 'combat_win' | 'combat_loss' | 'neglect'): number {
  const baseChanges: Record<string, number> = {
    'feed': pet.loyaltyGain,
    'combat_win': Math.floor(pet.loyaltyGain * 0.8),
    'combat_loss': Math.floor(pet.loyaltyGain * 0.5),
    'neglect': -5,
  };
  return baseChanges[action] || 0;
}

export function evolvePet(pet: PetDef, level: number): { shouldEvolve: boolean; newPetId?: string; newName?: string } {
  if (pet.rarity === 'common' && level >= 20) {
    return { shouldEvolve: true, newPetId: pet.id.replace('gray_moth', 'shadow_cat').replace('wandering_spirit', 'flame_fairy'), newName: 'Evolved ' + pet.name };
  }
  if (pet.rarity === 'rare' && level >= 40) {
    return { shouldEvolve: true, newPetId: pet.id.replace('shadow_cat', 'iron_golem').replace('flame_fairy', 'frost_dragon_whelp'), newName: 'Evolved ' + pet.name };
  }
  return { shouldEvolve: false };
}
