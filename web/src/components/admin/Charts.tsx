const W = 600;
const H = 220;
const PAD = 8;

type Pt = { label: string; value: number };

const scale = (pts: Pt[]) => {
  const max = Math.max(...pts.map((p) => p.value), 1);
  const step = pts.length > 1 ? (W - PAD * 2) / (pts.length - 1) : 0;
  return pts.map((p, i) => ({
    ...p,
    x: PAD + i * step,
    y: H - PAD - (p.value / max) * (H - PAD * 2),
  }));
};

const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export function AreaChart({ data, label }: { data: Pt[]; label: string }) {
  if (!data.length) return <Empty label={label} />;
  const pts = scale(data);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L${pts[0].x.toFixed(1)},${H - PAD} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-48 w-full sm:h-56"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d92626" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8B0000" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD}
          x2={W - PAD}
          y1={H * f}
          y2={H * f}
          stroke="currentColor"
          strokeOpacity="0.08"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={area} fill="url(#areaFill)" />
      <path
        d={line}
        fill="none"
        stroke="#d92626"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {pts.map((p) => (
        <line
          key={p.label}
          x1={p.x}
          y1={p.y}
          x2={p.x}
          y2={p.y}
          stroke="#d92626"
          strokeWidth="5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <title>{`${p.label}: ${compact(p.value)}`}</title>
        </line>
      ))}
    </svg>
  );
}

export function BarChart({ data, label }: { data: Pt[]; label: string }) {
  if (!data.length) return <Empty label={label} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = (W - PAD * 2) / data.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-48 w-full sm:h-56"
      role="img"
      aria-label={label}
    >
      {data.map((d, i) => {
        const h = (d.value / max) * (H - PAD * 2);
        return (
          <rect
            key={d.label}
            x={PAD + i * bw + bw * 0.15}
            y={H - PAD - h}
            width={bw * 0.7}
            height={h}
            rx="2"
            fill="#990000"
          >
            <title>{`${d.label}: ${compact(d.value)}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export function DonutChart({ data, label }: { data: Pt[]; label: string }) {
  if (!data.length) return <Empty label={label} />;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const shades = ["#8B0000", "#a30f0f", "#c01d1d", "#d92626", "#e85555", "#f08585"];
  const R = 60;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <svg viewBox="0 0 160 160" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label={label}>
        {data.map((d, i) => {
          const frac = d.value / total;
          const seg = (
            <circle
              key={d.label}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={shades[i % shades.length]}
              strokeWidth="20"
              strokeDasharray={`${(frac * C).toFixed(2)} ${C.toFixed(2)}`}
              strokeDashoffset={(-acc * C).toFixed(2)}
            >
              <title>{`${d.label}: ${(frac * 100).toFixed(1)}%`}</title>
            </circle>
          );
          acc += frac;
          return seg;
        })}
      </svg>

      <ul className="w-full min-w-0 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: shades[i % shades.length] }} />
            <span className="truncate font-mono text-xs">{d.label}</span>
            <span className="ml-auto shrink-0 text-xs text-slate-500 dark:text-slate-400">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="grid h-48 place-items-center font-mono text-xs text-slate-400">{label}: tidak ada data</p>;
}
