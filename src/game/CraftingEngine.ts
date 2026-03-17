import recipesData from '../data/recipes.json';
import itemsData from '../data/items.json';
import {
  Recipe,
  getAllRecipes as dbGetAllRecipes,
  getRecipeById as dbGetRecipeById,
  addRecipe as dbAddRecipe,
} from '../database/PlayerRepository';

export interface CraftingRecipe {
  id: string;
  name: string;
  type: string;
  description?: string;
  materials: Record<string, number>;
  resultId: string;
  resultQuantity: number;
  requiredLevel: number;
}

const staticRecipes = recipesData.recipes as any[];

export function initializeRecipes(): void {
  for (const recipe of staticRecipes) {
    dbAddRecipe(
      recipe.id,
      recipe.name,
      recipe.type,
      JSON.stringify(recipe.materials),
      recipe.resultId,
      recipe.resultQuantity,
      recipe.requiredLevel,
      recipe.description
    );
  }
}

export function getAllCraftingRecipes(): CraftingRecipe[] {
  const dbRecipes = dbGetAllRecipes();
  return dbRecipes.map((r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    description: r.description || undefined,
    materials: JSON.parse(r.materials),
    resultId: r.result_id,
    resultQuantity: r.result_quantity,
    requiredLevel: r.required_level,
  }));
}

export function getCraftingRecipeById(recipeId: string): CraftingRecipe | undefined {
  const recipe = dbGetRecipeById(recipeId);
  if (!recipe) return undefined;
  return {
    id: recipe.id,
    name: recipe.name,
    type: recipe.type,
    description: recipe.description || undefined,
    materials: JSON.parse(recipe.materials),
    resultId: recipe.result_id,
    resultQuantity: recipe.result_quantity,
    requiredLevel: recipe.required_level,
  };
}

export function getCraftingRecipesByType(type: string): CraftingRecipe[] {
  const dbRecipes = dbGetAllRecipes();
  return dbRecipes
    .filter((r: any) => r.type === type)
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      description: r.description || undefined,
      materials: JSON.parse(r.materials),
      resultId: r.result_id,
      resultQuantity: r.result_quantity,
      requiredLevel: r.required_level,
    }));
}

export function getAvailableRecipesForPlayer(playerLevel: number): CraftingRecipe[] {
  const allRecipes = getAllCraftingRecipes();
  return allRecipes.filter(r => r.requiredLevel <= playerLevel);
}

export interface CraftingResult {
  success: boolean;
  message: string;
  itemId?: string;
  quantity?: number;
}

export function canCraft(recipe: CraftingRecipe, inventory: Array<{ item_id: string; quantity: number }>): boolean {
  for (const [materialId, requiredQty] of Object.entries(recipe.materials)) {
    const inventoryItem = inventory.find(i => i.item_id === materialId);
    if (!inventoryItem || inventoryItem.quantity < requiredQty) {
      return false;
    }
  }
  return true;
}

export function craftItem(
  recipe: CraftingRecipe,
  inventory: Array<{ item_id: string; quantity: number }>,
  playerLevel: number
): CraftingResult {
  if (playerLevel < recipe.requiredLevel) {
    return { success: false, message: `You need level ${recipe.requiredLevel} to craft this item.` };
  }

  if (!canCraft(recipe, inventory)) {
    const missing: string[] = [];
    for (const [materialId, requiredQty] of Object.entries(recipe.materials)) {
      const inventoryItem = inventory.find(i => i.item_id === materialId);
      if (!inventoryItem || inventoryItem.quantity < requiredQty) {
        const itemInfo = getItemName(materialId);
        missing.push(`${itemInfo} (${inventoryItem?.quantity || 0}/${requiredQty})`);
      }
    }
    return { success: false, message: `Missing materials: ${missing.join(', ')}` };
  }

  const materialsUsed: string[] = [];
  for (const [materialId, requiredQty] of Object.entries(recipe.materials)) {
    materialsUsed.push(`${getItemName(materialId)} x${requiredQty}`);
  }

  return {
    success: true,
    message: `Successfully crafted **${recipe.name}**!\nMaterials used: ${materialsUsed.join(', ')}`,
    itemId: recipe.resultId,
    quantity: recipe.resultQuantity,
  };
}

export function getItemName(itemId: string): string {
  const allItems = [
    ...(itemsData.weapons as any[]),
    ...(itemsData.armor as any[]),
    ...(itemsData.consumables as any[]),
    ...(itemsData.materials as any[]),
  ];
  const item = allItems.find(i => i.id === itemId);
  return item ? `${item.emoji} ${item.name}` : itemId;
}

export function getExtractableCharacteristics(monsterId: string): string[] {
  const extractionMap: Record<string, string[]> = {
    'mutated_rat': ['rat_pelt', 'ectoplasm'],
    'werewolf': ['werewolf_claw', 'beast_hide'],
    'ghost': ['ectoplasm', 'spirit_essence'],
    'deepsea_horror': ['deep_sea_scale', 'abyssal_essence'],
    'evil_dragon': ['dragon_scale_fragment', 'draconic_essence', 'beyonder_characteristic'],
    'guler': ['deep_sea_scale', 'abyssal_essence', 'chaos_fragment'],
    'dark_prophet': ['cult_grimoire', 'ancient_soul_crystal'],
    'titan_golem': ['mythic_relic', 'epoch_relic'],
    'demon_lord': ['demigod_essence', 'divinity_fragment'],
  };
  return extractionMap[monsterId] || ['ectoplasm'];
}

export function attemptExtraction(monsterId: string, playerLuck: number): { success: boolean; extracted: string[] } {
  const possibleDrops = getExtractableCharacteristics(monsterId);
  const extracted: string[] = [];
  
  for (const item of possibleDrops) {
    const baseChance = 0.3;
    const luckBonus = playerLuck / 200;
    if (Math.random() < baseChance + luckBonus) {
      extracted.push(item);
    }
  }
  
  return { success: extracted.length > 0, extracted };
}
