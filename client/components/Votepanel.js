import { useRef, useEffect, useState, useCallback } from "react";

const SIZE = 130;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 10;

function drawDial(canvas, angle, hasVoted) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Tick marks
  for (let i = 0; i < 360; i += 3) {
    const isMajor = i % 45 === 0;
    const isMid = i % 15 === 0;
    const len = isMajor ? 10 : isMid ? 6 : 3;
    const opacity = isMajor ? 0.55 : isMid ? 0.22 : 0.08;
    const rad = (i * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(CENTER + RADIUS * Math.cos(rad), CENTER + RADIUS * Math.sin(rad));
    ctx.lineTo(CENTER + (RADIUS - len) * Math.cos(rad), CENTER + (RADIUS - len) * Math.sin(rad));
    ctx.strokeStyle = `rgba(220,220,255,${opacity})`;
    ctx.lineWidth = isMajor ? 1.5 : 0.8;
    ctx.stroke();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = hasVoted ? "#ffe600" : "#3a3a5e";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Needle
  const rad = (angle * Math.PI) / 180;
  const needleLen = RADIUS - 14;
  ctx.beginPath();
  ctx.moveTo(CENTER, CENTER);
  ctx.lineTo(CENTER + Math.cos(rad) * needleLen, CENTER + Math.sin(rad) * needleLen);
  ctx.strokeStyle = hasVoted ? "#ffe600" : "#00d4ff";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 5, 0, Math.PI * 2);
  ctx.fillStyle = hasVoted ? "#ffe600" : "#00d4ff";
  ctx.fill();
}

export default function VotePanel({ status, turn, timeLeft, maxTime = 15, voteCount, playerCount, onVote, myVote }) {
  const canvasRef = useRef(null);
  const [angle, setAngle] = useState(0);
  const isDragging = useRef(false);

  const getAngleFromEvent = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }, []);

  useEffect(() => {
    if (canvasRef.current) drawDial(canvasRef.current, angle, myVote !== null);
  }, [angle, myVote]);

  const handlePointerDown = (e) => {
    if (status !== "voting") return;
    isDragging.current = true;
    setAngle(getAngleFromEvent(e, canvasRef.current));
  };
  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    setAngle(getAngleFromEvent(e, canvasRef.current));
  };
  const handlePointerUp = () => { isDragging.current = false; };

  const handleSubmit = () => {
    if (status !== "voting") return;
    onVote(angle);
  };

  const compassDir = (a) => {
    const dirs = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
    return dirs[Math.round(a / 45) % 8];
  };

  // Fill % for button timer bar: full at start, drains to 0
  const fillPct = status === "voting" ? Math.max(0, (timeLeft / maxTime) * 100) : 0;

  // Button label
  const btnLabel = myVote !== null
    ? `✓ LOCKED ${Math.round(myVote)}°`
    : status === "voting"
    ? "LOCK VOTE"
    : status === "moving"
    ? "RESOLVING..."
    : "FINISHED";

  // Fill color: yellow when time is low, cyan otherwise; amber when voted
  const fillColor = myVote !== null
    ? "#ffe600"
    : timeLeft <= 3
    ? "#ff4f4f"
    : "#00d4ff";

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.label}>VOTE</span>
        <span style={styles.turnBadge}>TURN {turn}</span>
      </div>

      <div style={styles.dialWrap}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          style={{ width: SIZE, height: SIZE, cursor: status === "voting" ? "crosshair" : "default", touchAction: "none", userSelect: "none" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        <div style={styles.angleReadout}>
          <span style={{ color: myVote !== null ? "#ffe600" : "#00d4ff" }}>
            {Math.round(angle)}°
          </span>
          <span style={styles.compassDir}>{compassDir(angle)}</span>
        </div>
      </div>

      {/* Vote button with fill-timer */}
      <div style={styles.btnOuter}>
        {/* fill bar behind text */}
        <div
          style={{
            ...styles.btnFill,
            width: `${fillPct}%`,
            background: fillColor,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={status !== "voting"}
          style={{
            ...styles.btn,
            borderColor: myVote !== null ? "#ffe600" : status !== "voting" ? "#3a3a5e" : "#00d4ff",
            color: myVote !== null ? "#ffe600" : status !== "voting" ? "#555575" : "#ffffff",
            cursor: status === "voting" ? "pointer" : "default",
          }}
        >
          {btnLabel}
        </button>
      </div>

      {/* Vote count row */}
      <div style={styles.voteRow}>
        <span style={styles.voteCount}>{voteCount}/{playerCount} voted</span>
        <span style={{
          ...styles.timerText,
          color: status !== "voting" ? "#555575" : timeLeft <= 3 ? "#ff4f4f" : "#aaaacc",
        }}>
          {status === "voting" ? `${timeLeft}s` : status === "moving" ? "RESOLVING" : "DONE"}
        </span>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    borderTop: "1px solid #2a2a4a",
    padding: "14px 16px",
    background: "#161628",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: "#e0e0ff",
    letterSpacing: "2px",
    fontFamily: "'Space Mono', monospace",
  },
  turnBadge: {
    fontSize: 12,
    color: "#00d4ff",
    fontFamily: "'Space Mono', monospace",
    letterSpacing: "1px",
  },
  dialWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  angleReadout: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontFamily: "'Space Mono', monospace",
    fontSize: 14,
    fontWeight: 700,
  },
  compassDir: {
    color: "#666688",
    fontSize: 12,
  },
  btnOuter: {
    position: "relative",
    height: 42,
    marginBottom: 10,
    overflow: "hidden",
  },
  btnFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    transition: "width 1s linear, background 0.3s",
    opacity: 0.18,
    pointerEvents: "none",
  },
  btn: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    background: "transparent",
    border: "2px solid",
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "1.5px",
    transition: "color 0.2s, border-color 0.2s",
  },
  voteRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  voteCount: {
    fontSize: 13,
    color: "#aaaacc",
    fontFamily: "'Space Mono', monospace",
  },
  timerText: {
    fontSize: 13,
    fontFamily: "'Space Mono', monospace",
    fontWeight: 700,
    letterSpacing: "1px",
  },
};