import type { ActivityRanking } from '../ranking.types.js';

function outOfRange(score: number | null): boolean {
  return score !== null && (score < 0 || score > 100);
}

function inDateOrder(ranking: ActivityRanking): boolean {
  return ranking.days.every(
    (day, index) => index === 0 || (ranking.days[index - 1]?.date ?? '') < day.date,
  );
}

// Invariant names double as the `type` label of ranking_anomalies_total.
export function violations(ranking: ActivityRanking, windowDays: number): string[] {
  const found: string[] = [];
  if (ranking.days.some((day) => outOfRange(day.score))) {
    found.push('score_out_of_range');
  }
  if (ranking.status !== 'APPLICABLE') {
    return ranking.days.some((day) => day.score !== null)
      ? [...found, 'score_without_applicability']
      : found;
  }
  if (ranking.days.length !== windowDays || !inDateOrder(ranking)) {
    found.push('window_mismatch');
  }
  if (ranking.days.some((day) => day.score === null)) {
    found.push('missing_score');
  }
  return found;
}
