import { angleDelta } from './engine.js';

const MAX_POINTS = 100;
const MIN_POINTS = -50;
const WEIGHT_MIN = 0.25;
const WEIGHT_MAX = 4.0;

/**
 * Score a single player's vote against the resolved turn angle.
 * Closer to the group result = more points.
 * delta=0   → +100 pts
 * delta=90  →   0 pts
 * delta=180 → -50 pts
 *
 * @param {number} playerAngle  degrees
 * @param {number} resolvedAngle degrees (weighted avg)
 * @returns {number} score delta (may be negative)
 */
function scoreVote(playerAngle, resolvedAngle) {
  const delta = angleDelta(playerAngle, resolvedAngle);
  // Linear interpolation:
  // delta 0   → MAX_POINTS
  // delta 90  → 0
  // delta 180 → MIN_POINTS
  if (delta <= 90) {
    return Math.round(MAX_POINTS * (1 - delta / 90));
  } else {
    return Math.round(MIN_POINTS * ((delta - 90) / 90));
  }
}

/**
 * Recalculate vote weight from cumulative score.
 * Score ≥ 1000 → ×4.0 (max)
 * Score   500  → ×2.5
 * Score     0  → ×1.0
 * Score  -200  → ×0.25 (min)
 *
 * @param {number} totalScore
 * @returns {number} weight multiplier rounded to 2dp
 */
function scoreToWeight(totalScore) {
  // Clamp-then-scale: map [-200, 1000] → [WEIGHT_MIN, WEIGHT_MAX]
  const clamped = Math.max(-200, Math.min(1000, totalScore));
  const t = (clamped + 200) / 1200; // 0 → 1
  const weight = WEIGHT_MIN + t * (WEIGHT_MAX - WEIGHT_MIN);
  return Math.round(weight * 100) / 100;
}

/**
 * Apply score deltas to all players who voted this turn.
 * Players who did not vote receive no points and no weight change.
 *
 * @param {Array} players  — mongoose player subdocs
 * @param {Array} votes    — [{playerId, angle}]
 * @param {number} resolvedAngle
 * @returns {Array} scoreDelta map [{playerId, delta, newScore, newWeight}]
 */
function applyScores(players, votes, resolvedAngle) {
  const voteMap = new Map(votes.map((v) => [v.playerId, v.angle]));
  const results = [];

  for (const player of players) {
    if (!voteMap.has(player.id)) continue;
    const delta = scoreVote(voteMap.get(player.id), resolvedAngle);
    player.score += delta;
    player.weight = scoreToWeight(player.score);
    results.push({
      playerId: player.id,
      delta,
      newScore: player.score,
      newWeight: player.weight,
    });
  }

  return results;
}

export { scoreVote, scoreToWeight, applyScores };