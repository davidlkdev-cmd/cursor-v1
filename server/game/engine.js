const STEP_SIZE = 32; // px per turn
const GOAL_RADIUS = 40;

/**
 * Compute the weighted circular mean of all votes.
 * Uses unit-vector averaging to handle angle wrap-around correctly.
 *
 * @param {Array<{angle: number, weight: number}>} votes
 * @returns {number} resultAngle in degrees [0, 360)
 */
function weightedAverageAngle(votes) {
  if (!votes.length) return 0;

  let sinSum = 0;
  let cosSum = 0;
  let totalWeight = 0;

  for (const { angle, weight } of votes) {
    const rad = (angle * Math.PI) / 180;
    sinSum += Math.sin(rad) * weight;
    cosSum += Math.cos(rad) * weight;
    totalWeight += weight;
  }

  const avgRad = Math.atan2(sinSum / totalWeight, cosSum / totalWeight);
  const deg = (avgRad * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Move cursor one step in the given direction.
 *
 * @param {{x: number, y: number}} cursor
 * @param {number} angleDeg
 * @param {{width: number, height: number}} bounds
 * @returns {{x: number, y: number}}
 */
function moveCursor(cursor, angleDeg, bounds = { width: 900, height: 600 }) {
  const rad = (angleDeg * Math.PI) / 180;
  const newX = Math.max(10, Math.min(bounds.width - 10, cursor.x + Math.cos(rad) * STEP_SIZE));
  const newY = Math.max(10, Math.min(bounds.height - 10, cursor.y + Math.sin(rad) * STEP_SIZE));
  return { x: Math.round(newX), y: Math.round(newY) };
}

/**
 * Check whether the cursor has reached the goal.
 *
 * @param {{x: number, y: number}} cursor
 * @param {{x: number, y: number}} goal
 * @returns {boolean}
 */
function checkGoal(cursor, goal) {
  const dx = cursor.x - goal.x;
  const dy = cursor.y - goal.y;
  return Math.sqrt(dx * dx + dy * dy) <= GOAL_RADIUS;
}

/**
 * Calculate the angular distance between two angles (shortest path).
 *
 * @param {number} a degrees
 * @param {number} b degrees
 * @returns {number} distance in [0, 180]
 */
function angleDelta(a, b) {
  const diff = Math.abs(((a - b + 180) % 360) - 180);
  return diff;
}

export { weightedAverageAngle, moveCursor, checkGoal, angleDelta, STEP_SIZE, GOAL_RADIUS };