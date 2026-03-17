import casinoData from '../data/casino.json';
import itemsData from '../data/items.json';
import {
  logCasinoGame,
  getLastDailyPull,
  recordDailyPull,
  getCasinoHistory,
  CasinoGame,
} from '../database/PlayerRepository';

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

function rollDice(sides: number = 6): number {
  return Math.floor(Math.random() * sides) + 1;
}

export interface DiceBetResult {
  result: number[];
  win: boolean;
  payout: number;
  winnings: number;
}

export function playDice(playerBet: number, prediction: 'exact' | 'range' | 'high' | 'low', targetNumber: number | null, maxBet: number, minBet: number): DiceBetResult | { error: string } {
  if (playerBet < minBet || playerBet > maxBet) {
    return { error: `Bet must be between ${minBet} and ${maxBet} gold.` };
  }

  const dice1 = rollDice(6);
  const dice2 = rollDice(6);
  const total = dice1 + dice2;
  const result = [dice1, dice2];

  let win = false;
  let payout = 0;

  if (prediction === 'exact' && targetNumber !== null) {
    win = total === targetNumber;
    payout = casinoData.dice.payouts.exact;
  } else if (prediction === 'range') {
    if (targetNumber === 7) {
      win = total >= 7 && total <= 8;
    } else if (targetNumber === 9) {
      win = total >= 9 && total <= 10;
    } else if (targetNumber === 11) {
      win = total >= 11 && total <= 12;
    }
    payout = casinoData.dice.payouts.range;
  } else if (prediction === 'high') {
    win = total >= 9;
    payout = casinoData.dice.payouts.high_low;
  } else if (prediction === 'low') {
    win = total <= 6;
    payout = casinoData.dice.payouts.high_low;
  }

  const winnings = win ? Math.floor(playerBet * payout) : 0;
  
  return { result, win, payout, winnings };
}

export interface RouletteResult {
  result: number;
  color: string;
  win: boolean;
  payout: number;
  winnings: number;
}

export function playRoulette(playerBet: number, betType: 'number' | 'red' | 'black' | 'odd' | 'even' | 'dozen' | 'column', target: number | null, maxBet: number, minBet: number): RouletteResult | { error: string } {
  if (playerBet < minBet || playerBet > maxBet) {
    return { error: `Bet must be between ${minBet} and ${maxBet} gold.` };
  }

  const result = rollDice(37) - 1;
  const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(result);
  const color = result === 0 ? 'green' : (isRed ? 'red' : 'black');

  let win = false;
  let payout = 0;

  if (betType === 'number' && target !== null) {
    win = result === target;
    payout = casinoData.roulette.payouts.number;
  } else if (betType === 'red') {
    win = color === 'red';
    payout = casinoData.roulette.payouts.red_black;
  } else if (betType === 'black') {
    win = color === 'black';
    payout = casinoData.roulette.payouts.red_black;
  } else if (betType === 'odd') {
    win = result % 2 === 1 && result !== 0;
    payout = casinoData.roulette.payouts.odd_even;
  } else if (betType === 'even') {
    win = result % 2 === 0 && result !== 0;
    payout = casinoData.roulette.payouts.odd_even;
  } else if (betType === 'dozen') {
    if (target === 1) win = result >= 1 && result <= 12;
    else if (target === 2) win = result >= 13 && result <= 24;
    else if (target === 3) win = result >= 25 && result <= 36;
    payout = casinoData.roulette.payouts.dozen;
  } else if (betType === 'column') {
    const column = result % 3;
    if (target === 1) win = column === 1;
    else if (target === 2) win = column === 2;
    else if (target === 3) win = column === 0;
    payout = casinoData.roulette.payouts.column;
  }

  const winnings = win ? Math.floor(playerBet * payout) : 0;

  return { result, color, win, payout, winnings };
}

export interface SlotsResult {
  reels: string[];
  win: boolean;
  prize: string;
  winnings: number;
}

export function playSlots(playerBet: number, maxBet: number, minBet: number): SlotsResult | { error: string } {
  if (playerBet < minBet || playerBet > maxBet) {
    return { error: `Bet must be between ${minBet} and ${maxBet} gold.` };
  }

  const symbols = casinoData.slots.symbols;
  const reels = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  let win = false;
  let prize = '';
  let winnings = 0;

  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    win = true;
    if (reels[0] === '🍒') {
      prize = 'Three Cherries!';
      winnings = Math.floor(playerBet * casinoData.slots.payouts.three_cherries);
    } else if (reels[0] === '🍋') {
      prize = 'Three Lemons!';
      winnings = Math.floor(playerBet * casinoData.slots.payouts.three_lemons);
    } else if (reels[0] === '🍇') {
      prize = 'Three Grapes!';
      winnings = Math.floor(playerBet * casinoData.slots.payouts.three_grapes);
    } else if (reels[0] === '💎') {
      prize = 'Three Diamonds!';
      winnings = Math.floor(playerBet * casinoData.slots.payouts.three_diamonds);
    } else if (reels[0] === '7️⃣') {
      prize = 'JACKPOT! Three Sevens!';
      winnings = Math.floor(playerBet * casinoData.slots.payouts.three_sevens);
    }
  }

  return { reels, win, prize, winnings };
}

export interface DailyPullResult {
  gold: number;
  item?: string;
  canPull: boolean;
  nextPullTime?: number;
}

export function doDailyPull(playerId: string): DailyPullResult {
  const lastPull = getLastDailyPull(playerId);
  const now = Math.floor(Date.now() / 1000);
  const cooldown = casinoData.dailyPull.cooldown;

  if (lastPull && now - lastPull.pulled_at < cooldown) {
    const nextPull = lastPull.pulled_at + cooldown;
    return { gold: 0, canPull: false, nextPullTime: nextPull - now };
  }

  recordDailyPull(playerId);

  let goldReward = 0;
  const rand = Math.random();
  let cumulative = 0;

  for (const tier of casinoData.dailyPull.rewards) {
    cumulative += tier.chance;
    if (rand < cumulative) {
      goldReward = Math.floor(Math.random() * (tier.maxGold - tier.minGold + 1)) + tier.minGold;
      break;
    }
  }

  let itemReward: string | undefined;
  const itemRand = Math.random();
  let itemCumulative = 0;
  for (const special of casinoData.dailyPull.specialRewards) {
    itemCumulative += special.chance;
    if (itemRand < itemCumulative) {
      itemReward = special.itemId;
      break;
    }
  }

  return { gold: goldReward, item: itemReward, canPull: true };
}

export function logGame(playerId: string, gameType: string, betAmount: number, result: string, winnings: number): void {
  logCasinoGame(playerId, gameType, betAmount, result, winnings);
}

export function getHistory(playerId: string): CasinoGame[] {
  return getCasinoHistory(playerId);
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
