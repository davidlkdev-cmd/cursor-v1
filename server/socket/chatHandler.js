import Session from '../models/Session.js';

/**
 * Send a system message to the session chat.
 */
async function sendSystemMessage(io, session, text) {
  const msg = {
    text,
    system: true,
    timestamp: new Date(),
  };
  session.chat.push(msg);
  await session.save();
  io.to(session.sessionId).emit("chat:message", msg);
}

function registerChatHandler(io, socket) {
  /**
   * Player sends a chat message.
   * payload: { sessionId, text }
   */
  socket.on("chat:send", async ({ sessionId, text }) => {
    const session = await Session.findOne({ sessionId });
    if (!session) return;

    const player = session.players.find((p) => p.id === socket.id);
    if (!player) return;

    const msg = {
      playerId: socket.id,
      playerName: player.name,
      playerColor: player.color,
      text,
      timestamp: new Date(),
    };

    session.chat.push(msg);
    await session.save();

    io.to(sessionId).emit("chat:message", msg);
  });
}

export { registerChatHandler, sendSystemMessage };