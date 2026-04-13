export default function Leaderboard({ players, myPlayer }) {
  const sorted = [...players]
    .filter((p) => p.connected)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>LEADERBOARD</div>
      {sorted.map((p, i) => (
        <div
          key={p.id}
          style={{
            ...styles.row,
            ...(p.id === myPlayer?.id ? styles.meRow : {}),
            borderLeft: i === 0 ? `3px solid ${p.color}` : "3px solid transparent",
          }}
        >
          <span style={{ ...styles.rank, color: i === 0 ? "#ffe600" : "#555575" }}>
            {i === 0 ? "★" : i + 1}
          </span>
          <div style={{ ...styles.avatar, background: p.color }}>
            {p.name[0].toUpperCase()}
          </div>
          <span style={{ ...styles.name, color: i === 0 ? p.color : "#d0d0f0" }}>
            {p.name}
          </span>
          <span style={{ ...styles.pts, color: p.score < 0 ? "#ff4f4f" : i === 0 ? "#ffe600" : "#e0e0ff" }}>
            {p.score > 0 ? "+" : ""}{p.score}
          </span>
          <span style={{ ...styles.weight, color: p.weight >= 2 ? "#00ff88" : p.weight < 1 ? "#ff4f4f" : "#555575" }}>
            ×{p.weight.toFixed(1)}
          </span>
        </div>
      ))}
      {sorted.length === 0 && (
        <div style={styles.empty}>waiting for players...</div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    position: "absolute",
    bottom: 20,
    left: 20,
    background: "#161628",
    border: "1px solid #2a2a4a",
    width: 230,
    zIndex: 10,
  },
  header: {
    background: "#1e1e38",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#e0e0ff",
    letterSpacing: "2px",
    borderBottom: "1px solid #2a2a4a",
    fontFamily: "'Space Mono', monospace",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 12px",
    borderBottom: "1px solid #1e1e38",
    fontFamily: "'Space Mono', monospace",
  },
  meRow: {
    background: "#1a1a32",
  },
  rank: {
    fontSize: 11,
    width: 14,
    textAlign: "center",
    flexShrink: 0,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 700,
    color: "#10101e",
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  pts: {
    fontSize: 12,
    fontWeight: 700,
  },
  weight: {
    fontSize: 11,
    fontWeight: 700,
  },
  empty: {
    padding: "10px 12px",
    fontSize: 12,
    color: "#555575",
    fontFamily: "'Space Mono', monospace",
    fontStyle: "italic",
  },
};