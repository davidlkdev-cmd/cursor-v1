import { useEffect, useRef, useState } from "react";

export default function ChatBox({ messages, onSend, myPlayer }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={styles.dot} />
        <span style={styles.headerLabel}>LIVE CHAT</span>
      </div>

      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.msg,
              ...(msg.system ? styles.system : {}),
              ...(msg.playerId === myPlayer?.id ? styles.mine : {}),
            }}
          >
            {msg.system ? (
              <span style={styles.systemText}>{msg.text}</span>
            ) : (
              <>
                <span style={{ ...styles.username, color: msg.playerColor }}>
                  {msg.playerName}
                </span>
                <span style={styles.msgText}>{msg.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputBar}>
        <input
          style={styles.input}
          type="text"
          placeholder="negotiate, lie, betray..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          maxLength={200}
        />
        <button style={styles.sendBtn} onClick={handleSend}>
          SEND
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
    minHeight: 0,
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #2a2a4a",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    background: "#161628",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00ff88",
    display: "inline-block",
    flexShrink: 0,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#e0e0ff",
    fontFamily: "'Space Mono', monospace",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    background: "#10101e",
  },
  msg: {
    padding: "4px 16px",
    fontSize: 13,
    lineHeight: 1.5,
    fontFamily: "'Space Mono', monospace",
  },
  system: {
    padding: "6px 16px",
  },
  mine: {
    background: "#1a1a32",
  },
  systemText: {
    color: "#555575",
    fontSize: 12,
    fontStyle: "italic",
  },
  username: {
    fontWeight: 700,
    fontSize: 12,
    marginRight: 8,
  },
  msgText: {
    color: "#d0d0f0",
  },
  inputBar: {
    borderTop: "1px solid #2a2a4a",
    padding: "10px 12px",
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexShrink: 0,
    background: "#161628",
  },
  input: {
    flex: 1,
    background: "#10101e",
    border: "1px solid #2a2a4a",
    color: "#e0e0ff",
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    padding: "8px 12px",
    outline: "none",
  },
  sendBtn: {
    background: "#00d4ff",
    border: "none",
    color: "#10101e",
    fontFamily: "'Space Mono', monospace",
    fontSize: 12,
    fontWeight: 700,
    padding: "8px 14px",
    cursor: "pointer",
    letterSpacing: "1px",
  },
};