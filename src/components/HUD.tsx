import {
  AlertTriangle,
  Camera,
  CloudRain,
  Eye,
  EyeOff,
  Flame,
  Gauge,
  Heart,
  Menu,
  Music,
  Navigation,
  Pause,
  Play,
  Radio,
  SkipForward,
  Smartphone,
  Star,
  Sun,
  Sunset,
  Target,
  UserCheck,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { NEWS_TICKER_LINES, RANDOM_EVENTS } from '../config/chattogramData';
import type {
  DriverProgression,
  FloatingMoneyPopup,
  GameEventToast,
  GamePhase,
  HudSnapshot,
  RadioBroadcastClip,
} from '../types/game';
import { toBn } from '../utils/bengaliDigits';

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
  cleanMode: boolean;
  areaBanner: { name: string; tagline: string; loopCount: number } | null;
  activeToast: GameEventToast | null;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onToggleRadio: () => void;
  onNextRadioClip: () => void;
  onToggleCamera: () => void;
  onToggleAtmosphere: () => void;
  onToggleGraphics: () => void;
  onTogglePause: () => void;
  onToggleTouch: () => void;
  onToggleCleanMode: () => void;
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
  cleanMode,
  areaBanner,
  activeToast,
  onToggleMute,
  onToggleMusic,
  onToggleRadio,
  onNextRadioClip,
  onToggleCamera,
  onToggleAtmosphere,
  onToggleGraphics,
  onTogglePause,
  onToggleTouch,
  onToggleCleanMode,
  onOpenMissions,
}: HUDProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isDriverView = hud.cameraMode === 'driver';
  const lowGas = hud.gas < 30;
  const lowHp = hud.hp < 35;

  const liveNewsItems = [
    ...(radioEnabled && activeRadioClip
      ? [`📻 ${activeRadioClip.station} (${activeRadioClip.kind} · ${activeRadioClip.areaName}): ${activeRadioClip.text}`]
      : []),
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

  // Single top-center pill priority: urgent activeToast overrides areaBanner; otherwise show areaBanner or activeToast
  const showToastInsteadOfBanner = Boolean(
    activeToast && (activeToast.priority === 'gameover' || activeToast.priority === 'crash')
  );
  const topPillMode: 'toast' | 'area' | null = showToastInsteadOfBanner
    ? 'toast'
    : areaBanner
    ? 'area'
    : activeToast
    ? 'toast'
    : null;

  const toastToneCls =
    activeToast?.tone === 'danger'
      ? 'bg-red-500/85 text-yellow-200'
      : activeToast?.tone === 'warning'
      ? 'bg-yellow-300/85 text-stone-950'
      : activeToast?.tone === 'pink'
      ? 'bg-pink-400/85 text-stone-950'
      : activeToast?.tone === 'info'
      ? 'bg-cyan-300/85 text-stone-950'
      : 'bg-emerald-400/85 text-stone-950';

  return (
    <div className={`pointer-events-none fixed inset-0 z-10 flex flex-col justify-between ${cleanMode ? 'pb-2' : 'pb-7'}`}>
      {/* Top Bar Area */}
      <div className="flex items-start justify-between gap-2 p-2 sm:p-3">
        {/* Top-Left HUD */}
        {cleanMode ? (
          <div className="pointer-events-auto cng-plate -rotate-[0.6deg] rounded-xl bg-yellow-300 px-3 py-1 text-stone-950 tabular-nums">
            <span className="text-base font-black sm:text-lg">
              {toBn(hud.speedKmh)} <span className="text-[11px]">কিমি/ঘ</span>
            </span>
          </div>
        ) : (
          <div className="flex max-w-[60vw] flex-col items-start gap-1 sm:max-w-xs">
            {/* Compact Money & Loss Panel + Combo Badge Beside It */}
            <div className="flex items-center gap-1.5">
              <div className="pointer-events-auto relative cng-plate -rotate-[0.6deg] rounded-xl bg-emerald-600 px-2.5 py-1 text-white tabular-nums">
                <div className="flex items-center gap-1.5 text-[10px] font-black leading-tight sm:text-[11px]">
                  <span className="comic-money-stroke text-yellow-300">আজ ৳{toBn(hud.runTaka)}</span>
                  <span className="text-stone-950/70">·</span>
                  <span className="comic-text-stroke text-white">জমা ৳{toBn(totalTaka + hud.runTaka)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 leading-none">
                  <span className="rounded border border-stone-950 bg-yellow-300 px-1 py-0.2 text-[9px] font-black text-stone-950">
                    ক্ষতি
                  </span>
                  <span className="damage-text-3d text-base font-black text-yellow-300 sm:text-lg">
                    ৳{toBn(hud.nationalDamage)}
                  </span>
                </div>
              </div>

              {comboCount >= 2 && (
                <div
                  key={comboBurstKey}
                  className="animate-combo-burst sticker-chip shrink-0 rounded-xl bg-gradient-to-r from-pink-500 to-amber-400 px-2 py-1 text-[11px] font-black text-stone-950 tabular-nums whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-0.5">
                    <Flame className="h-3.5 w-3.5 fill-yellow-200 text-stone-950" />
                    <span>×{toBn(comboCount)}</span>
                  </span>
                </div>
              )}
            </div>

            {isDriverView ? (
              hud.chasedCount > 0 ? (
                <div className="animate-crowd-shake sticker-chip rounded-lg bg-red-600/95 px-2 py-0.5 text-[10px] font-black text-yellow-300">
                  পাবলিক পিছে! ({toBn(hud.chasedCount)})
                </div>
              ) : hud.aheadTrafficLight?.state === 'red' ? (
                <div className="sticker-chip flex items-center gap-1 rounded-lg bg-red-500/95 px-2 py-0.5 text-[10px] font-black text-white tabular-nums">
                  <span className="h-2 w-2 rounded-full border border-stone-950 bg-red-700" />
                  <span>লাল বাতি · {toBn(hud.aheadTrafficLight.dist)} মি</span>
                </div>
              ) : hud.aheadHazard ? (
                <div className="sticker-chip flex items-center gap-1 rounded-lg bg-red-600/95 px-2 py-0.5 text-[10px] font-black text-white tabular-nums">
                  <AlertTriangle className="h-3 w-3 shrink-0 fill-yellow-300 text-stone-950" />
                  <span>
                    {hud.aheadHazard.label} · {toBn(hud.aheadHazard.dist)} মি
                  </span>
                </div>
              ) : hud.wrongWay ? (
                <div className="sticker-chip rounded-lg bg-cyan-300/95 px-2 py-0.5 text-[10px] font-black text-stone-950">
                  উল্টো পথ · ×১.৫
                </div>
              ) : hud.passengerActive ? (
                <div className="sticker-chip flex items-center gap-1 rounded-lg bg-emerald-400/95 px-2 py-0.5 text-[10px] font-black text-stone-950 tabular-nums">
                  <UserCheck className="h-3 w-3 shrink-0" />
                  <span>
                    যাত্রী{hud.passengerDestination ? ` → ${hud.passengerDestination}` : ''} ·{' '}
                    {toBn(hud.passengerDistLeft)} মি
                  </span>
                </div>
              ) : hud.passengerNearPickup ? (
                <div className="sticker-chip rounded-lg bg-cyan-300/95 px-2 py-0.5 text-[10px] font-black text-stone-950">
                  যাত্রী তুলুন
                </div>
              ) : null
            ) : (
              <>
                {/* Single Slim Vitals + Rank Chip */}
                <div className="pointer-events-auto sticker-chip rotate-[0.4deg] flex flex-wrap items-center gap-1.5 rounded-lg bg-[#fef6df]/95 px-2 py-0.5 text-[10px] font-black text-stone-950">
                  <span className="text-emerald-800">{hud.areaName}</span>
                  <span className="text-stone-400">·</span>
                  <span className="flex items-center gap-0.5 tabular-nums">
                    <Heart
                      className={`h-3 w-3 stroke-[2.6] ${
                        lowHp ? 'fill-red-500 text-red-700' : 'fill-emerald-500 text-emerald-700'
                      }`}
                    />
                    <span className={lowHp ? 'text-red-700' : 'text-stone-950'}>{toBn(hud.hp)}</span>
                  </span>
                  <span className="text-stone-400">·</span>
                  <span className="text-orange-700 tabular-nums">{toBn(hud.speedKmh)} কিমি/ঘ</span>
                  <span className="text-stone-400">·</span>
                  <span className="text-sky-800 tabular-nums">লে.{toBn(driverProgression.current.level)}</span>
                  {hud.wanted > 0 && (
                    <>
                      <span className="text-stone-400">·</span>
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-2.5 w-2.5 ${
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

                {/* Compact Conditional Alerts (never crowding center 60%) */}
                {hud.chasedCount > 0 && (
                  <div className="animate-crowd-shake sticker-chip rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-black text-yellow-300">
                    পাবলিক পিছে! ({toBn(hud.chasedCount)})
                  </div>
                )}

                {hud.wrongWay && (
                  <div className="sticker-chip rotate-1 rounded-lg bg-cyan-300 px-2 py-0.5 text-[10px] font-black text-stone-950">
                    উল্টো পথ · ×১.৫
                  </div>
                )}

                {hud.aheadHazard && (
                  <div className="sticker-chip -rotate-1 flex items-center gap-1 rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-black text-white tabular-nums">
                    <AlertTriangle className="h-3 w-3 shrink-0 fill-yellow-300 text-stone-950" />
                    <span>{hud.aheadHazard.label}</span>
                    <span className="rounded bg-yellow-300 px-1 text-stone-950">{toBn(hud.aheadHazard.dist)} মি</span>
                  </div>
                )}

                {hud.aheadTrafficLight && (
                  <div
                    className={`sticker-chip flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-black tabular-nums ${
                      hud.aheadTrafficLight.state === 'red'
                        ? 'bg-red-500 text-white'
                        : hud.aheadTrafficLight.state === 'yellow'
                        ? 'bg-yellow-300 text-stone-950'
                        : 'bg-emerald-400 text-stone-950'
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full border border-stone-950 ${
                        hud.aheadTrafficLight.state === 'red'
                          ? 'bg-red-700'
                          : hud.aheadTrafficLight.state === 'yellow'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span>
                      {hud.aheadTrafficLight.state === 'red'
                        ? 'লাল বাতি'
                        : hud.aheadTrafficLight.state === 'yellow'
                        ? 'হলুদ বাতি'
                        : 'সবুজ বাতি'}
                    </span>
                    <span>
                      {toBn(hud.aheadTrafficLight.dist)} মি · {toBn(hud.aheadTrafficLight.timeLeft)} সে
                    </span>
                  </div>
                )}

                {hud.inGasZone && (
                  <div className="sticker-chip rounded-lg bg-yellow-300 px-2 py-0.5 text-[10px] font-black text-stone-950">
                    দাগের ওপর থামেন, গ্যাস ভরছে!
                  </div>
                )}

                {hud.passengerActive ? (
                  <div className="sticker-chip flex items-center gap-1 rounded-lg bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-stone-950 tabular-nums">
                    <UserCheck className="h-3 w-3 shrink-0" />
                    <span>
                      যাত্রী{hud.passengerDestination ? ` → ${hud.passengerDestination}` : ''} ·{' '}
                      {toBn(hud.passengerDistLeft)} মি (৳{toBn(hud.passengerFare)})
                    </span>
                  </div>
                ) : hud.passengerNearPickup ? (
                  <div className="sticker-chip rounded-lg bg-cyan-300 px-2 py-0.5 text-[10px] font-black text-stone-950">
                    যাত্রী হাত দেখাচ্ছে — থেমে তুলুন!
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {/* Top-Right: Single Round Expandable Menu Button + Compact Gas + Small Minimap */}
        <div className="relative flex flex-col items-end gap-1.5">
          <div className="pointer-events-auto flex items-center justify-end gap-1.5">
            {!cleanMode && (
              <div
                className={`cng-plate relative flex h-8 min-w-[74px] items-center justify-center overflow-hidden rounded-xl bg-stone-900 px-2 tabular-nums ${
                  lowGas ? 'border-red-500' : ''
                }`}
              >
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-100 ${
                    lowGas ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.max(4, hud.gas)}%` }}
                />
                <span className="comic-text-stroke relative z-10 flex items-center gap-0.5 text-xs font-black text-white">
                  <Zap className="h-3 w-3 fill-yellow-300 text-stone-950" />
                  {toBn(Math.round(hud.gas))}%
                </span>
              </div>
            )}

            {/* ONE Round Menu Button */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="মেনু"
              title="মেনু ও সেটিংস"
              className={`comic-btn-sm flex h-10 w-10 items-center justify-center rounded-full ${
                menuOpen ? 'bg-orange-400 text-stone-950' : 'bg-[#fef6df] text-stone-950'
              }`}
            >
              {menuOpen ? <X className="h-5 w-5 stroke-[2.8]" /> : <Menu className="h-5 w-5 stroke-[2.8]" />}
            </button>
          </div>

          {/* Expandable Compact Menu Popover */}
          {menuOpen && (
            <div className="pointer-events-auto sticker-panel absolute top-11 right-0 z-40 grid w-56 grid-cols-2 gap-1.5 rounded-2xl bg-[#fef6df] p-2 text-stone-950">
              <button
                type="button"
                onClick={() => {
                  onTogglePause();
                  setMenuOpen(false);
                }}
                className="comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl bg-amber-300 px-2 text-[11px] font-black whitespace-nowrap"
              >
                {phase === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                <span>{phase === 'paused' ? 'চালু' : 'বিরতি'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleCleanMode();
                  setMenuOpen(false);
                }}
                className={`comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-black whitespace-nowrap ${
                  cleanMode ? 'bg-cyan-400' : 'bg-stone-200'
                }`}
              >
                {cleanMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>ক্লিন মোড</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleCamera();
                  setMenuOpen(false);
                }}
                className={`comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-black whitespace-nowrap ${
                  isDriverView ? 'bg-pink-400' : 'bg-sky-300'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{isDriverView ? 'ড্রাইভার' : 'বাইরের ভিউ'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleAtmosphere}
                className={`comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-black whitespace-nowrap ${
                  hud.atmosphereMode === 'rain'
                    ? 'bg-cyan-300'
                    : hud.atmosphereMode === 'evening'
                    ? 'bg-orange-400'
                    : 'bg-yellow-300'
                }`}
              >
                {hud.atmosphereMode === 'rain' ? (
                  <CloudRain className="h-3.5 w-3.5" />
                ) : hud.atmosphereMode === 'evening' ? (
                  <Sunset className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
                <span>
                  {hud.atmosphereMode === 'rain'
                    ? 'বৃষ্টি'
                    : hud.atmosphereMode === 'evening'
                    ? 'সন্ধ্যা'
                    : 'দিন'}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                className={`comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-black whitespace-nowrap ${
                  muted ? 'bg-red-500 text-white' : 'bg-emerald-400 text-stone-950'
                }`}
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{muted ? 'মিউট' : 'সাউন্ড'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleMusic}
                className={`comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-black whitespace-nowrap ${
                  musicEnabled && !muted ? 'bg-pink-400' : 'bg-stone-200'
                }`}
              >
                <Music className="h-3.5 w-3.5" />
                <span>মিউজিক</span>
              </button>

              <button
                type="button"
                onClick={onToggleRadio}
                className={`comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-black whitespace-nowrap ${
                  radioEnabled && !muted ? 'bg-cyan-400' : 'bg-stone-200'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                <span>এফএম রেডিও</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNextRadioClip();
                  setMenuOpen(false);
                }}
                disabled={!radioEnabled}
                className="comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl bg-orange-400 px-2 text-[11px] font-black whitespace-nowrap disabled:opacity-50"
              >
                <SkipForward className="h-3.5 w-3.5" />
                <span>পরের খবর</span>
              </button>

              <button
                type="button"
                onClick={onToggleTouch}
                className={`comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-black whitespace-nowrap ${
                  showTouchControls ? 'bg-lime-400' : 'bg-stone-200'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>টাচ বাটন</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenMissions();
                }}
                className="comic-btn-sm flex h-8 items-center justify-center gap-1 rounded-xl bg-orange-300 px-2 text-[11px] font-black whitespace-nowrap"
              >
                <Target className="h-3.5 w-3.5" />
                <span>মিশন</span>
              </button>

              <button
                type="button"
                onClick={onToggleGraphics}
                className={`comic-btn-sm col-span-2 flex h-8 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-black whitespace-nowrap ${
                  hud.graphicsQuality === 'high' ? 'bg-emerald-300' : 'bg-stone-200'
                }`}
              >
                <Gauge className="h-3.5 w-3.5" />
                <span>
                  গ্রাফিক্স: {hud.graphicsQuality === 'high' ? 'উচ্চ (High)' : 'নিম্ন (Low)'}
                </span>
              </button>
            </div>
          )}

          {/* Small Circular Minimap Radar */}
          <div className="relative h-16 w-16 overflow-hidden rounded-full border-[3px] border-stone-950 bg-stone-900 shadow-[3px_3px_0_#1c1917] sm:h-20 sm:w-20">
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
                if (ent.kind === 'hazard') {
                  return (
                    <polygon
                      key={idx}
                      points={`${px},${py - 4.5} ${px + 4.5},${py} ${px},${py + 4.5} ${px - 4.5},${py}`}
                      fill="#f97316"
                      stroke="#fef08a"
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

          {!cleanMode && hud.nearestGasDist !== null && (
            <div className="sticker-chip flex items-center gap-0.5 rounded-lg bg-yellow-300/95 px-2 py-0.5 text-[10px] font-black text-stone-950 tabular-nums">
              <Navigation
                className={`h-2.5 w-2.5 text-red-600 ${hud.nearestGasAhead ? '' : 'rotate-180'}`}
              />
              <Zap className="h-2.5 w-2.5 fill-orange-500 text-stone-950" />
              <span>
                {toBn(hud.nearestGasDist)} মি {hud.nearestGasAhead ? 'সামনে' : 'পিছনে'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating +৳৫০০ / Damage Wobble Popups positioned near top-left so center road stays clear */}
      {!cleanMode && (
        <div className="pointer-events-none fixed left-20 top-20 z-30 sm:left-28 sm:top-20">
          {floatingPopups.map((popup) => (
            <div
              key={popup.id}
              className="animate-float-wobble absolute top-0 whitespace-nowrap tabular-nums"
              style={{ left: `${popup.offsetX}px` }}
            >
              <span
                className={`inline-block rounded-lg border-2 border-stone-950 px-2.5 py-0.5 text-sm font-black shadow-[2px_2px_0_#1c1917] sm:text-base ${
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
      )}

      {/* TOP-CENTER Single Small Pill Slot (max ~44px tall, semi-transparent, auto-hides) */}
      {!cleanMode && (topPillMode || hud.activeEvent) && (
        <div className="pointer-events-none fixed left-1/2 top-14 z-20 flex w-[84vw] max-w-sm -translate-x-1/2 justify-center sm:top-3">
          {topPillMode === 'toast' && activeToast ? (
            <div
              key={activeToast.id}
              className={`animate-toast-pop flex max-h-[44px] max-w-full items-center gap-1.5 truncate rounded-full border-2 border-stone-950 px-3.5 py-1 text-center text-xs font-black shadow-[2px_2px_0_#1c1917] ${toastToneCls}`}
            >
              <span className="truncate">{activeToast.text}</span>
            </div>
          ) : topPillMode === 'area' && areaBanner ? (
            <div
              key={`${areaBanner.name}-${areaBanner.loopCount}`}
              className="animate-toast-pop flex max-h-[44px] max-w-full items-center gap-1.5 rounded-full border-2 border-stone-950 bg-[#fef6df]/90 px-3.5 py-1 text-xs font-black text-stone-950 shadow-[2px_2px_0_#1c1917] whitespace-nowrap"
            >
              <span className="text-emerald-700">এলাকা:</span>
              <span className="truncate">{areaBanner.name}</span>
              <span className="rounded-full border border-stone-950 bg-yellow-300 px-1.5 py-0.2 text-[10px] font-black tabular-nums">
                লুপ #{toBn(areaBanner.loopCount)}
              </span>
            </div>
          ) : hud.activeEvent ? (
            <div
              key={hud.activeEvent.kind}
              className={`flex max-h-[38px] max-w-full items-center gap-1.5 rounded-full border-2 border-stone-950 px-3 py-0.5 text-[11px] font-black shadow-[2px_2px_0_#1c1917] whitespace-nowrap tabular-nums ${
                RANDOM_EVENTS[hud.activeEvent.kind].pillBgClass
              }`}
            >
              <span>{hud.activeEvent.emoji}</span>
              <span>{hud.activeEvent.label}</span>
              <span className="rounded-full border border-stone-950 bg-white/90 px-1.5 py-0 text-[10px] font-black text-stone-950">
                {toBn(hud.activeEvent.timeLeft)} সে
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Desktop Keyboard Hint above Ticker */}
      {!cleanMode && !showTouchControls && phase === 'playing' && !isDriverView && (
        <div className="sticker-chip mx-auto mb-1 hidden rounded-lg bg-[#fef6df]/90 px-2.5 py-0.5 text-[11px] font-black text-stone-950 md:block">
          W/A/S/D বা তীর: চালানো · Shift: বুস্ট · H: হর্ন · B: শব্দবোমা · C: ক্যামেরা · T: দিন/সন্ধ্যা/বৃষ্টি · R: রেডিও · V: পেছনে
        </div>
      )}

      {/* Bottom Live Breaking News Street Ticker (with single-line FM Radio feed) */}
      {!cleanMode && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex h-7 items-center overflow-hidden border-t-[2.5px] border-stone-950 bg-blue-900">
          <div className="z-10 flex h-full shrink-0 items-center border-r-[2.5px] border-stone-950 bg-orange-400 px-2.5 text-[11px] font-black text-stone-950">
            {radioEnabled && activeRadioClip ? 'চাঁটগাঁ এফএম' : 'সর্বশেষ'}
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div className="animate-ticker whitespace-nowrap text-[11px] font-black text-yellow-200">
              <span className="pr-12">{tickerText}</span>
              <span className="pr-12">{tickerText}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
