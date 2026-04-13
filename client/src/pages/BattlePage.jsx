import { useEffect, useState, useRef, useCallback } from "react";
import socket from "../socket/socket";
import GameCanvas from "../components/GameCanvas";
import VotePanel from "../components/VotePanel";
import ChatBox from "../components/ChatBox";
import Leaderboard from "../components/LeaderBoard";

const DEFAULT_TIMEOUT = 15;

export default function BattlePage() {
  const [session, setSession] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMEOUT);
  const [maxTime, setMaxTime] = useState(DEFAULT_TIMEOUT);
  const timerRef = useRef(null);

  const startCountdown = useCallback((ms = DEFAULT_TIMEOUT * 1000) => {
    clearInterval(timerRef.current);
    const secs = Math.ceil(ms / 1000);
    setMaxTime(secs);
    let remaining = secs;
    setTimeLeft(remaining);
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timerRef.current);
    }, 1000);
  }, []);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        setSession(data);
        setMessages(data.chat || []);
      });

    socket.connect();

    socket.on("connect", () => {
      socket.emit("session:join");
    });

    socket.on("session:joined", ({ player, session }) => {
      setMyPlayer(player);
      setSession(session);
      setMessages(session.chat || []);
    });

    socket.on("player:joined", ({ players }) => {
      setSession((s) => s ? { ...s, players } : s);
    });

    socket.on("player:left", ({ players }) => {
      setSession((s) => s ? { ...s, players } : s);
    });

    socket.on("turn:start", ({ turn, timeoutMs }) => {
      setMyVote(null);
      setVoteCount(0);
      setSession((s) => s ? { ...s, turn, status: "voting" } : s);
      startCountdown(timeoutMs);
    });

    socket.on("vote:update", ({ voteCount }) => {
      setVoteCount(voteCount);
    });

    socket.on("turn:resolved", ({ resolvedAngle, cursor, trail, turn, scoreResults, players, status }) => {
      clearInterval(timerRef.current);
      setSession((s) =>
        s ? { ...s, cursor, trail, turn, players, status, lastTurnAngle: resolvedAngle } : s
      );
      setVoteCount(0);
    });

    socket.on("chat:message", (msg) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });

    socket.on("game:over", ({ players }) => {
      setSession((s) => s ? { ...s, status: "finished", players } : s);
      clearInterval(timerRef.current);
    });

    socket.on("session:reset", (newSession) => {
      setSession(newSession);
      setMessages(newSession.chat || []);
      setMyVote(null);
      setVoteCount(0);
    });

    return () => {
      socket.off("connect");
      socket.off("session:joined");
      socket.off("player:joined");
      socket.off("player:left");
      socket.off("turn:start");
      socket.off("vote:update");
      socket.off("turn:resolved");
      socket.off("chat:message");
      socket.off("game:over");
      socket.off("session:reset");
      socket.disconnect();
      clearInterval(timerRef.current);
    };
  }, [startCountdown]);

  const handleVote = (angle) => {
    socket.emit("vote:submit", { sessionId: "demo", angle });
    setMyVote(angle);
  };

  const handleChat = (text) => {
    socket.emit("chat:send", { sessionId: "demo", text });
  };

  const handleReset = async () => {
    await fetch("/api/session/reset", { method: "POST" });
    setMyVote(null);
    setVoteCount(0);
  };

  if (!session) {
    return (
      <div style={styles.loading}>
        <span style={styles.loadingText}>CONNECTING...</span>
      </div>
    );
  }

  const connectedPlayers = session.players.filter((p) => p.connected);
  const statusColor =
    session.status === "voting" ? "#00d4ff"
    : session.status === "finished" ? "#ffe600"
    : "#555575";

  return (
    <div style={styles.layout}>
      {/* TOP BAR */}
      <header style={styles.topbar}>
        <span style={styles.title}>SHARED CURSOR</span>
        <span style={styles.divider}>|</span>
        <span style={styles.meta}>SESSION #DEMO</span>
        <span style={styles.divider}>|</span>
        <span style={styles.meta}>TURN <strong style={{ color: "#e0e0ff" }}>{session.turn}</strong></span>

        <span style={{ ...styles.badge, background: statusColor, color: "#10101e" }}>
          {session.status === "voting" ? "VOTING" : session.status === "moving" ? "RESOLVING" : "GAME OVER"}
        </span>

        <span style={styles.playerPill}>
          <span style={styles.liveDot} />
          <strong>{connectedPlayers.length}</strong> ONLINE
        </span>

        {myPlayer && (
          <span style={{ ...styles.youPill, borderColor: myPlayer.color, color: myPlayer.color }}>
            YOU: {myPlayer.name}
          </span>
        )}

        <button onClick={handleReset} style={styles.resetBtn}>RESET</button>
      </header>

      {/* CANVAS */}
      <main style={styles.canvasArea}>
        <GameCanvas
          cursor={session.cursor}
          trail={session.trail || []}
          goal={session.goal}
          players={connectedPlayers}
          lastTurnAngle={session.lastTurnAngle ?? null}
          myVote={myVote}
        />
        <Leaderboard players={session.players} myPlayer={myPlayer} />

        {/* Game over overlay */}
        {session.status === "finished" && (
          <div style={styles.overlay}>
            <div style={styles.overlayBox}>
              <div style={styles.overlayTitle}>GOAL REACHED</div>
              <div style={styles.overlayTurn}>after {session.turn} turns</div>
              <div style={{ marginTop: 16 }}>
                {[...session.players]
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3)
                  .map((p, i) => (
                    <div key={p.id} style={{ ...styles.overlayRow, color: p.color }}>
                      #{i + 1} {p.name} — {p.score} pts
                    </div>
                  ))}
              </div>
              <button onClick={handleReset} style={styles.overlayBtn}>PLAY AGAIN</button>
            </div>
          </div>
        )}
      </main>

      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <ChatBox messages={messages} onSend={handleChat} myPlayer={myPlayer} />
        <VotePanel
          status={session.status}
          turn={session.turn}
          timeLeft={timeLeft}
          maxTime={maxTime}
          voteCount={voteCount}
          playerCount={connectedPlayers.length}
          onVote={handleVote}
          myVote={myVote}
        />
      </aside>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <span style={styles.footerStat}>
          STATUS <span style={{ color: statusColor, fontWeight: 700 }}>{session.status.toUpperCase()}</span>
        </span>
        <span style={styles.footerStat}>
          TOP WEIGHT{" "}
          {(() => {
            const top = [...session.players].sort((a, b) => b.weight - a.weight)[0];
            return top
              ? <span style={{ color: top.color, fontWeight: 700 }}>{top.name} ×{top.weight.toFixed(1)}</span>
              : <span style={{ color: "#555575" }}>—</span>;
          })()}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#555575" }}>
          SHARED CURSOR v0.1
        </span>
      </footer>
    </div>
  );
}

