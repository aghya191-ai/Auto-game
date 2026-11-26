import { DAILY_STREAK_REWARDS, MISSION_TEMPLATES } from '../config/chattogramData';
import type { CngUpgradesState, DailyMission, MissionMetric, PlayerSaveData } from '../types/game';

const STORAGE_KEY = 'chattogram_express_save_v1';

const DEFAULT_UPGRADES: CngUpgradesState = {
  engine: 0,
  tank: 0,
  chassis: 0,
  handling: 0,
};

function sanitizeUpgradeLevel(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(3, Math.floor(val)));
}

function formatLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayKey(): string {
  return formatLocalDateKey(new Date());
}

export function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDateKey(d);
}

export function getDailyStreakReward(streak: number): number {
  const idx = Math.min(DAILY_STREAK_REWARDS.length - 1, Math.max(0, Math.floor(streak) - 1));
  return DAILY_STREAK_REWARDS[idx];
}

function hashDate(dateStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateDailyMissions(dateStr: string): DailyMission[] {
  const pool = [...MISSION_TEMPLATES];
  let seed = hashDate(dateStr);
  const picked: DailyMission[] = [];
  const usedMetrics = new Set<MissionMetric>();

  while (picked.length < 3 && pool.length > 0) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const idx = seed % pool.length;
    const candidate = pool.splice(idx, 1)[0];
    if (usedMetrics.has(candidate.metric) && pool.length > 0) {
      continue;
    }
    usedMetrics.add(candidate.metric);
    picked.push({
      id: candidate.id,
      title: candidate.title,
      metric: candidate.metric,
      target: candidate.target,
      progress: 0,
      reward: candidate.reward,
      claimed: false,
    });
  }

  return picked;
}

export function loadSaveData(): PlayerSaveData {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const defaults: PlayerSaveData = {
    taka: 200,
    highScore: 0,
    driverXp: 0,
    completedMissionsTotal: 0,
    loginStreak: 1,
    lastLoginDate: today,
    lastStreakClaimDate: '',
    unlockedColors: ['chittagong_green'],
    unlockedStickers: ['mayer_doa'],
    equippedColor: 'chittagong_green',
    equippedSticker: 'mayer_doa',
    upgrades: { ...DEFAULT_UPGRADES },
    missionDate: today,
    missions: generateDailyMissions(today),
  };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      savePlayerData(defaults);
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
    const missions =
      parsed.missionDate === today && Array.isArray(parsed.missions) && parsed.missions.length === 3
        ? parsed.missions
        : generateDailyMissions(today);

    const inferredMissions = Array.isArray(parsed.missions)
      ? parsed.missions.filter((m) => m && m.progress >= m.target).length
      : 0;

    const prevStreak =
      typeof parsed.loginStreak === 'number' && Number.isFinite(parsed.loginStreak)
        ? Math.max(1, Math.floor(parsed.loginStreak))
        : 1;
    const prevLoginDate = typeof parsed.lastLoginDate === 'string' ? parsed.lastLoginDate : '';

    let nextStreak = 1;
    if (prevLoginDate === today) {
      nextStreak = prevStreak;
    } else if (prevLoginDate === yesterday) {
      nextStreak = prevStreak + 1;
    } else {
      nextStreak = 1;
    }

    const lastStreakClaimDate =
      typeof parsed.lastStreakClaimDate === 'string' ? parsed.lastStreakClaimDate : '';

    const rawUpgrades = (parsed.upgrades ?? {}) as Partial<CngUpgradesState>;
    const upgrades: CngUpgradesState = {
      engine: sanitizeUpgradeLevel(rawUpgrades.engine),
      tank: sanitizeUpgradeLevel(rawUpgrades.tank),
      chassis: sanitizeUpgradeLevel(rawUpgrades.chassis),
      handling: sanitizeUpgradeLevel(rawUpgrades.handling),
    };

    const merged: PlayerSaveData = {
      taka: typeof parsed.taka === 'number' && Number.isFinite(parsed.taka) ? Math.max(0, parsed.taka) : defaults.taka,
      highScore:
        typeof parsed.highScore === 'number' && Number.isFinite(parsed.highScore)
          ? Math.max(0, parsed.highScore)
          : defaults.highScore,
      driverXp:
        typeof parsed.driverXp === 'number' && Number.isFinite(parsed.driverXp)
          ? Math.max(0, Math.round(parsed.driverXp))
          : 0,
      completedMissionsTotal:
        typeof parsed.completedMissionsTotal === 'number' &&
        Number.isFinite(parsed.completedMissionsTotal)
          ? Math.max(0, Math.floor(parsed.completedMissionsTotal))
          : inferredMissions,
      loginStreak: nextStreak,
      lastLoginDate: today,
      lastStreakClaimDate,
      unlockedColors: Array.isArray(parsed.unlockedColors)
        ? Array.from(new Set(['chittagong_green', ...parsed.unlockedColors]))
        : defaults.unlockedColors,
      unlockedStickers: Array.isArray(parsed.unlockedStickers)
        ? Array.from(new Set(['mayer_doa', ...parsed.unlockedStickers]))
        : defaults.unlockedStickers,
      equippedColor: typeof parsed.equippedColor === 'string' ? parsed.equippedColor : defaults.equippedColor,
      equippedSticker: typeof parsed.equippedSticker === 'string' ? parsed.equippedSticker : defaults.equippedSticker,
      upgrades,
      missionDate: today,
      missions,
    };

    if (
      parsed.missionDate !== today ||
      typeof parsed.completedMissionsTotal !== 'number' ||
      parsed.lastLoginDate !== today ||
      typeof parsed.loginStreak !== 'number' ||
      !parsed.upgrades ||
      typeof parsed.driverXp !== 'number'
    ) {
      savePlayerData(merged);
    }
    return merged;
  } catch {
    return defaults;
  }
}

export function claimDailyStreakBonus(
  prev: PlayerSaveData
): { updated: PlayerSaveData; reward: number } | null {
  const today = getTodayKey();
  if (prev.lastStreakClaimDate === today) return null;
  const reward = getDailyStreakReward(prev.loginStreak);
  const updated: PlayerSaveData = {
    ...prev,
    taka: prev.taka + reward,
    lastLoginDate: today,
    lastStreakClaimDate: today,
  };
  savePlayerData(updated);
  return { updated, reward };
}

export function savePlayerData(data: PlayerSaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in restricted browsers
  }
}
