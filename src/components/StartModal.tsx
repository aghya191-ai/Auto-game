import {
  Award,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Flame,
  Gamepad2,
  Gift,
  Lock,
  MapPin,
  Music,
  Paintbrush,
  Radio,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import {
  AREAS,
  DAILY_STREAK_REWARDS,
  DRIVER_RANKS,
  MISSION_RANK_POINTS,
} from '../config/chattogramData';
import type { CameraMode, DailyMission, DriverProgression } from '../types/game';
import { toBn } from '../utils/bengaliDigits';
import { getDailyStreakReward } from '../utils/storage';
import {
  ConfettiPetals,
  FestivalBunting,
  RickshawBorderStrip,
  RickshawPeacockCrest,
  SunburstBackdrop,
} from './StreetArtDecor';

interface StartModalProps {
  taka: number;
  highScore: number;
  driverProgression: DriverProgression;
  loginStreak: number;
  streakClaimedToday: boolean;
  startAreaIndex: number;
  cameraMode: CameraMode;
  missions: DailyMission[];
  unclaimedMissions: number;
  muted: boolean;
  musicEnabled: boolean;
  radioEnabled: boolean;
  showTouchControls: boolean;
  onSelectArea: (idx: number) => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onToggleRadio: () => void;
  onToggleTouch: () => void;
  onClaimStreak: () => void;
  onStart: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
}

export function StartModal({
  taka,
  highScore,
  driverProgression,
  loginStreak,
  streakClaimedToday,
  startAreaIndex,
  cameraMode,
  missions,
  unclaimedMissions,
  muted,
  musicEnabled,
  radioEnabled,
  showTouchControls,
  onSelectArea,
  onToggleCamera,
  onToggleMute,
  onToggleMusic,
  onToggleRadio,
  onToggleTouch,
  onClaimStreak,
  onStart,
  onOpenGarage,
  onOpenMissions,
}: StartModalProps) {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showRankLadder, setShowRankLadder] = useState(false);
  const [showStreakDrawer, setShowStreakDrawer] = useState(false);

  const selectedArea = AREAS[startAreaIndex] ?? AREAS[0];
  const todayStreakReward = getDailyStreakReward(loginStreak);
  const streakCycleDay = Math.min(DAILY_STREAK_REWARDS.length, Math.max(1, loginStreak));

  return (
    <>
      <SunburstBackdrop />
      <FestivalBunting />
      <ConfettiPetals />

      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between px-3 pt-9 pb-3 sm:px-6 sm:pt-11 sm:pb-5">
        {/* Top Bar: Chunky Street-Art Utility Toggles + Streak + Wanted Stamp */}
        <div className="pointer-events-auto flex flex-col items-center gap-1.5">
          <div className="flex w-full max-w-2xl items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onToggleMusic}
                title={musicEnabled ? 'মিউজিক বন্ধ করুন' : 'মিউজিক চালু করুন'}
                className={`comic-btn-sm flex h-10 w-10 items-center justify-center rounded-xl ${
                  musicEnabled && !muted
                    ? 'bg-pink-400 text-stone-950 -rotate-3'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                <Music className="h-4 w-4 stroke-[2.6]" />
              </button>

              <button
                type="button"
                onClick={onToggleRadio}
                title={radioEnabled ? 'এফএম রেডিও বন্ধ করুন' : 'এফএম রেডিও চালু করুন'}
                className={`comic-btn-sm flex h-10 w-10 items-center justify-center rounded-xl ${
                  radioEnabled && !muted
                    ? 'bg-cyan-400 text-stone-950 rotate-2'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                <Radio className="h-4 w-4 stroke-[2.6]" />
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                title={muted ? 'শব্দ চালু করুন' : 'শব্দ বন্ধ করুন'}
                className={`comic-btn-sm flex h-10 w-10 items-center justify-center rounded-xl ${
                  muted
                    ? 'bg-red-500 text-white -rotate-2'
                    : 'bg-emerald-400 text-stone-950'
                }`}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4 stroke-[2.6]" />
                ) : (
                  <Volume2 className="h-4 w-4 stroke-[2.6]" />
                )}
              </button>

              <button
                type="button"
                onClick={onToggleTouch}
                title={showTouchControls ? 'টাচ বাটন লুকান' : 'টাচ বাটন দেখান'}
                className={`comic-btn-sm flex h-10 w-10 items-center justify-center rounded-xl ${
                  showTouchControls
                    ? 'bg-lime-400 text-stone-950 rotate-2'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                <Gamepad2 className="h-4 w-4 stroke-[2.6]" />
              </button>

              <button
                type="button"
                onClick={onToggleCamera}
                title="শুরুর ক্যামেরা ভিউ বদলান"
                className="comic-btn-sm flex h-10 items-center gap-1 rounded-xl bg-amber-300 px-2.5 text-xs font-black text-stone-950 -rotate-1 whitespace-nowrap"
              >
                <Camera className="h-4 w-4 stroke-[2.5]" />
                <span className="hidden sm:inline">
                  {cameraMode === 'driver' ? 'ড্রাইভার' : 'বাইরের ভিউ'}
                </span>
              </button>
            </div>

            {/* Right Controls: Daily Streak Sticker + মোস্ট ওয়ান্টেড Stamp */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowStreakDrawer((v) => !v);
                  setShowRankLadder(false);
                  setShowHowToPlay(false);
                  setShowAreaPicker(false);
                }}
                title="দৈনিক উপস্থিতি স্ট্রিক ও বোনাস"
                className={`comic-btn-sm flex h-10 items-center gap-1 rounded-xl px-2.5 text-xs font-black whitespace-nowrap rotate-1 ${
                  streakClaimedToday
                    ? 'bg-[#fef6df] text-stone-950'
                    : 'bg-orange-400 text-stone-950'
                }`}
              >
                <Flame className="h-4 w-4 shrink-0 fill-red-500 text-stone-950" />
                <span className="tabular-nums">{toBn(loginStreak)} দিন</span>
                {!streakClaimedToday && (
                  <span className="rounded-md border-2 border-stone-950 bg-yellow-300 px-1.5 py-0.5 text-[10px] font-black text-stone-950 tabular-nums">
                    +৳{toBn(todayStreakReward)}
                  </span>
                )}
              </button>

              <div className="sticker-chip -rotate-2 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-black text-yellow-300 sm:text-sm whitespace-nowrap">
                মোস্ট ওয়ান্টেড
              </div>
            </div>
          </div>

          {/* Street-Art Poster Hero Title */}
          <div className="mt-1 flex flex-col items-center text-center">
            <RickshawPeacockCrest />
            <h1 className="title-text-3d -mt-1.5 text-4xl font-black leading-none tracking-tight text-yellow-300 sm:text-6xl">
              চট্টগ্রাম এক্সপ্রেস
            </h1>
            <div className="sticker-chip mt-1.5 -rotate-1 rounded-full bg-emerald-400 px-3.5 py-0.5 text-[11px] font-black text-stone-950 sm:text-xs whitespace-nowrap">
              সদরঘাট থেকে বহদ্দারহাট · চাঁটগাঁ স্ট্রিট রান
            </div>
            <div className="sticker-chip mt-1.5 rotate-1 rounded-xl bg-yellow-300 px-3.5 py-1 text-base font-black text-stone-950 sm:text-xl">
              রাস্তা কি আপনার বাপের?
            </div>
            <p className="comic-text-stroke mt-1 text-xs font-black text-white sm:text-sm">
              হর্ন দিন, গ্যাস ভরুন, সামলে চললে বহদ্দারহাট!
            </p>
          </div>
        </div>

        {/* Bottom Docked Poster Action Panel — center remains completely open for the animated 3D CNG + Sunburst */}
        <div className="pointer-events-auto mx-auto w-full max-w-md">
          {/* Collapsible Rules Poster Sheet */}
          {showHowToPlay && (
            <div className="sticker-panel paper-torn mb-2.5 grid grid-cols-2 gap-2 rounded-2xl p-3 text-xs font-black text-stone-950">
              <div className="sticker-chip -rotate-1 rounded-xl bg-red-200 px-2.5 py-2">
                <span className="text-red-800">বাস / ট্রাক:</span> লাগলেই গেম ওভার!
              </div>
              <div className="sticker-chip rotate-1 rounded-xl bg-rose-200 px-2.5 py-2">
                <span className="text-rose-900">লাল বাতি:</span> অমান্য করলে জরিমানা!
              </div>
              <div className="sticker-chip rotate-1 rounded-xl bg-yellow-200 px-2.5 py-2">
                <span className="text-amber-900">হলুদ জোন:</span> গ্যাস রিফিল হবে
              </div>
              <div className="sticker-chip -rotate-1 rounded-xl bg-pink-200 px-2.5 py-2">
                <span className="text-pink-900">গোলাপি জোন:</span> চা-পানিতে মামলা কমবে
              </div>
            </div>
          )}

          {/* Stand / Area Picker Drawer */}
          {showAreaPicker && (
            <div className="sticker-panel paper-torn mb-2.5 overflow-hidden rounded-2xl p-3 text-stone-950">
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-black">
                <span>যাত্রা শুরুর স্ট্যান্ড বাছুন</span>
                <span className="sticker-chip rounded-lg bg-yellow-300 px-2 py-0.5 text-stone-950">
                  {selectedArea.name}
                </span>
              </div>
              <div className="grid max-h-36 grid-cols-3 gap-1.5 overflow-y-auto pr-0.5">
                {AREAS.map((area, idx) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      onSelectArea(idx);
                      setShowAreaPicker(false);
                    }}
                    className={`comic-btn-sm truncate rounded-xl px-2 py-1.5 text-left text-[11px] font-black ${
                      idx === startAreaIndex
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-white text-stone-900'
                    }`}
                  >
                    {area.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Driver Rank Ladder Drawer */}
          {showRankLadder && (
            <div className="sticker-panel paper-torn mb-2.5 rounded-2xl p-3 text-stone-950">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black">
                <span>ড্রাইভার লাইসেন্স ধাপ</span>
                <span className="rounded-md border-2 border-stone-950 bg-yellow-300 px-2 py-0.5 text-[11px] font-black tabular-nums">
                  মোট {toBn(driverProgression.points)} পয়েন্ট
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {DRIVER_RANKS.map((tier) => {
                  const unlocked = driverProgression.points >= tier.minPoints;
                  const isCurrent = driverProgression.current.level === tier.level;
                  return (
                    <div
                      key={tier.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border-2 border-stone-950 px-2.5 py-1.5 text-xs font-black ${
                        isCurrent
                          ? 'bg-emerald-300 text-stone-950 shadow-[2px_2px_0_#1c1917]'
                          : unlocked
                            ? 'bg-white text-stone-900'
                            : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {unlocked ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 stroke-[2.5]" />
                        ) : (
                          <Lock className="h-4 w-4 shrink-0 text-stone-500" />
                        )}
                        <span className="truncate">
                          লেভেল {toBn(tier.level)} · {tier.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] tabular-nums">
                        {toBn(tier.minPoints)}+ পয়েন্ট
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[10px] font-bold text-stone-700 tabular-nums">
                সর্বোচ্চ স্কোর + প্রতিটি মিশন ({toBn(MISSION_RANK_POINTS)} পয়েন্ট)
              </div>
            </div>
          )}

          {/* Daily Login Streak 7-Day Drawer */}
          {showStreakDrawer && (
            <div className="sticker-panel paper-torn mb-2.5 rounded-2xl p-3 text-stone-950">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black">
                <span className="flex items-center gap-1.5 text-red-700">
                  <Flame className="h-4 w-4 fill-orange-500 text-stone-950" />
                  দৈনিক লগইন স্ট্রিক · {toBn(loginStreak)} দিন
                </span>
                <span className="text-[11px] font-extrabold text-stone-700">
                  রোজ এলে বোনাস বাড়বে!
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DAILY_STREAK_REWARDS.map((amt, idx) => {
                  const dayNum = idx + 1;
                  const isToday = dayNum === streakCycleDay;
                  const pastClaimed =
                    dayNum < streakCycleDay || (isToday && streakClaimedToday);
                  return (
                    <div
                      key={dayNum}
                      className={`flex flex-col items-center justify-center rounded-xl border-2 border-stone-950 px-1 py-1.5 text-center tabular-nums ${
                        isToday && !streakClaimedToday
                          ? 'bg-yellow-300 text-stone-950 shadow-[2px_2px_0_#1c1917]'
                          : pastClaimed
                            ? 'bg-emerald-300 text-stone-950'
                            : 'bg-white text-stone-700'
                      }`}
                    >
                      <span className="text-[9px] font-black">দিন {toBn(dayNum)}</span>
                      <span className="mt-0.5 text-[10px] font-black">৳{toBn(amt)}</span>
                      <span className="mt-0.5 text-[10px] font-black">
                        {pastClaimed ? '✓' : isToday ? 'আজ' : '·'}
                      </span>
                    </div>
                  );
                })}
              </div>
              {!streakClaimedToday ? (
                <button
                  type="button"
                  onClick={onClaimStreak}
                  className="comic-btn mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-orange-400 py-2 text-xs font-black text-stone-950"
                >
                  <Gift className="h-4 w-4" />
                  <span>আজকের বোনাস +৳{toBn(todayStreakReward)} নিন!</span>
                </button>
              ) : (
                <div className="mt-2 text-center text-[11px] font-black text-emerald-800">
                  আজকের স্ট্রিক বোনাস নেওয়া হয়েছে — কাল আবার আসবেন!
                </div>
              )}
            </div>
          )}

          {/* One-Tap Unclaimed Daily Streak Claim Sticker */}
          {!streakClaimedToday && (
            <button
              type="button"
              onClick={onClaimStreak}
              className="comic-btn mb-2 flex w-full -rotate-[0.6deg] items-center justify-between gap-2 rounded-2xl bg-orange-400 px-3.5 py-2 text-left text-xs font-black text-stone-950"
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Gift className="h-4 w-4 shrink-0" />
                <span>দিন {toBn(loginStreak)} দৈনিক লগইন বোনাস!</span>
              </span>
              <span className="rounded-lg border-2 border-stone-950 bg-yellow-300 px-2.5 py-0.5 text-[11px] font-black text-stone-950 tabular-nums whitespace-nowrap">
                সংগ্রহ +৳{toBn(todayStreakReward)}
              </span>
            </button>
          )}

          {/* Driver Level Progression Cream Paper Sticker */}
          <button
            type="button"
            onClick={() => {
              setShowRankLadder((v) => !v);
              setShowHowToPlay(false);
              setShowAreaPicker(false);
              setShowStreakDrawer(false);
            }}
            className="sticker-panel mb-2 w-full rotate-[0.5deg] overflow-hidden rounded-2xl bg-[#fef6df] text-left text-stone-950 transition hover:brightness-105"
          >
            <RickshawBorderStrip className="h-2.5" />
            <div className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-stone-950 whitespace-nowrap">
                  <Award className="h-4 w-4 shrink-0 text-red-600" />
                  <span>
                    লেভেল {toBn(driverProgression.current.level)} · {driverProgression.current.title}
                  </span>
                  {showRankLadder ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="text-[11px] font-black text-emerald-800 tabular-nums whitespace-nowrap">
                  স্কোর {toBn(driverProgression.bestScore)} · মিশন {toBn(driverProgression.completedMissions)}
                </div>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full border-2 border-stone-950 bg-stone-200">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(6, driverProgression.progressPct)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] font-extrabold text-stone-700 tabular-nums">
                <span>{driverProgression.current.tagline}</span>
                <span className="shrink-0 text-red-700">
                  {driverProgression.next
                    ? `পরবর্তী: ${driverProgression.next.title} (+${toBn(driverProgression.pointsToNext)})`
                    : 'সর্বোচ্চ র‍্যাঙ্ক!'}
                </span>
              </div>
            </div>
          </button>

          {/* High Score Plate & How to Play Toggle */}
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5 text-xs font-black">
            <div className="sticker-chip -rotate-1 rounded-xl bg-emerald-500 px-3 py-1 text-stone-950 tabular-nums">
              সর্বোচ্চ স্কোর: <span className="text-yellow-200 comic-text-stroke">{toBn(highScore)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowHowToPlay((v) => !v);
                setShowAreaPicker(false);
                setShowRankLadder(false);
                setShowStreakDrawer(false);
              }}
              className="comic-btn-sm rotate-1 flex items-center gap-1 rounded-xl bg-yellow-300 px-3 py-1 text-stone-950"
            >
              <span>কীভাবে খেলবেন</span>
              {showHowToPlay ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Primary Chunky Yellow-Orange 3D CTA */}
          <button
            type="button"
            onClick={onStart}
            className="comic-btn w-full -rotate-[0.6deg] rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-400 py-3.5 text-2xl font-black text-stone-950"
          >
            রাস্তায় নামেন!
          </button>

          {/* 2x2 Bright Saturated Sticker Tile Grid */}
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {/* Tile 1: স্ট্যান্ড */}
            <button
              type="button"
              onClick={() => {
                setShowAreaPicker((v) => !v);
                setShowHowToPlay(false);
                setShowRankLadder(false);
                setShowStreakDrawer(false);
              }}
              className="comic-btn -rotate-1 flex items-center gap-2 rounded-2xl bg-sky-400 px-3 py-2 text-left text-stone-950"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-stone-950 bg-yellow-300 text-stone-950">
                <MapPin className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black">স্ট্যান্ড</div>
                <div className="flex items-center gap-0.5 truncate text-[11px] font-extrabold text-stone-900">
                  <span className="truncate">{selectedArea.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                </div>
              </div>
            </button>

            {/* Tile 2: ক্যামেরা মোড */}
            <button
              type="button"
              onClick={onToggleCamera}
              className="comic-btn rotate-1 flex items-center gap-2 rounded-2xl bg-pink-400 px-3 py-2 text-left text-stone-950"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-stone-950 bg-white text-stone-950">
                <Camera className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black">ক্যামেরা ভিউ</div>
                <div className="truncate text-[11px] font-extrabold text-stone-900">
                  {cameraMode === 'driver' ? 'ড্রাইভার ককপিট' : 'বাইরের ভিউ'}
                </div>
              </div>
            </button>

            {/* Tile 3: গ্যারেজ */}
            <button
              type="button"
              onClick={onOpenGarage}
              className="comic-btn rotate-1 flex items-center gap-2 rounded-2xl bg-emerald-400 px-3 py-2 text-left text-stone-950"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-stone-950 bg-yellow-300 text-stone-950">
                <Paintbrush className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black">গ্যারেজ</div>
                <div className="truncate text-xs font-black text-stone-950 tabular-nums">
                  ৳{toBn(taka)}
                </div>
              </div>
            </button>

            {/* Tile 4: আজকের কাজ */}
            <button
              type="button"
              onClick={onOpenMissions}
              className="comic-btn relative -rotate-1 flex items-center gap-2 rounded-2xl bg-orange-400 px-3 py-2 text-left text-stone-950"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-stone-950 bg-white text-stone-950">
                <ClipboardList className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black">আজকের কাজ</div>
                <div className="mt-1 flex items-center gap-1.5">
                  {missions.slice(0, 3).map((m) => {
                    const done = m.progress >= m.target;
                    return (
                      <span
                        key={m.id}
                        className={`h-3 w-3 rounded-full border-2 border-stone-950 ${
                          m.claimed
                            ? 'bg-emerald-400'
                            : done
                              ? 'bg-yellow-300'
                              : 'bg-white'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              {unclaimedMissions > 0 && (
                <span className="absolute -top-1.5 -right-1 rounded-lg border-2 border-stone-950 bg-yellow-300 px-1.5 py-0.5 text-[11px] font-black text-stone-950 shadow-[2px_2px_0_#1c1917]">
                  {toBn(unclaimedMissions)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
