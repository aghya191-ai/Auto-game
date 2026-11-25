import {
  AlertTriangle,
  Award,
  Camera,
  CloudFog,
  CloudRain,
  Flame,
  Heart,
  Music,
  Navigation,
  Pause,
  Play,
  Radio,
  SkipForward,
  Smartphone,
  Star,
  Sun,
  Target,
  UserCheck,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { NEWS_TICKER_LINES } from '../config/chattogramData';
import type {
  DriverProgression,
  FloatingMoneyPopup,
  GameEventToast,
  GamePhase,
  HudSnapshot,
  RadioBroadcastClip,
} from '../types/game';
import { toBn } from '../utils/bengaliDigits';
import { RickshawBorderStrip } from './StreetArtDecor';

interface HUDProps {
  hud: HudSnapshot;
  totalTaka: number;
  driverProgression: DriverProgression;
  phase: GamePhase;
  muted: boolean;
  musicEnabled: boolean;
  radioEnabled: boolean;
  activeRadioClip: RadioBroadcastClip | null;
  floatingPopups: FloatingMoneyPopup[];
  comboCount: number;
  comboBurstKey: number;
  showTouchControls: boolean;
  areaBanner: { name: string; tagline: string; loopCount: number } | null;
  toasts: GameEventToast[];
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onToggleRadio: () => void;
  onNextRadioClip: () => void;
  onToggleCamera: () => void;
  onToggleWeather: () => void;
  onTogglePause: () => void;
  onToggleTouch: () => void;
  onOpenMissions: () => void;
}

export function HUD({
  hud,
  totalTaka,
  driverProgression,
  phase,
  muted,
  musicEnabled,
  radioEnabled,
  activeRadioClip,
  floatingPopups,
  comboCount,
  comboBurstKey,
  showTouchControls,
  areaBanner,
  toasts,
  onToggleMute,
  onToggleMusic,
  onToggleRadio,
  onNextRadioClip,
  onToggleCamera,
  onToggleWeather,
  onTogglePause,
  onToggleTouch,
  onOpenMissions,
}: HUDProps) {
  const isDriverView = hud.cameraMode === 'driver';
  const lowGas = hud.gas < 30;
  const lowHp = hud.hp < 35;

  const liveNewsItems = [
    ...(hud.chasedCount > 0
      ? [`ব্রেকিং: ${hud.areaName} এলাকায় রাস্তায় পথচারী ক্ষুব্ধ — ${toBn(hud.chasedCount)} জন সিএনজির পেছনে দৌড়াচ্ছে`]
      : []),
    ...(hud.wrongWay
      ? [`সতর্কতা: উল্টো পথে চলছে চট্টগ্রাম এক্সপ্রেস — জাতীয় ক্ষতির ঝুঁকি ×১.৫ গুণ!`]
      : []),
    ...(hud.weather === 'rainy'
      ? [`আবহাওয়া বার্তা: চট্টগ্রামে ঝুম বৃষ্টি — রাস্তা পিচ্ছিল, ব্রেকিং দূরত্ব বেড়েছে`]
      : hud.weather === 'foggy'
      ? [`আবহাওয়া বার্তা: ${hud.areaName} এলাকায় ঘন কুয়াশা — দৃশ্যমানতা কম, সাবধানে চালান`]
      : []),
    ...NEWS_TICKER_LINES,
  ];
  const tickerText = liveNewsItems.join('   ◆   ');

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between pb-8">
      {/* Top Bar Area */}
      <div className="flex items-start justify-between gap-2 p-2.5 sm:p-3.5">
        {/* Top-Left: Stylized Bangladeshi CNG Number Plate, Damage, Vitals, Combo & Chasing Banner */}
        <div className="flex max-w-[58vw] flex-col items-start gap-1.5 sm:max-w-xs">
          {/* Bangladeshi Green CNG Registration Number Plate for Money */}
          <div className="pointer-events-auto relative cng-plate -rotate-[0.8deg] rounded-xl bg-emerald-600 px-2.5 py-1.5 text-white tabular-nums">
            {/* Plate corner bolts */}
            <span className="absolute top-1 left-1 h-1.5 w-1.5 rounded-full border border-stone-950 bg-stone-200" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full border border-stone-950 bg-stone-200" />
            <div className="flex items-center gap-2 px-1 text-[10px] font-black text-yellow-200">
              <span>চট্ট-থ · এক্সপ্রেস</span>
              {!isDriverView && (
                <span className="rounded border border-stone-950 bg-yellow-300 px-1.5 py-0.2 text-[9px] text-stone-950">
                  জাতীয় ক্ষতি
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 px-1 text-xs font-black sm:text-sm">
              <span className="comic-money-stroke text-yellow-300">আজ ৳{toBn(hud.runTaka)}</span>
              <span className="h-3.5 w-[2px] bg-stone-950/60" />
              <span className="comic-text-stroke text-white">জমা ৳{toBn(totalTaka + hud.runTaka)}</span>
            </div>
          </div>

          {/* Big Stylized 3D Yellow-Gold National Damage Counter */}
          {!isDriverView && (
            <div className="damage-text-3d -mt-0.5 text-3xl font-black leading-none tracking-tight text-yellow-300 tabular-nums sm:text-4xl">
              ৳{toBn(hud.nationalDamage)}
            </div>
          )}

          {/* Area + HP + Speed + Wanted Sticker Strip */}
          <div className="pointer-events-auto sticker-chip rotate-[0.6deg] flex flex-wrap items-center gap-1.5 rounded-xl bg-[#fef6df] px-2.5 py-1 text-[11px] font-black text-stone-950">
            <span className="text-emerald-800">{hud.areaName}</span>
            <span className="text-stone-400">·</span>
            <span className="flex items-center gap-1 tabular-nums">
              <Heart
                className={`h-3.5 w-3.5 stroke-[2.6] ${
                  lowHp ? 'fill-red-500 text-red-700' : 'fill-emerald-500 text-emerald-700'
                }`}
              />
              <span className={lowHp ? 'text-red-700' : 'text-stone-950'}>{toBn(hud.hp)}</span>
            </span>
            {!isDriverView && (
              <>
                <span className="text-stone-400">·</span>
                <span className="text-orange-700 tabular-nums">
                  {toBn(hud.speedKmh)} কিমি/ঘ
                </span>
              </>
            )}
            {hud.wanted > 0 && (
              <>
                <span className="text-stone-400">·</span>
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-3.5 w-3.5 ${
                        n <= hud.wanted
                          ? 'fill-pink-500 text-stone-950'
                          : 'fill-stone-300 text-stone-500'
                      }`}
                    />
                  ))}
                </span>
              </>
            )}
          </div>

          {/* Driver Level Sticker Tag */}
          <div
            className="pointer-events-auto sticker-chip -rotate-[0.6deg] flex flex-col gap-1 rounded-xl bg-sky-300 px-2.5 py-1 text-stone-950 tabular-nums"
            title={
              driverProgression.next
                ? `পরবর্তী র‍্যাঙ্ক: ${driverProgression.next.title} (আরো ${toBn(driverProgression.pointsToNext)} পয়েন্ট)`
                : 'সর্বোচ্চ ড্রাইভার র‍্যাঙ্ক অর্জিত!'
            }
          >
            <div className="flex items-center gap-1.5 text-[11px] font-black whitespace-nowrap">
              <Award className="h-3.5 w-3.5 shrink-0 text-red-700 stroke-[2.5]" />
              <span>
                লেভেল {toBn(driverProgression.current.level)} · {driverProgression.current.title}
              </span>
              {driverProgression.next && (
                <span className="text-[10px] font-extrabold text-stone-800">
                  ({toBn(driverProgression.progressPct)}%)
                </span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full border border-stone-950 bg-white">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${Math.max(6, driverProgression.progressPct)}%` }}
              />
            </div>
          </div>

          {/* Combo Burst Badge */}
          {comboCount >= 2 && (
            <div
              key={comboBurstKey}
              className="animate-combo-burst sticker-chip rounded-xl bg-gradient-to-r from-pink-500 to-amber-400 px-3 py-1 text-xs font-black text-stone-950 tabular-nums"
            >
              <span className="inline-flex items-center gap-1">
                <Flame className="h-4 w-4 fill-yellow-200 text-stone-950" />
                <span>কম্বো ×{toBn(comboCount)} · দৌড় চলছে!</span>
              </span>
            </div>
          )}

          {/* Shaking "পাবলিক পিছে!" Banner when Angry Crowd is Chasing */}
          {hud.chasedCount > 0 && (
            <div className="animate-crowd-shake sticker-chip rounded-xl bg-red-600 px-3 py-1 text-xs font-black text-yellow-300 sm:text-sm">
              পাবলিক পিছে! ({toBn(hud.chasedCount)} জন ধাওয়া করছে!)
            </div>
          )}

          {/* Wrong-Way Sticker */}
          {hud.wrongWay && (
            <div className="sticker-chip rotate-1 rounded-xl bg-cyan-300 px-3 py-1 text-xs font-black text-stone-950">
              উল্টো পথ · ক্ষতি ×১.৫
            </div>
          )}

          {/* Red Blockade / Ahead Hazard Bar */}
          {hud.aheadHazard && (
            <div className="sticker-chip -rotate-1 flex items-center overflow-hidden rounded-xl bg-red-600 text-[11px] font-black text-white">
              <span className="flex items-center gap-1 px-2.5 py-1">
                <AlertTriangle className="h-3.5 w-3.5 fill-yellow-300 text-stone-950" />
                {hud.aheadHazard.label}
              </span>
              <span className="h-5 w-[2px] bg-stone-950" />
              <span className="px-2 py-1 text-yellow-200">{hud.aheadHazard.sub}</span>
              <span className="h-5 w-[2px] bg-stone-950" />
              <span className="bg-yellow-300 px-2.5 py-1 text-stone-950 tabular-nums">
                {toBn(hud.aheadHazard.dist)} মি
              </span>
            </div>
          )}

          {/* Traffic Signal Indicator Sticker */}
          {hud.aheadTrafficLight && (
            <div
              className={`sticker-chip flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-black tabular-nums ${
                hud.aheadTrafficLight.state === 'red'
                  ? 'bg-red-500 text-white'
                  : hud.aheadTrafficLight.state === 'yellow'
                  ? 'bg-yellow-300 text-stone-950'
                  : 'bg-emerald-400 text-stone-950'
              }`}
            >
              <div className="flex items-center gap-1 rounded-lg border-2 border-stone-950 bg-stone-900 px-1.5 py-1">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    hud.aheadTrafficLight.state === 'red' ? 'bg-red-500' : 'bg-red-950'
                  }`}
                />
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    hud.aheadTrafficLight.state === 'yellow' ? 'bg-amber-400' : 'bg-amber-950'
                  }`}
                />
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    hud.aheadTrafficLight.state === 'green' ? 'bg-emerald-400' : 'bg-emerald-950'
                  }`}
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span>
                  {hud.aheadTrafficLight.state === 'red'
                    ? 'লাল বাতি — থামুন!'
                    : hud.aheadTrafficLight.state === 'yellow'
                    ? 'হলুদ বাতি — সাবধান'
                    : 'সবুজ বাতি — চলুন'}
                </span>
                <span className="text-[10px] opacity-90">
                  সিগন্যাল {toBn(hud.aheadTrafficLight.dist)} মি · {toBn(hud.aheadTrafficLight.timeLeft)} সে
                </span>
              </div>
            </div>
          )}

          {/* Passenger / Gas Zone Prompt Stickers */}
          {hud.inGasZone && !isDriverView && (
            <div className="sticker-chip rounded-xl bg-yellow-300 px-2.5 py-1 text-xs font-black text-stone-950">
              দাগের ওপর থামেন, গ্যাস ভরছে!
            </div>
          )}
          {hud.passengerActive ? (
            <div className="sticker-chip flex items-center gap-1 rounded-xl bg-emerald-400 px-2.5 py-1 text-[11px] font-black text-stone-950 tabular-nums">
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
              <span>
                যাত্রী: {toBn(hud.passengerDistLeft)} মি বাকি (৳{toBn(hud.passengerFare)})
              </span>
            </div>
          ) : hud.passengerNearPickup ? (
            <div className="sticker-chip rounded-xl bg-cyan-300 px-2.5 py-1 text-[11px] font-black text-stone-950">
              পাশে যাত্রী হাত দেখাচ্ছে — থেমে তুলুন!
            </div>
          ) : null}
        </div>

        {/* Top-Right: Chunky Street-Art Utility Buttons + Gas Plate + Radar */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onToggleWeather}
              className={`comic-btn-sm flex h-9 items-center gap-1 rounded-xl px-2.5 text-[11px] font-black text-stone-950 ${
                hud.weather === 'rainy'
                  ? 'bg-cyan-300'
                  : hud.weather === 'foggy'
                  ? 'bg-stone-200'
                  : 'bg-yellow-300'
              }`}
              title="আবহাওয়া বদলান (T)"
            >
              {hud.weather === 'rainy' ? (
                <CloudRain className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
              ) : hud.weather === 'foggy' ? (
                <CloudFog className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
              ) : (
                <Sun className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
              )}
              <span className="whitespace-nowrap">
                {hud.weather === 'rainy' ? 'বৃষ্টি' : hud.weather === 'foggy' ? 'কুয়াশা' : 'রোদ'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleCamera}
              className={`comic-btn-sm flex h-9 items-center gap-1 rounded-xl px-2.5 text-[11px] font-black text-stone-950 ${
                isDriverView ? 'bg-pink-400' : 'bg-sky-300'
              }`}
              title="ক্যামেরা ভিউ বদলান (C)"
            >
              <Camera className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline whitespace-nowrap">
                {isDriverView ? 'ড্রাইভার ভিউ' : 'বাইরের ভিউ'}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenMissions}
              className="comic-btn-sm flex h-9 w-9 items-center justify-center rounded-xl bg-orange-400 text-stone-950"
              title="দৈনিক ৩টি মিশন"
            >
              <Target className="h-4 w-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={onToggleTouch}
              className={`comic-btn-sm flex h-9 w-9 items-center justify-center rounded-xl text-stone-950 ${
                showTouchControls ? 'bg-lime-400' : 'bg-stone-200'
              }`}
              title="টাচ বাটন চালু/বন্ধ"
            >
              <Smartphone className="h-4 w-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={onToggleMusic}
              className={`comic-btn-sm flex h-9 w-9 items-center justify-center rounded-xl text-stone-950 ${
                musicEnabled && !muted ? 'bg-pink-400' : 'bg-stone-200'
              }`}
              title="ব্যাকগ্রাউন্ড মিউজিক চালু/বন্ধ"
            >
              <Music className="h-4 w-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={onToggleRadio}
              className={`comic-btn-sm flex h-9 w-9 items-center justify-center rounded-xl text-stone-950 ${
                radioEnabled && !muted ? 'bg-cyan-400' : 'bg-stone-200'
              }`}
              title="চাঁটগাঁ এফএম রেডিও চালু/বন্ধ (R)"
            >
              <Radio className="h-4 w-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className={`comic-btn-sm flex h-9 w-9 items-center justify-center rounded-xl ${
                muted ? 'bg-red-500 text-white' : 'bg-emerald-400 text-stone-950'
              }`}
              title={muted ? 'সাউন্ড চালু' : 'সাউন্ড বন্ধ'}
            >
              {muted ? (
                <VolumeX className="h-4 w-4 stroke-[2.5]" />
              ) : (
                <Volume2 className="h-4 w-4 stroke-[2.5]" />
              )}
            </button>

            <button
              type="button"
              onClick={onTogglePause}
              className="comic-btn-sm flex h-9 w-9 items-center justify-center rounded-xl bg-[#fef6df] text-stone-950"
              title={phase === 'paused' ? 'চালু করো' : 'বিরতি'}
            >
              {phase === 'paused' ? (
                <Play className="h-4 w-4 stroke-[2.6]" />
              ) : (
                <Pause className="h-4 w-4 stroke-[2.6]" />
              )}
            </button>

            {/* Gas / Charge Plate */}
            {!isDriverView && (
              <div
                className={`cng-plate relative flex h-9 min-w-[92px] items-center justify-center overflow-hidden rounded-xl bg-stone-900 px-3 tabular-nums ${
                  lowGas ? 'border-red-500' : ''
                }`}
              >
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-100 ${
                    lowGas ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.max(4, hud.gas)}%` }}
                />
                <span className="comic-text-stroke relative z-10 flex items-center gap-1 text-sm font-black text-white">
                  <Zap className="h-3.5 w-3.5 fill-yellow-300 text-stone-950" />
                  {toBn(Math.round(hud.gas))}%
                </span>
              </div>
            )}
          </div>

          {!isDriverView && lowGas && (
            <div className="sticker-chip -rotate-1 rounded-xl bg-yellow-300 px-3 py-0.5 text-[11px] font-black text-red-700">
              দাগে থামেন — গ্যাস শেষ!
            </div>
          )}

          {/* Circular Minimap Radar with Bold Ink Border */}
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-[3.5px] border-stone-950 bg-stone-900 shadow-[4px_4px_0_#1c1917] sm:h-28 sm:w-28">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <rect x="33" y="0" width="34" height="100" fill="#292524" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="#facc15" strokeWidth="1.8" />
              <rect x="0" y="42" width="100" height="10" fill="#3f3f46" opacity="0.7" />

              {hud.radarEntities.map((ent, idx) => {
                const px = 50 + Math.max(-36, Math.min(36, ent.dx * 2.2));
                const py = 62 + Math.max(-54, Math.min(32, ent.dz * 0.55));
                if (ent.kind === 'gas') {
                  return (
                    <g key={idx} transform={`translate(${px}, ${py})`}>
                      <circle r="5.5" fill="#facc15" stroke="#1c1917" strokeWidth="1.2" />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        fontSize="6"
                        fontWeight="900"
                        fill="#1c1917"
                      >
                        ⚡
                      </text>
                    </g>
                  );
                }
                if (
                  ent.kind === 'light_red' ||
                  ent.kind === 'light_yellow' ||
                  ent.kind === 'light_green'
                ) {
                  const sigColor =
                    ent.kind === 'light_red'
                      ? '#ef4444'
                      : ent.kind === 'light_yellow'
                      ? '#facc15'
                      : '#22c55e';
                  return (
                    <g key={idx}>
                      <line x1="33" y1={py} x2="67" y2={py} stroke={sigColor} strokeWidth="2.4" />
                      <circle
                        cx="69"
                        cy={py}
                        r="3"
                        fill={sigColor}
                        stroke="#1c1917"
                        strokeWidth="1"
                      />
                    </g>
                  );
                }
                if (ent.kind === 'bribe') {
                  return (
                    <circle
                      key={idx}
                      cx={px}
                      cy={py}
                      r="4.5"
                      fill="#ec4899"
                      stroke="#1c1917"
                      strokeWidth="1"
                    />
                  );
                }
                if (ent.kind === 'pickup' || ent.kind === 'dropoff') {
                  return (
                    <circle
                      key={idx}
                      cx={px}
                      cy={py}
                      r="4"
                      fill="#22d3ee"
                      stroke="#1c1917"
                      strokeWidth="1"
                    />
                  );
                }
                const w = ent.kind === 'bus' || ent.kind === 'truck' ? 4.4 : 3.2;
                const h = ent.kind === 'bus' || ent.kind === 'truck' ? 7 : 4.6;
                const fill =
                  ent.kind === 'bus'
                    ? '#ef4444'
                    : ent.kind === 'truck'
                    ? '#f97316'
                    : '#fbbf24';
                return (
                  <rect
                    key={idx}
                    x={px - w / 2}
                    y={py - h / 2}
                    width={w}
                    height={h}
                    rx="1"
                    fill={fill}
                    stroke="#1c1917"
                    strokeWidth="0.6"
                  />
                );
              })}

              <polygon
                points="50,55 45,67 50,64 55,67"
                fill="#f472b6"
                stroke="#ffffff"
                strokeWidth="1.3"
              />
            </svg>
          </div>

          {hud.nearestGasDist !== null && (
            <div className="sticker-chip flex items-center gap-1 rounded-xl bg-yellow-300 px-2.5 py-0.5 text-[11px] font-black text-stone-950 tabular-nums">
              <Navigation
                className={`h-3 w-3 text-red-600 ${hud.nearestGasAhead ? '' : 'rotate-180'}`}
              />
              <Zap className="h-3 w-3 fill-orange-500 text-stone-950" />
              <span>
                {toBn(hud.nearestGasDist)} মি {hud.nearestGasAhead ? 'সামনে' : 'পিছনে'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating +৳৫০০ / Damage Wobble Popups */}
      <div className="pointer-events-none fixed left-1/2 top-44 z-30">
        {floatingPopups.map((popup) => (
          <div
            key={popup.id}
            className="animate-float-wobble absolute top-0 whitespace-nowrap tabular-nums"
            style={{ left: `${popup.offsetX}px` }}
          >
            <span
              className={`inline-block rounded-xl border-[2.5px] border-stone-950 px-3 py-1 text-lg font-black shadow-[3px_3px_0_#1c1917] sm:text-xl ${
                popup.tone === 'gain'
                  ? 'bg-yellow-300 text-emerald-800'
                  : 'bg-red-500 text-yellow-200'
              }`}
            >
              {popup.text}
            </span>
          </div>
        ))}
      </div>

      {/* Center Area Entry Street-Art Poster Banner, Event Toasts & Radio On-Air Card */}
      <div className="pointer-events-none fixed left-1/2 top-24 z-20 flex w-[92vw] max-w-md -translate-x-1/2 flex-col items-center gap-2 sm:top-20">
        {areaBanner && (
          <div className="sticker-panel w-full -rotate-[0.6deg] overflow-hidden rounded-2xl bg-[#fef6df] text-center text-stone-950">
            <RickshawBorderStrip />
            <div className="px-4 py-2.5">
              <div className="inline-block rounded-lg border-2 border-stone-950 bg-emerald-400 px-2.5 py-0.5 text-[11px] font-black text-stone-950">
                এলাকা প্রবেশ · লুপ #{toBn(areaBanner.loopCount)}
              </div>
              <div className="comic-text-stroke mt-1 text-3xl font-black text-yellow-300">
                {areaBanner.name}
              </div>
              <div className="text-xs font-extrabold text-stone-800">{areaBanner.tagline}</div>
            </div>
          </div>
        )}

        {toasts.map((toast, idx) => {
          const colorCls =
            toast.tone === 'danger'
              ? 'bg-red-500 text-yellow-200'
              : toast.tone === 'warning'
              ? 'bg-yellow-300 text-stone-950'
              : toast.tone === 'pink'
              ? 'bg-pink-400 text-stone-950'
              : 'bg-emerald-400 text-stone-950';
          return (
            <div
              key={toast.id}
              className={`sticker-chip rounded-xl px-3.5 py-1.5 text-center text-xs font-black sm:text-sm ${
                idx % 2 === 0 ? '-rotate-1' : 'rotate-1'
              } ${colorCls}`}
            >
              {toast.text}
            </div>
          );
        })}

        {/* Chattogram FM 99.8 Torn-Paper On-Air Card */}
        {radioEnabled && activeRadioClip && (
          <div className="pointer-events-auto sticker-panel paper-torn w-full rotate-[0.5deg] overflow-hidden rounded-2xl text-left text-stone-950">
            <div className="flex items-center justify-between gap-2 bg-cyan-400 px-3 py-1 border-b-2 border-stone-950">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-stone-950 whitespace-nowrap">
                <Radio className="h-3.5 w-3.5 shrink-0 stroke-[2.6]" />
                <span>{activeRadioClip.station}</span>
                <span className="rounded-md border-2 border-stone-950 bg-yellow-300 px-1.5 py-0.2 text-[10px] font-black">
                  {activeRadioClip.kind}
                </span>
                <span className="text-[10px] font-extrabold text-stone-900">
                  · {activeRadioClip.areaName}
                </span>
              </div>
              <button
                type="button"
                onClick={onNextRadioClip}
                title="পরবর্তী রেডিও সংবাদ/মন্তব্য"
                className="comic-btn-sm flex h-6 items-center gap-1 rounded-lg bg-orange-400 px-2 text-[10px] font-black text-stone-950 whitespace-nowrap"
              >
                <SkipForward className="h-3 w-3" />
                <span>পরেরটি</span>
              </button>
            </div>
            <p className="px-3 py-2 text-xs font-extrabold leading-snug text-stone-950">
              {activeRadioClip.text}
            </p>
          </div>
        )}
      </div>

      {/* Desktop Keyboard Hint above Ticker (External View) */}
      {!showTouchControls && phase === 'playing' && !isDriverView && (
        <div className="sticker-chip mx-auto mb-1.5 hidden rounded-xl bg-[#fef6df] px-3 py-1 text-xs font-black text-stone-950 md:block">
          W/A/S/D বা তীর: চালানো · Shift: বুস্ট · H: হর্ন · B: শব্দবোমা · C: ক্যামেরা · T: আবহাওয়া · R: রেডিও · V: পেছনে
        </div>
      )}

      {/* Bottom Live Breaking News Street Ticker */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex h-8 items-center overflow-hidden border-t-[3px] border-stone-950 bg-blue-900">
        <div className="z-10 flex h-full shrink-0 items-center border-r-[3px] border-stone-950 bg-orange-400 px-3 text-xs font-black text-stone-950">
          সর্বশেষ
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="animate-ticker whitespace-nowrap text-xs font-black text-yellow-200">
            <span className="pr-12">{tickerText}</span>
            <span className="pr-12">{tickerText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
