import { Character } from '../database/PlayerRepository';
import itemsData from '../data/items.json';

export interface CombatResult {
  rounds: CombatRound[];
  winner: 'player' | 'monster' | 'pvp_challenger' | 'pvp_challenged';
  playerHpRemaining: number;
  opponentHpRemaining: number;
  xpGained: number;
  goldGained: number;
  lootGained: string[];
}

export interface CombatRound {
  round: number;
  playerDamage: number;
  opponentDamage: number;
  playerHpAfter: number;
  opponentHpAfter: number;
  playerUsedPower: boolean;
  powerName?: string;
}

export interface MonsterData {
  id: string;
  name: string;
  health: number;
  attack: number;
  defense: number;
  xpReward: number;
  goldMin: number;
  goldMax: number;
  loot: string[];
  emoji: string;
}

function rollDice(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getEquippedAttackBonus(equipped: { item_id: string }[]): number {
  let bonus = 0;
  for (const inv of equipped) {
    const weapon = (itemsData.weapons as Array<{ id: string; attackBonus: number }>).find(w => w.id === inv.item_id);
    if (weapon) bonus += weapon.attackBonus;
  }
  return bonus;
}

function getEquippedDefenseBonus(equipped: { item_id: string }[]): number {
  let bonus = 0;
  for (const inv of equipped) {
    const armor = (itemsData.armor as Array<{ id: string; defenseBonus: number }>).find(a => a.id === inv.item_id);
    if (armor) bonus += armor.defenseBonus;
  }
  return bonus;
}

function getSpiritBonus(equipped: { item_id: string }[]): number {
  let bonus = 0;
  for (const inv of equipped) {
    const all = [...(itemsData.weapons as Array<{ id: string; spiritBonus?: number }>), ...(itemsData.armor as Array<{ id: string; spiritBonus?: number }>)];
    const item = all.find(i => i.id === inv.item_id);
    if (item?.spiritBonus) bonus += item.spiritBonus;
  }
  return bonus;
}

export function runPveCombat(
  char: Character,
  monster: MonsterData,
  equipped: { item_id: string }[]
): CombatResult {
  const attackBonus = getEquippedAttackBonus(equipped);
  const defenseBonus = getEquippedDefenseBonus(equipped);
  const spiritBonus = getSpiritBonus(equipped);

  const playerBaseAttack = char.strength + attackBonus + Math.floor(char.level * 0.5);
  const playerBaseDefense = Math.floor(char.willpower / 2) + defenseBonus;
  const sequenceBonus = (9 - char.sequence) * 3;

  let playerHp = char.health;
  let monsterHp = monster.health + Math.floor(char.level * 2);
  let playerSpirit = char.spirit + spiritBonus;

  const rounds: CombatRound[] = [];
  const maxRounds = 10;

  for (let round = 1; round <= maxRounds; round++) {
    if (playerHp <= 0 || monsterHp <= 0) break;

    const usePower = playerSpirit >= 20 && Math.random() < 0.35;
    let playerDamage: number;
    let powerName: string | undefined;

    if (usePower) {
      const powerMultiplier = 1.5 + (char.luck / 50);
      playerDamage = Math.max(1, Math.floor((playerBaseAttack + sequenceBonus) * powerMultiplier) - monster.defense + rollDice(0, 5));
      playerSpirit -= 20;
      powerName = getBeyonderPowerName(char.pathway, char.sequence);
    } else {
      playerDamage = Math.max(1, playerBaseAttack + sequenceBonus + rollDice(0, 8) - monster.defense);
    }

    const monsterDamage = Math.max(1, monster.attack + rollDice(0, 6) - playerBaseDefense);

    monsterHp -= playerDamage;
    playerHp -= monsterDamage;

    rounds.push({
      round,
      playerDamage,
      opponentDamage: monsterDamage,
      playerHpAfter: Math.max(0, playerHp),
      opponentHpAfter: Math.max(0, monsterHp),
      playerUsedPower: usePower,
      powerName,
    });
  }

  const playerWon = monsterHp <= 0;
  const goldGained = playerWon ? rollDice(monster.goldMin, monster.goldMax) : 0;
  const xpGained = playerWon ? monster.xpReward + Math.floor(char.level * 2) : Math.floor(monster.xpReward * 0.1);

  const lootGained: string[] = [];
  if (playerWon && monster.loot.length > 0) {
    monster.loot.forEach(lootId => {
      if (Math.random() < 0.3) lootGained.push(lootId);
    });
  }

  return {
    rounds,
    winner: playerWon ? 'player' : 'monster',
    playerHpRemaining: Math.max(0, playerHp),
    opponentHpRemaining: Math.max(0, monsterHp),
    xpGained,
    goldGained,
    lootGained,
  };
}

export function runPvpCombat(
  challenger: Character,
  challenged: Character,
  challengerEquipped: { item_id: string }[],
  challengedEquipped: { item_id: string }[]
): { result: CombatResult; challengerWon: boolean } {
  const cAttack = challenger.strength + getEquippedAttackBonus(challengerEquipped) + Math.floor(challenger.level * 0.5) + (9 - challenger.sequence) * 3;
  const cDefense = Math.floor(challenger.willpower / 2) + getEquippedDefenseBonus(challengerEquipped);
  const dAttack = challenged.strength + getEquippedAttackBonus(challengedEquipped) + Math.floor(challenged.level * 0.5) + (9 - challenged.sequence) * 3;
  const dDefense = Math.floor(challenged.willpower / 2) + getEquippedDefenseBonus(challengedEquipped);

  let cHp = challenger.health;
  let dHp = challenged.health;
  let cSpirit = challenger.spirit + getSpiritBonus(challengerEquipped);
  let dSpirit = challenged.spirit + getSpiritBonus(challengedEquipped);

  const rounds: CombatRound[] = [];
  const maxRounds = 8;

  const cInitiative = rollDice(1, 20) + challenger.dexterity;
  const dInitiative = rollDice(1, 20) + challenged.dexterity;
  const challengerGoesFirst = cInitiative >= dInitiative;

  for (let round = 1; round <= maxRounds; round++) {
    if (cHp <= 0 || dHp <= 0) break;

    const cUsePower = cSpirit >= 20 && Math.random() < 0.35;
    const dUsePower = dSpirit >= 20 && Math.random() < 0.35;

    let cDamage = Math.max(1, cAttack + rollDice(0, 8) - dDefense);
    let dDamage = Math.max(1, dAttack + rollDice(0, 8) - cDefense);

    if (cUsePower) { cDamage = Math.floor(cDamage * 1.5); cSpirit -= 20; }
    if (dUsePower) { dDamage = Math.floor(dDamage * 1.5); dSpirit -= 20; }

    if (challengerGoesFirst) {
      dHp -= cDamage;
      if (dHp > 0) cHp -= dDamage;
    } else {
      cHp -= dDamage;
      if (cHp > 0) dHp -= cDamage;
    }

    rounds.push({
      round,
      playerDamage: cDamage,
      opponentDamage: dDamage,
      playerHpAfter: Math.max(0, cHp),
      opponentHpAfter: Math.max(0, dHp),
      playerUsedPower: cUsePower,
      powerName: cUsePower ? getBeyonderPowerName(challenger.pathway, challenger.sequence) : undefined,
    });
  }

  const challengerWon = cHp > dHp;
  const xpGained = 100 + Math.abs(challenger.level - challenged.level) * 10;

  return {
    result: {
      rounds,
      winner: challengerWon ? 'pvp_challenger' : 'pvp_challenged',
      playerHpRemaining: Math.max(0, cHp),
      opponentHpRemaining: Math.max(0, dHp),
      xpGained,
      goldGained: 0,
      lootGained: [],
    },
    challengerWon,
  };
}

export function getBeyonderPowerName(pathway: string, sequence: number): string {
  const powers: Record<string, Record<number, string>> = {
    fool: { 9: 'Fate Thread Vision', 8: 'Reality Distortion', 7: 'Hex Binding', 6: 'Identity Theft', 5: 'Fate Puppet', 4: 'Grand Illusion', 3: 'Miracle Call', 2: 'Mystery Weave', 1: 'Truth Distortion' },
    magician: { 9: 'Minor Seal', 8: 'Parlour Trick', 7: 'Hypnotic Gaze', 6: 'Mass Illusion', 5: 'Mind Read', 4: 'Grand Performance', 3: 'Miracle Act', 2: 'Artifact Seal', 1: 'Extraordinary Feat' },
    high_priestess: { 9: 'Secret Sight', 8: 'Binding Contract', 7: 'Potion Brew', 6: 'Beast Command', 5: 'Dark Truth', 4: 'Mythical Form', 3: 'Nature Channel', 2: 'Creature Summon', 1: 'Mythic Ascension' },
    empress: { 9: 'Enchanting Song', 8: 'Emotional Grip', 7: 'Charm Craft', 6: 'Demonic Allure', 5: 'Curse Strike', 4: 'Dark Hex', 3: 'Fallen Creation', 2: 'Pleasure Wave', 1: 'Calamity Aura' },
    emperor: { 9: 'Combat Strike', 8: 'Power Slash', 7: 'Iron Fist', 6: 'Arena Fury', 5: 'Weapon Mastery', 4: 'Holy Strike', 3: 'Demon Smite', 2: 'Iron Resolve', 1: 'Tyrant Aura' },
    hierophant: { 9: 'Fair Judgment', 8: 'Law Enforcement', 7: 'Truth Compulsion', 6: 'Divine Justice', 5: 'Absolute Order', 4: 'Imperative Command', 3: 'Cosmic Verdict', 2: 'Pale Authority', 1: 'Demonic Law' },
    lovers: { 9: 'Twilight Touch', 8: 'Resonant Verse', 7: 'Psyche Probe', 6: 'Dream Strike', 5: 'Giant Force', 4: 'Calamity Invoke', 3: 'Strange Path Walk', 2: 'Fallen Strike', 1: 'Creative Force' },
    chariot: { 9: 'Hunter Strike', 8: 'Provocateur Slash', 7: 'Dance Blade', 6: 'Alchemic Slash', 5: 'Hero Strike', 4: 'Light Step', 3: 'Sword Mastery', 2: 'Warlord Surge', 1: 'Conqueror Strike' },
    justice: { 9: 'Light Ray', 8: 'Seeking Light', 7: 'Solar Smite', 6: 'Cosmic Notary', 5: 'Faith Shield', 4: 'Divine Remedy', 3: 'Bishop Smite', 2: 'Cardinal Strike', 1: 'Righteous Blast' },
    hermit: { 9: 'Far Sight', 8: 'Mind Touch', 7: 'Psyche Strike', 6: 'Star Reading', 5: 'Prophetic Strike', 4: 'Spectral Blast', 3: 'All-Seeing Strike', 2: 'Fate Sight', 1: 'Inevitable Strike' },
    wheel_of_fortune: { 9: 'Lucky Strike', 8: 'Misfortune Curse', 7: 'Bad Luck Hex', 6: 'Probability Shift', 5: 'Fate Weave', 4: 'Wheel Shake', 3: 'Calamity Form', 2: 'Luck Steal', 1: 'Fate Lock' },
    strength: { 9: 'Beast Strike', 8: 'Ferocious Charge', 7: 'Savage Fury', 6: 'Demonic Strike', 5: 'Wolf Form', 4: 'Devil Punch', 3: 'Primal Roar', 2: 'Demon God Strike', 1: 'Demoness Aura' },
    hanged_man: { 9: 'Shadow Raid', 8: 'Shadow Meld', 7: 'Gate Slam', 6: 'Grand Scam', 5: 'Sacrifice Strike', 4: 'Parasitic Drain', 3: 'Inverted Strike', 2: 'Despair Wave', 1: 'King Strike' },
    death: { 9: 'Grave Call', 8: 'Spirit Summon', 7: 'Corpse Strike', 6: 'Zombie Horde', 5: 'Undying Surge', 4: 'Wraith Phase', 3: 'Death Touch', 2: 'Gate Strike', 1: 'Death Aura' },
    temperance: { 9: 'Potion Throw', 8: 'Ancient Insight', 7: 'Appraisal Eye', 6: 'Preservation Seal', 5: 'Artisan Strike', 4: 'Amber Trap', 3: 'Antiquarian Knowledge', 2: 'Time Step', 1: 'Eternal Preservation' },
    devil: { 9: 'Dark Deal', 8: 'Con Strike', 7: 'Legal Bind', 6: 'Conspiracy Web', 5: 'Dark Mentor Strike', 4: 'Corruption Wave', 3: 'Desire Exploit', 2: 'Desire Form', 1: 'Contract Lock' },
    tower: { 9: 'Flame Throw', 8: 'Fire Bolt', 7: 'Destruction Wave', 6: 'Red Flame', 5: 'Scorching Blast', 4: 'Demon Hunter Fire', 3: 'Eternal Flame', 2: 'Infernal Blast', 1: 'World Burn' },
    star: { 9: 'Star Shot', 8: 'Celestial Curse', 7: 'Spirit Commune', 6: 'Lunar Madness', 5: 'Wolf Howl', 4: 'Moon Beam', 3: 'Lunar Brew', 2: 'Moon Ritual', 1: 'Lunar Blast' },
    moon: { 9: 'Draconic Surge', 8: 'Chaos Hunt', 7: 'Mind Corridor Strike', 6: 'Secret Sorcery', 5: 'Venom Strike', 4: 'Dragon Priest Call', 3: 'Soul Absorb', 2: 'Chaos Burst', 1: 'Dragon Breath' },
    sun: { 9: 'Solar Song', 8: 'Light Bolt', 7: 'Solar Flare', 6: 'Lightning Strike', 5: 'Dawn Smite', 4: 'Radiant Step', 3: 'Blazing Aura', 2: 'Sun Beam', 1: 'Solar Nova' },
    world: { 9: 'Space Dash', 8: 'Escape Surge', 7: 'Teleport Strike', 6: 'Omni Sight', 5: 'Plane Walk', 4: 'Space Tear', 3: 'Door Slam', 2: 'Cosmos Travel', 1: 'World Embrace' },
    judgment: { 9: 'Shadow Strike', 8: 'Secret Reveal', 7: 'Cyclops Gaze', 6: 'Inevitable End', 5: 'Arcane Blast', 4: 'Final Solution', 3: 'Doom Herald', 2: 'Judgment Strike', 1: 'Calamity End' },
  };
  return powers[pathway]?.[sequence] ?? 'Beyonder Strike';
}
