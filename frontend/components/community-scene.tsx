/**
 * The barangay street behind the sign-in page, drawn by hand so the page needs no image files.
 * It's an illustration: the pins show the idea of Report, Track and Resolve, not real reports.
 */

const GROUND = 452;

const STARS = [[90, 40], [210, 92], [340, 30], [470, 70], [610, 26], [760, 84], [905, 36], [1040, 74], [1180, 28], [1320, 66]];
const FAR_BLOCKS = [[0, 70, 62], [64, 52, 92], [120, 80, 54], [214, 46, 112], [266, 88, 70], [470, 60, 96], [536, 72, 58], [616, 50, 124], [672, 84, 74], [1228, 66, 104], [1300, 100, 72]];

function Window({ x, y, w = 16, h = 18, lit = true }: { x: number; y: number; w?: number; h?: number; lit?: boolean }) {
  return <rect x={x} y={y} width={w} height={h} rx="2" fill={lit ? "#ffd98a" : "#23407f"} />;
}

function House({ x, w, h, wall, roof }: { x: number; w: number; h: number; wall: string; roof: string }) {
  const top = GROUND - h;

  return (
    <g>
      <rect x={x} y={top} width={w} height={h} fill={wall} />
      <path d={`M${x - 10} ${top}L${x + w / 2} ${top - h * 0.55}L${x + w + 10} ${top}Z`} fill={roof} />
      <rect x={x + w * 0.14} y={GROUND - 42} width="24" height="42" rx="2" fill={roof} />
      <Window x={x + w * 0.56} y={top + 16} w={w * 0.28} h={24} />
      <path d={`M${x + w * 0.56 + (w * 0.14)} ${top + 16}v24`} stroke={wall} strokeWidth="2" />
    </g>
  );
}

