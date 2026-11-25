import { DRIVER_RANKS, MISSION_RANK_POINTS } from '../config/chattogramData';
import type { DriverProgression } from '../types/game';

export function getDriverProgression(
  bestScore: number,
  completedMissions: number
): DriverProgression {
  const safeScore = Math.max(0, Math.round(bestScore));
  const safeMissions = Math.max(0, Math.floor(completedMissions));
  const points = safeScore + safeMissions * MISSION_RANK_POINTS;

  let currentIdx = 0;
  for (let i = 0; i < DRIVER_RANKS.length; i++) {
    if (points >= DRIVER_RANKS[i].minPoints) {
      currentIdx = i;
    }
  }

  const current = DRIVER_RANKS[currentIdx];
  const next = currentIdx < DRIVER_RANKS.length - 1 ? DRIVER_RANKS[currentIdx + 1] : null;

  if (!next) {
    return {
      current,
      next: null,
      points,
      bestScore: safeScore,
      completedMissions: safeMissions,
      progressPct: 100,
      pointsToNext: 0,
    };
  }

  const span = Math.max(1, next.minPoints - current.minPoints);
  const gainedInTier = Math.max(0, points - current.minPoints);
  const progressPct = Math.min(100, Math.max(0, Math.round((gainedInTier / span) * 100)));
  const pointsToNext = Math.max(0, next.minPoints - points);

  return {
    current,
    next,
    points,
    bestScore: safeScore,
    completedMissions: safeMissions,
    progressPct,
    pointsToNext,
  };
}
