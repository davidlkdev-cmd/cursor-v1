import React, { useEffect, useRef } from "react";

export default function GameCanvas({ cursor, trail = [], goal, players = [], lastTurnAngle, myVote }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      draw();
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = "#10101e";
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 48) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += 48) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Trail
      if (trail.length > 0) {
        ctx.strokeStyle = "#3a3a6a";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 7]);
        ctx.lineJoin = "round";
        ctx.beginPath();
        trail.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        if (cursor) ctx.lineTo(cursor.x, cursor.y);
        ctx.stroke();
        ctx.setLineDash([]);

        trail.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#4a4a7a";
          ctx.fill();
        });
      }

      // // Goal — crosshair only, no radius circle
      // if (goal) {
      //   const gx = goal.x;
      //   const gy = goal.y;
      //   const arm = 14;

      //   ctx.strokeStyle = "#ffe600";
      //   ctx.lineWidth = 2.5;
      //   ctx.beginPath();
      //   ctx.moveTo(gx - arm, gy); ctx.lineTo(gx + arm, gy);
      //   ctx.moveTo(gx, gy - arm); ctx.lineTo(gx, gy + arm);
      //   ctx.stroke();

      //   ctx.beginPath();
      //   ctx.arc(gx, gy, 5, 0, Math.PI * 2);
      //   ctx.fillStyle = "#ffe600";
      //   ctx.fill();

      //   ctx.fillStyle = "#ffe600";
      //   ctx.font = "bold 13px 'Space Mono', monospace";
      //   ctx.textAlign = "center";
      //   ctx.textBaseline = "top";
      //   ctx.fillText("GOAL", gx, gy + 18);
      // }

      // Cursor
      if (cursor) {
        const topPlayer = [...players].sort((a, b) => b.weight - a.weight)[0];
        const color = topPlayer?.color || "#ffffff";
        const initial = topPlayer?.name?.[0]?.toUpperCase() || "?";
        const name = topPlayer?.name || "";

        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.fillStyle = "#10101e";
        ctx.font = "bold 14px 'Space Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initial, cursor.x, cursor.y);

        ctx.fillStyle = color;
        ctx.font = "bold 13px 'Space Mono', monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(name, cursor.x + 26, cursor.y);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [cursor, trail, goal, players, lastTurnAngle, myVote]);

  return (
    <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
  );
}