const styles = {
  layout: {
    background: "#10101e",
    color: "#e0e0ff",
    fontFamily: "'Space Mono', monospace",
    height: "100vh",
    display: "grid",
    gridTemplateRows: "52px 1fr 40px",
    gridTemplateColumns: "1fr 300px",
    gridTemplateAreas: `"topbar topbar" "canvas sidebar" "footer footer"`,
    overflow: "hidden",
  },
  loading: {
    background: "#10101e",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 14,
    color: "#555575",
    letterSpacing: "3px",
  },
  topbar: {
    gridArea: "topbar",
    background: "#161628",
    borderBottom: "1px solid #2a2a4a",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    gap: 14,
  },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 24,
    letterSpacing: "3px",
    color: "#ff4f4f",
  },
  divider: {
    color: "#2a2a4a",
    fontSize: 16,
  },
  meta: {
    fontSize: 12,
    color: "#888899",
    letterSpacing: "1px",
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 10px",
    letterSpacing: "1px",
  },
  playerPill: {
    fontSize: 12,
    color: "#888899",
    letterSpacing: "1px",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00ff88",
    display: "inline-block",
  },
  youPill: {
    fontSize: 12,
    border: "1px solid",
    padding: "3px 10px",
    letterSpacing: "1px",
    fontWeight: 700,
  },
  resetBtn: {
    marginLeft: "auto",
    background: "transparent",
    border: "1px solid #2a2a4a",
    color: "#888899",
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    padding: "5px 12px",
    cursor: "pointer",
    letterSpacing: "1px",
  },
  canvasArea: {
    gridArea: "canvas",
    position: "relative",
    background: "#10101e",
    overflow: "hidden",
    borderRight: "1px solid #2a2a4a",
  },
  sidebar: {
    gridArea: "sidebar",
    background: "#10101e",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  footer: {
    gridArea: "footer",
    background: "#161628",
    borderTop: "1px solid #2a2a4a",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    gap: 28,
    fontSize: 12,
    color: "#888899",
    letterSpacing: "1px",
  },
  footerStat: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(16,16,30,0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  overlayBox: {
    background: "#161628",
    border: "2px solid #ffe600",
    padding: "36px 48px",
    textAlign: "center",
  },
  overlayTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 42,
    letterSpacing: "4px",
    color: "#ffe600",
  },
  overlayTurn: {
    fontSize: 13,
    color: "#888899",
    letterSpacing: "1px",
    marginTop: 4,
  },
  overlayRow: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "1px",
    marginTop: 6,
  },
  overlayBtn: {
    marginTop: 24,
    background: "#ffe600",
    border: "none",
    color: "#10101e",
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    fontWeight: 700,
    padding: "10px 28px",
    cursor: "pointer",
    letterSpacing: "2px",
  },
};