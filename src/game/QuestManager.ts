import questsData from '../data/quests.json';
import {
  getCharacter,
  getActiveQuests,
  getCompletedQuests,
  startQuest,
  updateQuestProgress,
  completeQuest,
  addToInventory,
  addExperience,
  modifyGold,
  setTarotMembership,
  QuestRecord,
} from '../database/PlayerRepository';

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  type: string;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  minLevel: number;
  prerequisiteQuests: string[];
  resetHours?: number;
}

export interface QuestObjective {
  type: string;
  target?: string;
  count: number;
  description: string;
}

export interface QuestRewards {
  xp: number;
  gold: number;
  items: string[];
  special?: string;
}

const quests = questsData as QuestDef[];

export function getAvailableQuests(playerId: string): QuestDef[] {
  const char = getCharacter(playerId);
  if (!char) return [];

  const completed = getCompletedQuests(playerId);
  const active = getActiveQuests(playerId).map(q => q.quest_id);

  return quests.filter(q => {
    if (char.level < q.minLevel) return false;
    if (active.includes(q.id)) return false;
    if (q.type === 'story' && completed.includes(q.id)) return false;
    if (q.prerequisiteQuests.some(prereq => !completed.includes(prereq))) return false;
    return true;
  });
}

export function getQuestById(questId: string): QuestDef | undefined {
  return quests.find(q => q.id === questId);
}

export function beginQuest(playerId: string, questId: string): { success: boolean; message: string } {
  const quest = getQuestById(questId);
  if (!quest) return { success: false, message: 'Quest not found.' };

  const char = getCharacter(playerId);
  if (!char) return { success: false, message: 'No character found.' };
  if (char.level < quest.minLevel) return { success: false, message: `You need to be level ${quest.minLevel} to start this quest.` };

  const completed = getCompletedQuests(playerId);
  if (quest.prerequisiteQuests.some(prereq => !completed.includes(prereq))) {
    return { success: false, message: 'You have not completed the prerequisite quests.' };
  }

  const active = getActiveQuests(playerId);
  if (active.some(q => q.quest_id === questId)) {
    return { success: false, message: 'You already have this quest active.' };
  }

  const initialProgress: Record<string, number> = {};
  quest.objectives.forEach((_, i) => { initialProgress[`obj_${i}`] = 0; });
  startQuest(playerId, questId);

  return { success: true, message: `Quest started: **${quest.name}**` };
}

export function updateQuestProgressForAction(playerId: string, actionType: string, target?: string): string[] {
  const active = getActiveQuests(playerId);
  const completedNow: string[] = [];

  for (const record of active) {
    const quest = getQuestById(record.quest_id);
    if (!quest) continue;

    const progress = JSON.parse(record.progress) as Record<string, number>;
    let changed = false;

    quest.objectives.forEach((obj, i) => {
      const key = `obj_${i}`;
      if (progress[key] === undefined) progress[key] = 0;
      if (progress[key] >= obj.count) return;

      const matches = obj.type === actionType && (!obj.target || obj.target === target);
      const isAnyMatch = obj.type === actionType && !obj.target;

      if (matches || isAnyMatch) {
        progress[key]++;
        changed = true;
      }
    });

    if (changed) {
      updateQuestProgress(record.id, progress);
      const allDone = quest.objectives.every((obj, i) => (progress[`obj_${i}`] ?? 0) >= obj.count);
      if (allDone) {
        completeQuest(record.id);
        grantQuestRewards(playerId, quest);
        completedNow.push(quest.id);
      }
    }
  }

  return completedNow;
}

export function grantQuestRewards(playerId: string, quest: QuestDef): void {
  addExperience(playerId, quest.rewards.xp);
  modifyGold(playerId, quest.rewards.gold);
  for (const itemId of quest.rewards.items) {
    addToInventory(playerId, itemId);
  }
  if (quest.rewards.special === 'tarot_membership') {
    const codenames = ['The Star', 'The Moon', 'The Sun', 'The World', 'The Tower', 'The Hermit', 'The Hanged One', 'Strength', 'Temperance', 'The Devil'];
    const codename = codenames[Math.floor(Math.random() * codenames.length)];
    setTarotMembership(playerId, codename);
  }
}

export function getQuestProgress(record: QuestRecord): { objective: QuestObjective; current: number; max: number }[] {
  const quest = getQuestById(record.quest_id);
  if (!quest) return [];
  const progress = JSON.parse(record.progress) as Record<string, number>;
  return quest.objectives.map((obj, i) => ({
    objective: obj,
    current: progress[`obj_${i}`] ?? 0,
    max: obj.count,
  }));
}