function Palm({ x, scale = 1 }: { x: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${GROUND}) scale(${scale})`}>
      <path d="M-4 0C-2-50 2-90 12-128" fill="none" stroke="#2b3f63" strokeWidth="8" strokeLinecap="round" />
      <g fill="#1f9d63">
        <path d="M12-128C-14-146-44-136-58-110-34-124-12-124 12-128Z" />
        <path d="M12-128C38-148 70-138 84-110 58-126 36-124 12-128Z" />
      </g>
      <g fill="#167a4e">
        <path d="M12-128C-4-162-34-170-54-160-30-154-8-146 12-128Z" />
        <path d="M12-128C24-164 56-174 78-162 52-156 30-146 12-128Z" />
        <path d="M12-128C6-108-10-86-30-80-18-98-6-114 12-128Z" />
        <path d="M12-128C22-106 40-88 60-84 46-100 30-116 12-128Z" />
      </g>
    </g>
  );
}

function Tree({ x, r = 34 }: { x: number; r?: number }) {
  return (
    <g>
      <rect x={x - 4} y={GROUND - r * 1.4} width="8" height={r * 1.4} fill="#2b3f63" />
      <circle cx={x} cy={GROUND - r * 2} r={r} fill="#167a4e" />
      <circle cx={x - r * 0.55} cy={GROUND - r * 1.55} r={r * 0.68} fill="#1f9d63" />
      <circle cx={x + r * 0.55} cy={GROUND - r * 1.6} r={r * 0.72} fill="#22ad6d" />
    </g>
  );
}

function Lamp({ x, lit = true }: { x: number; lit?: boolean }) {
  return (
    <g>
      {lit && (
        <g className="scene-glow">
          <path d={`M${x + 34} ${GROUND - 128}L${x - 26} ${GROUND + 14}H${x + 96}Z`} fill="url(#lamp-beam)" />
          <circle cx={x + 34} cy={GROUND - 130} r="30" fill="url(#lamp-halo)" />
        </g>
      )}
      <path d={`M${x} ${GROUND + 12}V${GROUND - 138}Q${x} ${GROUND - 146} ${x + 10} ${GROUND - 146}H${x + 40}`} fill="none" stroke="#10234d" strokeWidth="5" strokeLinecap="round" />
      <rect x={x + 22} y={GROUND - 148} width="26" height="9" rx="4" fill={lit ? "#ffe7ae" : "#3a4b70"} />
    </g>
  );
}

function BarangayHall() {
  const x = 850;
  const columns = [20, 92, 244, 316];

  return (
    <g>
      <rect x={x - 16} y={GROUND - 12} width="372" height="12" fill="#c7d4ea" />
      <rect x={x} y={GROUND - 190} width="340" height="178" fill="#eef3fb" />
      <rect x={x} y={GROUND - 190} width="340" height="10" fill="#d5e0f2" />
      <path d={`M${x - 22} ${GROUND - 190}L${x + 170} ${GROUND - 252}L${x + 362} ${GROUND - 190}Z`} fill="#1a4fd6" />
      <path d={`M${x + 40} ${GROUND - 192}L${x + 170} ${GROUND - 234}L${x + 300} ${GROUND - 192}Z`} fill="#2f6df0" />
      <rect x={x + 62} y={GROUND - 176} width="216" height="30" rx="4" fill="#0f2f8f" />
      <text x={x + 170} y={GROUND - 155} textAnchor="middle" fontSize="17" fontWeight="800" letterSpacing="2.4" fill="#fff">BARANGAY HALL</text>
      {[44, 116, 196, 268].map((left) => <Window key={left} x={x + left} y={GROUND - 134} w={28} h={34} />)}
      {[44, 268].map((left) => <Window key={left} x={x + left} y={GROUND - 84} w={28} h={40} />)}
      <rect x={x + 136} y={GROUND - 92} width="68" height="80" rx="3" fill="#0f2f8f" />
      <rect x={x + 142} y={GROUND - 86} width="26" height="74" fill="#ffd98a" />
      <rect x={x + 172} y={GROUND - 86} width="26" height="74" fill="#ffd98a" />
      {columns.map((left) => <rect key={left} x={x + left - 6} y={GROUND - 146} width="12" height="134" fill="#fff" />)}

      <path d={`M${x + 386} ${GROUND}V${GROUND - 284}`} stroke="#dbe5f4" strokeWidth="5" strokeLinecap="round" />
      <g transform={`translate(${x + 388} ${GROUND - 282})`}>
        <path d="M0 0H74V21H0Z" fill="#1d4ed8" />
        <path d="M0 21H74V42H0Z" fill="#dc2626" />
        <path d="M0 0L34 21 0 42Z" fill="#fff" />
        <circle cx="11" cy="21" r="4.5" fill="#fbbf24" />
      </g>
    </g>
  );
}

function Pin({ x, y, color, label, children, delay = "0s" }: { x: number; y: number; color: string; label: string; children: React.ReactNode; delay?: string }) {
  const width = label.length * 8.2 + 26;

  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse className="scene-ping" style={{ animationDelay: delay }} rx="20" ry="7" fill={color} />
      <g className="scene-pin" style={{ animationDelay: delay }}>
        <path d="M0 0C-5-14-22-24-22-44a22 22 0 1 1 44 0C22-24 5-14 0 0Z" fill={color} stroke="#fff" strokeWidth="3" />
        <circle cy="-44" r="13" fill="#fff" />
        <g fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">{children}</g>
        <rect x="30" y="-62" width={width} height="30" rx="15" fill="#fff" />
        <text x={30 + width / 2} y="-42" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0b1729">{label}</text>
      </g>
    </g>
  );
}

function RoadWork() {
  const cone = (x: number) => (
    <g key={x}>
      <path d={`M${x - 11} 524H${x + 11}L${x + 3} 494H${x - 3}Z`} fill="#f97316" />
      <path d={`M${x - 6} 510H${x + 6}`} stroke="#fff" strokeWidth="4" />
      <rect x={x - 15} y="522" width="30" height="5" rx="2" fill="#ea580c" />
    </g>
  );

  return (
    <g>
      <ellipse cx="1098" cy="516" rx="46" ry="11" fill="#0a1226" />
      {[1034, 1166].map(cone)}

      {/* The repair van */}
      <g>
        <rect x="838" y="476" width="146" height="52" rx="8" fill="#f4f7fc" />
        <path d="M838 492V484Q838 476 846 476H918V500H838Z" fill="#bcd3f7" />
        <rect x="838" y="508" width="146" height="9" fill="#16a34a" />
        <rect x="952" y="462" width="18" height="14" rx="3" fill="#fbbf24" />
        <circle cx="868" cy="530" r="14" fill="#10234d" />
        <circle cx="868" cy="530" r="6" fill="#c7d4ea" />
        <circle cx="956" cy="530" r="14" fill="#10234d" />
        <circle cx="956" cy="530" r="6" fill="#c7d4ea" />
      </g>

      {/* A worker in a safety vest */}
      <g>
        <circle cx="1060" cy="466" r="8" fill="#e8b48a" />
        <path d="M1051 462a9 9 0 0 1 18 0Z" fill="#fbbf24" />
        <rect x="1051" y="474" width="18" height="26" rx="4" fill="#f97316" />
        <path d="M1051 487H1069" stroke="#fef08a" strokeWidth="3" />
        <path d="M1055 500V526M1065 500V526" stroke="#10234d" strokeWidth="6" strokeLinecap="round" />
        <path d="M1069 480L1092 510" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      </g>
    </g>
  );
}

/** The street, anchored to the bottom of the left panel. */
export function CommunityScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1400 560" preserveAspectRatio="xMaxYMax slice" aria-hidden className={className}>
      <defs>
        <radialGradient id="lamp-halo">
          <stop offset="0" stopColor="#fff1c2" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff1c2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lamp-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9b0" stopOpacity=".42" />
          <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="road-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2c55" />
          <stop offset="1" stopColor="#0d1a3a" />
        </linearGradient>
      </defs>

      {STARS.map(([x, y], index) => <circle key={x} className="scene-star" style={{ animationDelay: `${index * 0.4}s` }} cx={x} cy={y} r="2" fill="#fff" />)}

      {/* Distant town, then the hills from the logo */}
      <g fill="#2a56c6" opacity=".55">
        {FAR_BLOCKS.map(([x, w, h]) => <rect key={x} x={x} y={GROUND - 40 - h} width={w} height={h + 40} />)}
      </g>
      <path d="M0 372C150 316 300 330 460 366S760 344 930 352 1240 318 1400 356V470H0Z" fill="#127a58" />
      <path d="M0 410C210 362 380 396 610 408S1010 372 1400 402V470H0Z" fill="#1a9a68" />

      <Palm x={46} scale={1.1} />
      <House x={104} w={124} h={84} wall="#dfe9fb" roof="#2563eb" />
      <Tree x={272} r={30} />
      <House x={324} w={136} h={96} wall="#d7f3e4" roof="#16a34a" />
      <Palm x={508} scale={0.92} />
      <House x={562} w={118} h={78} wall="#ffeccf" roof="#d97706" />
      <Tree x={736} r={36} />
      <Palm x={806} scale={1.05} />
      <BarangayHall />
      <Tree x={1336} r={38} />

      {/* Sidewalk and road */}
      <rect y={GROUND} width="1400" height="14" fill="#a9bbd8" />
      <rect y={GROUND + 14} width="1400" height="94" fill="url(#road-fill)" />
      <path d={`M0 ${GROUND + 60}H1400`} stroke="#e7eefb" strokeWidth="4" strokeDasharray="34 30" opacity=".6" />

      <Lamp x={14} />
      <Lamp x={258} lit={false} />
      <Lamp x={500} />
      <Lamp x={778} />
      <Lamp x={1270} />

      <g className="scene-car">
        <rect x="-110" y="524" width="92" height="22" rx="7" fill="#22c55e" />
        <path d="M-94 524L-80 506H-46L-32 524Z" fill="#a7f3d0" />
        <circle cx="-88" cy="547" r="8" fill="#0a1226" />
        <circle cx="-40" cy="547" r="8" fill="#0a1226" />
      </g>

      <RoadWork />

      <Pin x={298} y={GROUND - 146} color="#f59e0b" label="Streetlight out">
        <path d="M0-52v9M0-36v.5" />
      </Pin>
      <Pin x={1098} y={500} color="#8b5cf6" label="Road repair" delay="-1.2s">
        <path d="M-6-38L5-49M1-50a6 6 0 0 1 6 6" />
      </Pin>
      <Pin x={636} y={GROUND - 94} color="#22c55e" label="Drainage fixed" delay="-2.4s">
        <path d="M-6-44l4 5 8-9" />
      </Pin>
    </svg>
  );
}

/** A quiet row of rooftops along the bottom of the sign-in form. */
export function RooftopStrip({ className }: { className?: string }) {
  const roofs = [[20, 60, 36], [96, 76, 48], [188, 56, 32], [262, 90, 56], [370, 62, 40], [450, 80, 50], [548, 58, 34], [622, 84, 54], [724, 60, 38]];

  return (
    <svg viewBox="0 0 800 90" preserveAspectRatio="xMidYMax slice" aria-hidden className={className}>
      {roofs.map(([x, w, h], index) => (
        <g key={x} fill={index % 2 ? "#cfe0fb" : "#c9ecd9"}>
          <rect x={x} y={90 - h} width={w} height={h} />
          <path d={`M${x - 7} ${90 - h}L${x + w / 2} ${90 - h - h * 0.5}L${x + w + 7} ${90 - h}Z`} />
        </g>
      ))}
    </svg>
  );
}
