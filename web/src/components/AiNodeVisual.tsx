"use client";

import { motion } from "framer-motion";

const nodes = [
  { x: 50, y: 50, r: 6 },
  { x: 18, y: 24, r: 3.5 },
  { x: 82, y: 22, r: 3 },
  { x: 15, y: 76, r: 3 },
  { x: 85, y: 74, r: 3.5 },
  { x: 50, y: 10, r: 2.5 },
  { x: 50, y: 90, r: 2.5 },
  { x: 8, y: 50, r: 2.5 },
  { x: 92, y: 50, r: 2.5 },
];

export default function AiNodeVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem] sm:max-w-[26rem] lg:max-w-[32rem] [perspective:1000px]">
      <div className="absolute inset-[12%] rounded-full bg-crimson/25 blur-3xl dark:bg-crimson/30" />

      <motion.svg
        viewBox="0 0 100 100"
        className="relative h-full w-full animate-float"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: [0, 12, 0, -12, 0], rotateX: [0, -8, 0, 8, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="core" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#ffe9e9" />
            <stop offset="55%" stopColor="#d92626" />
            <stop offset="100%" stopColor="#8B0000" />
          </radialGradient>
          <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#990000" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#d92626" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#990000" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {[34, 44].map((r, i) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="url(#edge)"
            strokeWidth="0.5"
            strokeDasharray={i ? "2 4" : "6 3"}
            className="animate-pulseRing"
          />
        ))}

        {nodes.slice(1).map((n, i) => (
          <motion.line
            key={`l${i}`}
            x1="50"
            y1="50"
            x2={n.x}
            y2={n.y}
            stroke="url(#edge)"
            strokeWidth="0.45"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: 1, opacity: [0.25, 0.9, 0.25] }}
            transition={{ duration: 3 + i * 0.35, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {nodes.map((n, i) => (
          <motion.circle
            key={`n${i}`}
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={i === 0 ? "url(#core)" : "#d92626"}
            animate={{ opacity: i === 0 ? 1 : [0.45, 1, 0.45], r: i === 0 ? [n.r, n.r * 1.12, n.r] : n.r }}
            transition={{ duration: 2.4 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </motion.svg>
    </div>
  );
}
