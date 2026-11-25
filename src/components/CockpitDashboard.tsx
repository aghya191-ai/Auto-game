import { ArrowLeft, ArrowRight, Fuel, Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { HudSnapshot } from '../types/game';
import { toBn } from '../utils/bengaliDigits';
import { RickshawBorderStrip } from './StreetArtDecor';

interface CockpitDashboardProps {
  hud: HudSnapshot;
  showTouchControls: boolean;
  cleanMode?: boolean;
}

const SPEED_TICKS = [
  { val: 0, label: '০' },
  { val: 20, label: '২০' },
  { val: 40, label: '৪০' },
  { val: 60, label: '৬০' },
  { val: 80, label: '৮০' },
  { val: 100, label: '১০০' },
  { val: 120, label: '১২০' },
];

export function CockpitDashboard({ hud, showTouchControls, cleanMode = false }: CockpitDashboardProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hud.boosting && hud.steerDir === 0) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 100), 90);
    return () => clearInterval(id);
  }, [hud.boosting, hud.steerDir]);

  const jitter = hud.boosting ? (tick % 2 === 0 ? 1 : -1) * 2.8 : 0;
  const clampedSpeed = Math.min(125, Math.max(0, hud.speedKmh + jitter));
  const speedAngle = -125 + (Math.min(120, clampedSpeed) / 120) * 250;
  const gasAngle = -65 + (Math.max(0, Math.min(100, hud.gas)) / 100) * 130;
  const lowGas = hud.gas < 25;
  const indicatorBlinkOn = tick % 4 < 2;

  return (
    <div
      className={`pointer-events-none fixed left-1/2 z-20 -translate-x-1/2 ${
        showTouchControls ? 'bottom-40 sm:bottom-10' : 'bottom-10'
      }`}
    >
      <div className="flex flex-col items-center gap-1.5">
        {hud.aheadTrafficLight && (
          <div
            className={`sticker-chip flex items-center gap-2 rounded-xl px-3 py-1 text-xs font-black tabular-nums ${
              hud.aheadTrafficLight.state === 'red'
                ? 'bg-red-500 text-white'
                : hud.aheadTrafficLight.state === 'yellow'
                ? 'bg-yellow-300 text-stone-950'
                : 'bg-emerald-400 text-stone-950'
            }`}
          >
            <span
              className={`h-3 w-3 rounded-full border-2 border-stone-950 ${
                hud.aheadTrafficLight.state === 'red'
                  ? 'bg-red-700'
                  : hud.aheadTrafficLight.state === 'yellow'
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
            />
            <span>
              {hud.aheadTrafficLight.state === 'red'
                ? 'লাল বাতি — ব্রেক ধরুন!'
                : hud.aheadTrafficLight.state === 'yellow'
                ? 'হলুদ বাতি — থামার প্রস্তুতি'
                : 'সবুজ বাতি — চলুন'}
            </span>
            <span className="text-[11px] opacity-90">
              ({toBn(hud.aheadTrafficLight.dist)} মি · {toBn(hud.aheadTrafficLight.timeLeft)} সে)
            </span>
          </div>
        )}

        {/* Decorated Rickshaw-Art CNG Cockpit Instrument Hood */}
        <div className="sticker-panel overflow-hidden rounded-3xl bg-emerald-700 text-stone-950">
          <RickshawBorderStrip className="h-2.5" />
          <div className="flex items-center gap-2.5 px-3 py-2 sm:gap-4 sm:px-5 sm:py-2.5">
            {/* Analog Gas Gauge (Left) */}
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 110 86" className="h-16 w-20 sm:h-20 sm:w-24">
                <path
                  d="M 16 68 A 42 42 0 0 1 94 68"
                  fill="none"
                  stroke="#1c1917"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M 16 68 A 42 42 0 0 1 30 39"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 78 39 A 42 42 0 0 1 94 68"
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <text x="12" y="81" fill="#fecaca" fontSize="11" fontWeight="900">
                  E
                </text>
                <text x="91" y="81" fill="#fef08a" fontSize="11" fontWeight="900">
                  F
                </text>
                <text x="55" y="20" textAnchor="middle" fill="#fef08a" fontSize="10" fontWeight="900">
                  সিএনজি
                </text>
                <g transform={`translate(55, 66) rotate(${gasAngle})`}>
                  <polygon points="-2.5,0 0,-36 2.5,0" fill="#facc15" stroke="#1c1917" strokeWidth="1" />
                  <circle cx="0" cy="0" r="5" fill="#fef6df" stroke="#1c1917" strokeWidth="1.5" />
                </g>
              </svg>
              <div
                className={`flex items-center gap-1 rounded-lg border-2 border-stone-950 px-2 py-0.5 text-[10px] font-black ${
                  lowGas ? 'bg-red-500 text-white' : 'bg-yellow-300 text-stone-950'
                }`}
              >
                <Fuel className="h-3 w-3" />
                <span>{lowGas ? 'গ্যাস কম!' : `${toBn(hud.gas)}%`}</span>
              </div>
            </div>

            {/* Center Indicator Lamps + Odometer + National Damage */}
            <div className="flex flex-col items-center gap-1.5 border-x-[2.5px] border-stone-950 px-2.5 sm:px-4">
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 border-stone-950 ${
                    hud.steerDir === -1 && indicatorBlinkOn
                      ? 'bg-yellow-300 text-stone-950'
                      : 'bg-emerald-900 text-emerald-500'
                  }`}
                  title="বাম ইন্ডিকেটর"
                >
                  <ArrowLeft className="h-3.5 w-3.5 stroke-[2.8]" />
                </div>

                <div
                  className={`flex h-6 items-center gap-1 rounded-lg border-2 border-stone-950 px-1.5 text-[10px] font-black ${
                    hud.weather === 'foggy'
                      ? 'bg-yellow-300 text-stone-950'
                      : hud.weather === 'rainy'
                      ? 'bg-cyan-300 text-stone-950'
                      : 'bg-lime-300 text-stone-950'
                  }`}
                  title={hud.weather === 'sunny' ? 'হেডলাইট চালু' : 'ফগ লাইট চালু'}
                >
                  <Lightbulb className="h-3 w-3" />
                  <span className="hidden whitespace-nowrap sm:inline">
                    {hud.weather === 'sunny' ? 'লাইট' : 'ফগ লাইট'}
                  </span>
                </div>

                <div
                  className={`flex h-6 items-center gap-1 rounded-lg border-2 border-stone-950 px-1.5 text-[10px] font-black ${
                    lowGas ? 'bg-red-500 text-white' : 'bg-emerald-900 text-emerald-300'
                  }`}
                  title="লো-গ্যাস সতর্কতা"
                >
                  <span>গ্যাস</span>
                </div>

                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 border-stone-950 ${
                    hud.steerDir === 1 && indicatorBlinkOn
                      ? 'bg-yellow-300 text-stone-950'
                      : 'bg-emerald-900 text-emerald-500'
                  }`}
                  title="ডান ইন্ডিকেটর"
                >
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.8]" />
                </div>
              </div>

              <div className="w-full rounded-xl border-2 border-stone-950 bg-[#fef6df] px-2.5 py-1 text-center tabular-nums">
                <div className="text-[9px] font-black text-stone-700">ওডোমিটার</div>
                <div className="text-xs font-black tracking-wider text-emerald-800 sm:text-sm">
                  {toBn(hud.distanceMeters)} মি
                </div>
              </div>

              <div className="w-full rounded-xl border-2 border-stone-950 bg-red-500 px-2.5 py-0.5 text-center text-white tabular-nums">
                <span className="text-[9px] font-black text-yellow-200">জাতীয় ক্ষতি: </span>
                <span className="text-xs font-black">৳{toBn(hud.nationalDamage)}</span>
              </div>
            </div>

            {/* Analog Speedometer (Right) */}
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 130 105" className="h-20 w-24 sm:h-24 sm:w-28">
                <circle
                  cx="65"
                  cy="62"
                  r="48"
                  fill="#fef6df"
                  stroke="#1c1917"
                  strokeWidth="4"
                />
                <path
                  d="M 101 40 A 41 41 0 0 1 100 84"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="5"
                  strokeLinecap="round"
                />

                {SPEED_TICKS.map((t) => {
                  const deg = -125 + (t.val / 120) * 250;
                  const rad = ((deg - 90) * Math.PI) / 180;
                  const tx = 65 + Math.cos(rad) * 34;
                  const ty = 62 + Math.sin(rad) * 34;
                  const ox = 65 + Math.cos(rad) * 44;
                  const oy = 62 + Math.sin(rad) * 44;
                  const ix = 65 + Math.cos(rad) * 40;
                  const iy = 62 + Math.sin(rad) * 40;
                  return (
                    <g key={t.val}>
                      <line
                        x1={ix}
                        y1={iy}
                        x2={ox}
                        y2={oy}
                        stroke={t.val >= 100 ? '#dc2626' : '#1c1917'}
                        strokeWidth="2.2"
                      />
                      <text
                        x={tx}
                        y={ty + 3}
                        textAnchor="middle"
                        fill={t.val >= 100 ? '#dc2626' : '#1c1917'}
                        fontSize="8.5"
                        fontWeight="900"
                      >
                        {t.label}
                      </text>
                    </g>
                  );
                })}

                <text x="65" y="49" textAnchor="middle" fill="#44403c" fontSize="7.5" fontWeight="900">
                  কিমি/ঘণ্টা
                </text>

                <g transform={`translate(65, 62) rotate(${speedAngle})`}>
                  <polygon points="-2.5,6 0,-39 2.5,6" fill="#dc2626" stroke="#1c1917" strokeWidth="1" />
                  <circle cx="0" cy="0" r="5.5" fill="#facc15" stroke="#1c1917" strokeWidth="1.5" />
                </g>
              </svg>
              <div className="rounded-lg border-2 border-stone-950 bg-yellow-300 px-2 py-0.5 text-[11px] font-black text-stone-950 tabular-nums">
                {toBn(hud.speedKmh)} কিমি/ঘ{hud.boosting ? ' · বুস্ট!' : ''}
              </div>
            </div>
          </div>
        </div>

        {!cleanMode && (
          <div className="sticker-chip hidden rounded-lg bg-[#fef6df] px-2.5 py-0.5 text-[11px] font-black text-stone-950 sm:block">
            C: ভিউ বদল · V (ধরে রাখুন): পেছনে তাকান · মাউস/টাচ ড্র্যাগ: আশেপাশে দেখুন
          </div>
        )}
      </div>
    </div>
  );
}
