const FLAG_COLORS = [
  '#facc15',
  '#ef4444',
  '#22c55e',
  '#ec4899',
  '#fb923c',
  '#38bdf8',
];

export function FestivalBunting() {
  const flags = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    color: FLAG_COLORS[i % FLAG_COLORS.length],
    mirrorColor: i % 2 === 0 ? '#fef08a' : '#ffffff',
  }));

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 700 44"
        preserveAspectRatio="none"
        className="h-9 w-full drop-shadow-[0_3px_0_#1c1917] sm:h-11"
      >
        <path
          d="M 0 4 Q 175 18 350 8 T 700 6"
          fill="none"
          stroke="#1c1917"
          strokeWidth="4"
        />
        {flags.map((f, idx) => {
          const x = idx * 50;
          const midX = x + 25;
          const sag = Math.sin((idx / 13) * Math.PI) * 5;
          return (
            <g key={f.id}>
              <polygon
                points={`${x + 3},${6 + sag * 0.4} ${x + 47},${6 + sag * 0.4} ${midX},${35 + sag}`}
                fill={f.color}
                stroke="#1c1917"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
              {/* Tiny rickshaw foil mirror */}
              <circle
                cx={midX}
                cy={16 + sag * 0.6}
                r="4"
                fill={f.mirrorColor}
                stroke="#1c1917"
                strokeWidth="1.5"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function SunburstBackdrop() {
  const rays = Array.from({ length: 18 }, (_, i) => i * 20);
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="animate-sunburst absolute left-1/2 top-[48%] h-[150vmax] w-[150vmax] opacity-30"
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          {rays.map((deg, idx) => {
            const a1 = (deg * Math.PI) / 180;
            const a2 = ((deg + 10) * Math.PI) / 180;
            const x1 = 100 + Math.cos(a1) * 120;
            const y1 = 100 + Math.sin(a1) * 120;
            const x2 = 100 + Math.cos(a2) * 120;
            const y2 = 100 + Math.sin(a2) * 120;
            return (
              <polygon
                key={deg}
                points={`100,100 ${x1},${y1} ${x2},${y2}`}
                fill={idx % 2 === 0 ? '#facc15' : '#fb923c'}
              />
            );
          })}
          <circle cx="100" cy="100" r="22" fill="#fef08a" opacity="0.65" />
        </svg>
      </div>
    </div>
  );
}

const PETALS = [
  { left: '6%', delay: '0s', dur: '7.5s', color: '#f43f5e', size: 12 },
  { left: '16%', delay: '-2.2s', dur: '8.8s', color: '#facc15', size: 10 },
  { left: '28%', delay: '-4.1s', dur: '7.2s', color: '#fb923c', size: 13 },
  { left: '41%', delay: '-1.3s', dur: '9.4s', color: '#ec4899', size: 11 },
  { left: '54%', delay: '-5.5s', dur: '8.1s', color: '#22c55e', size: 10 },
  { left: '67%', delay: '-3.0s', dur: '7.8s', color: '#facc15', size: 12 },
  { left: '79%', delay: '-0.8s', dur: '8.6s', color: '#f43f5e', size: 11 },
  { left: '91%', delay: '-4.8s', dur: '7.4s', color: '#38bdf8', size: 12 },
];

export function ConfettiPetals() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {PETALS.map((p, idx) => (
        <span
          key={idx}
          className="animate-petal absolute top-0 block rounded-full border-2 border-stone-950"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${Math.round(p.size * 0.72)}px`,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  );
}

export function RickshawBorderStrip({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-3 w-full overflow-hidden border-y-2 border-stone-950 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 360 16" preserveAspectRatio="none" className="h-full w-full">
        <rect width="360" height="16" fill="#facc15" />
        {Array.from({ length: 18 }, (_, i) => {
          const x = i * 20;
          const colors = ['#ef4444', '#22c55e', '#ec4899', '#0ea5e9'];
          const fill = colors[i % colors.length];
          return (
            <g key={i}>
              <polygon
                points={`${x},16 ${x + 10},0 ${x + 20},16`}
                fill={fill}
                stroke="#1c1917"
                strokeWidth="1.3"
              />
              <circle cx={x + 10} cy="10" r="2.6" fill="#fef08a" stroke="#1c1917" strokeWidth="1" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function RickshawPeacockCrest() {
  return (
    <svg
      viewBox="0 0 320 62"
      className="h-12 w-64 drop-shadow-[0_3px_0_#1c1917] sm:h-14 sm:w-80"
      aria-hidden="true"
    >
      {/* Left & Right Stylized Chattogram Folk Peacocks / Flowers */}
      <g transform="translate(52, 34)">
        {/* Peacock Tail Fan */}
        {[-50, -25, 0, 25, 50].map((deg, idx) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <ellipse
              cx="0"
              cy="-16"
              rx="6"
              ry="13"
              fill={idx % 2 === 0 ? '#22c55e' : '#0ea5e9'}
              stroke="#1c1917"
              strokeWidth="2"
            />
            <circle cx="0" cy="-21" r="2.6" fill="#facc15" stroke="#1c1917" strokeWidth="1.2" />
          </g>
        ))}
        <circle cx="0" cy="0" r="9" fill="#0284c7" stroke="#1c1917" strokeWidth="2.2" />
        <circle cx="5" cy="-3" r="2" fill="#ffffff" />
        <polygon points="8,-2 15,0 8,3" fill="#facc15" stroke="#1c1917" strokeWidth="1.2" />
      </g>

      <g transform="translate(268, 34) scale(-1, 1)">
        {[-50, -25, 0, 25, 50].map((deg, idx) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <ellipse
              cx="0"
              cy="-16"
              rx="6"
              ry="13"
              fill={idx % 2 === 0 ? '#22c55e' : '#0ea5e9'}
              stroke="#1c1917"
              strokeWidth="2"
            />
            <circle cx="0" cy="-21" r="2.6" fill="#facc15" stroke="#1c1917" strokeWidth="1.2" />
          </g>
        ))}
        <circle cx="0" cy="0" r="9" fill="#0284c7" stroke="#1c1917" strokeWidth="2.2" />
        <circle cx="5" cy="-3" r="2" fill="#ffffff" />
        <polygon points="8,-2 15,0 8,3" fill="#facc15" stroke="#1c1917" strokeWidth="1.2" />
      </g>

      {/* Center Rickshaw Marigold & Diamond Mirrors */}
      {[102, 160, 218].map((cx, idx) => {
        const petalColor = idx === 1 ? '#ec4899' : '#fb923c';
        const r = idx === 1 ? 15 : 11;
        return (
          <g key={cx} transform={`translate(${cx}, ${idx === 1 ? 26 : 33})`}>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <circle
                key={deg}
                cx={Math.cos((deg * Math.PI) / 180) * (r * 0.65)}
                cy={Math.sin((deg * Math.PI) / 180) * (r * 0.65)}
                r={r * 0.42}
                fill={petalColor}
                stroke="#1c1917"
                strokeWidth="1.8"
              />
            ))}
            <circle cx="0" cy="0" r={r * 0.38} fill="#facc15" stroke="#1c1917" strokeWidth="1.8" />
          </g>
        );
      })}

      {/* Tiny foil mirror diamonds */}
      {[131, 189].map((mx) => (
        <polygon
          key={mx}
          points={`${mx},21 ${mx + 6},29 ${mx},37 ${mx - 6},29`}
          fill="#bae6fd"
          stroke="#1c1917"
          strokeWidth="1.8"
        />
      ))}
    </svg>
  );
}

export function SpeedLinesOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  const lines = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 200"
        preserveAspectRatio="none"
        className="animate-speed-lines h-full w-full opacity-75"
      >
        {lines.map((deg, idx) => {
          const rad = (deg * Math.PI) / 180;
          const rIn = idx % 2 === 0 ? 64 : 74;
          const rOut = 142;
          const x1 = 100 + Math.cos(rad) * rIn;
          const y1 = 100 + Math.sin(rad) * rIn;
          const x2 = 100 + Math.cos(rad) * rOut;
          const y2 = 100 + Math.sin(rad) * rOut;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={idx % 3 === 0 ? '#facc15' : '#ffffff'}
              strokeWidth={idx % 2 === 0 ? '1.3' : '0.8'}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </div>
  );
}
