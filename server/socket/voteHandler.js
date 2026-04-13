import Session from '../models/Session.js';
import { weightedAverageAngle, moveCursor, checkGoal } from '../game/engine.js';
import { applyScores } from '../game/scoring.js';

const VOTE_TIMEOUT_MS = 5000;
const turnTimers = new Map();

function startTurnTimer(io, sessionId) {
  clearTurnTimer(sessionId);
  const handle = setTimeout(() => resolveTurn(io, sessionId), VOTE_TIMEOUT_MS);
  turnTimers.set(sessionId, handle);
}

function clearTurnTimer(sessionId) {
  if (turnTimers.has(sessionId)) {
    clearTimeout(turnTimers.get(sessionId));
    turnTimers.delete(sessionId);
  }
}

async function resolveTurn(io, sessionId) {
  clearTurnTimer(sessionId);

  const session = await Session.findOne({ sessionId });
  if (!session || session.status === "finished" || session.status === "moving") return;

  session.status = "moving";
  await session.save();

  const votes =
    session.votes.length > 0
      ? session.votes.map((v) => {
          const player = session.players.find((p) => p.id === v.playerId);
          return { angle: v.angle, weight: player ? player.weight : 1.0 };
        })
      : [{ angle: Math.random() * 360, weight: 1 }];

  const resolvedAngle = weightedAverageAngle(votes);
  const newCursor = moveCursor(session.cursor, resolvedAngle);

  session.trail.push({ x: session.cursor.x, y: session.cursor.y });
  session.cursor = newCursor;
  session.lastTurnAngle = resolvedAngle;

  const scoreResults = applyScores(session.players, session.votes, resolvedAngle);

  session.votes = [];
  session.turn += 1;

  const isGoal = checkGoal(newCursor, session.goal);
  session.status = isGoal ? "finished" : "voting";

  await session.save();

  io.to(sessionId).emit("turn:resolved", {
    resolvedAngle,
    cursor: newCursor,
    trail: session.trail,
    turn: session.turn,
    scoreResults,
    players: session.players,
    status: session.status,
  });

  if (isGoal) {
    io.to(sessionId).emit("game:over", {
      players: session.players.sort((a, b) => b.score - a.score),
    });
  } else {
    startTurnTimer(io, sessionId);
    io.to(sessionId).emit("turn:start", {
      turn: session.turn,
      timeoutMs: VOTE_TIMEOUT_MS,
    });
  }
}

function registerVoteHandler(io, socket) {
  socket.on("vote:submit", async ({ sessionId, angle }) => {
    const session = await Session.findOne({ sessionId });
    if (!session || session.status !== "voting") return;

    const existing = session.votes.findIndex((v) => v.playerId === socket.id);
    if (existing >= 0) {
      session.votes[existing].angle = angle;
    } else {
      session.votes.push({ playerId: socket.id, angle });
    }
    await session.save();

    const connectedCount = session.players.filter((p) => p.connected).length;
    io.to(sessionId).emit("vote:update", {
      voteCount: session.votes.length,
      playerCount: connectedCount,
      votes: session.votes.map((v) => ({ playerId: v.playerId })),
    });
  });
}

export { registerVoteHandler, startTurnTimer, clearTurnTimer };