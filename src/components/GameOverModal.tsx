import {
  Award,
  Camera,
  Home,
  Newspaper,
  Paintbrush,
  RotateCcw,
  Share2,
  Target,
  Trophy,
} from 'lucide-react';
import type { DeathReason, DriverProgression, GameOverSummary } from '../types/game';
import { toBn } from '../utils/bengaliDigits';
import { RickshawBorderStrip } from './StreetArtDecor';

interface GameOverModalProps {
  summary: GameOverSummary;
  totalTaka: number;
  highScore: number;
  driverProgression: DriverProgression;
  onRestart: () => void;
  onShare: () => void;
  onGoHome: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
}

const REASON_STAMP: Record<DeathReason, string> = {
  bus: 'ভর্তা!',
  truck: 'চাপা!',
  gas: 'খালি!',
  red_light: 'ধরা!',
  pedestrian: 'ধোলাই!',
};

export function GameOverModal({
  summary,
  totalTaka,
  highScore,
  driverProgression,
  onRestart,
  onShare,
  onGoHome,
  onOpenGarage,
  onOpenMissions,
}: GameOverModalProps) {
  const causeLabel =
    summary.reason === 'bus'
      ? 'সিটি বাসের সাথে সংঘর্ষ'
      : summary.reason === 'truck'
      ? 'ট্রাকের নিচে চাপা'
      : summary.reason === 'gas'
      ? 'সিলিন্ডারের গ্যাস শূন্য'
      : summary.reason === 'red_light'
      ? 'লাল বাতি অমান্য ও ট্রাফিক জরিমানা'
      : 'পথচারী বাহিনীর হাতে কুপোকাত';

  const stampText = REASON_STAMP[summary.reason] ?? 'ধরা!';
  const bestScore = Math.max(highScore, summary.score);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/75 p-2.5 sm:p-4">
      <div className="relative my-auto w-full max-w-xl -rotate-[0.5deg] overflow-visible">
        {/* Main Bold Comic Newspaper Front Page */}
        <div className="relative overflow-hidden rounded-2xl border-4 border-stone-950 bg-[#fef6df] text-stone-950 shadow-[8px_8px_0_#1c1917]">
          {/* Masthead */}
          <div className="border-b-4 border-stone-950 bg-red-600 px-3.5 py-2 text-white sm:px-5 sm:py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-black text-yellow-300 sm:text-xs">
              <span className="flex items-center gap-1.5">
                <Newspaper className="h-4 w-4 stroke-[2.5]" />
                দৈনিক চাঁটগাঁ বার্তা · বিশেষ সংখ্যা
              </span>
              <span className="rounded-md border-2 border-stone-950 bg-stone-950 px-2 py-0.5 text-yellow-300">
                {causeLabel}
              </span>
            </div>
            <div className="comic-text-stroke mt-0.5 text-2xl font-black tracking-tight text-yellow-300 sm:text-3xl">
              বিশেষ ব্রেকিং সংবাদ!
            </div>
          </div>

          <RickshawBorderStrip />

          {/* Animated Slammed Ink Stamp */}
          <div
            aria-hidden="true"
            className="animate-stamp-slam pointer-events-none absolute top-14 right-3 z-20 rounded-xl border-4 border-red-700 bg-red-600/15 px-3 py-0.5 text-xl font-black tracking-wider text-red-700 shadow-[0_0_0_2px_rgba(185,28,28,0.25)] sm:top-16 sm:right-5 sm:text-3xl"
          >
            {stampText}
          </div>

          {/* Newspaper Body */}
          <div className="p-3.5 sm:p-4">
            {summary.isNewRecord && (
              <div className="sticker-chip mb-1.5 inline-flex -rotate-1 items-center gap-1.5 rounded-lg bg-yellow-300 px-2.5 py-0.5 text-xs font-black text-stone-950">
                <Trophy className="h-3.5 w-3.5 text-red-600" />
                <span>নতুন সর্বোচ্চ স্কোর রেকর্ড!</span>
              </div>
            )}

            <h2 className="pr-16 text-lg font-black leading-snug text-red-700 sm:pr-24 sm:text-xl">
              {summary.headline}
            </h2>
            <p className="mt-1 border-b-2 border-dashed border-stone-400 pb-2 text-xs font-extrabold text-stone-800">
              {summary.subheadline}
            </p>

            {/* Front-page Crash Photo ("ঘটনাস্থলের ছবি") + Key Loss/Score Stats */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
              {summary.crashPhotoDataUrl && (
                <div className="sm:col-span-6">
                  <div className="relative overflow-hidden rounded-xl border-[3px] border-stone-950 bg-stone-900 shadow-[3px_3px_0_#1c1917]">
                    <img
                      src={summary.crashPhotoDataUrl}
                      alt="ঘটনাস্থলের ছবি"
                      className="h-36 w-full object-cover sm:h-40"
                    />
                    <div className="flex items-center justify-between border-t-2 border-stone-950 bg-yellow-300 px-2.5 py-1 text-[11px] font-black text-stone-950">
                      <span className="inline-flex items-center gap-1 text-red-700">
                        <Camera className="h-3.5 w-3.5 stroke-[2.5]" />
                        ঘটনাস্থলের ছবি
                      </span>
                      <span className="truncate text-stone-900">
                        {summary.areaName} · {toBn(summary.distanceMeters)} মি
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`grid grid-cols-2 gap-2 ${
                  summary.crashPhotoDataUrl ? 'sm:col-span-6' : 'sm:col-span-12 sm:grid-cols-4'
                }`}
              >
                <div className="sticker-chip -rotate-1 rounded-xl bg-red-200 p-2 tabular-nums">
                  <div className="text-[10px] font-black text-red-900">জাতীয় ক্ষতি</div>
                  <div className="text-base font-black text-red-700 sm:text-lg">
                    ৳{toBn(summary.nationalDamage)}
                  </div>
                </div>

                <div className="sticker-chip rotate-1 rounded-xl bg-yellow-300 p-2 tabular-nums">
                  <div className="text-[10px] font-black text-stone-900">সেরা স্কোর</div>
                  <div className="text-base font-black text-stone-950 sm:text-lg">
                    {toBn(bestScore)}
                  </div>
                </div>

                <div className="sticker-chip rotate-1 rounded-xl bg-emerald-300 p-2 tabular-nums">
                  <div className="text-[10px] font-black text-emerald-950">ট্রিপে আয়</div>
                  <div className="text-base font-black text-stone-950 sm:text-lg">
                    +৳{toBn(summary.runTaka)}
                  </div>
                </div>

                <div className="sticker-chip -rotate-1 rounded-xl bg-sky-200 p-2 tabular-nums">
                  <div className="text-[10px] font-black text-sky-950">এই ট্রিপের স্কোর</div>
                  <div className="text-base font-black text-stone-950 sm:text-lg">
                    {toBn(summary.score)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-stone-950 bg-amber-100 px-3 py-1.5 text-xs font-black text-stone-950 tabular-nums">
              <span>মোট সঞ্চিত টাকা: ৳{toBn(totalTaka)}</span>
              <span className="inline-flex items-center gap-1">
                <Award className="h-4 w-4 text-red-600" />
                লেভেল {toBn(driverProgression.current.level)} · {driverProgression.current.title}
                {driverProgression.next && ` (${toBn(driverProgression.progressPct)}%)`}
              </span>
            </div>

            {/* Primary Actions: আবার চালান, শেয়ার, হোম */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="comic-btn flex flex-1 -rotate-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-400 px-4 py-2.5 text-base font-black text-stone-950 whitespace-nowrap"
              >
                <RotateCcw className="h-5 w-5 stroke-[2.6]" />
                <span>আবার চালান</span>
              </button>

              <button
                type="button"
                onClick={onShare}
                className="comic-btn rotate-1 flex items-center justify-center gap-1.5 rounded-2xl bg-yellow-300 px-4 py-2.5 text-sm font-black text-stone-950 whitespace-nowrap"
              >
                <Share2 className="h-4 w-4 stroke-[2.5]" />
                <span>শেয়ার</span>
              </button>

              <button
                type="button"
                onClick={onGoHome}
                className="comic-btn -rotate-1 flex items-center justify-center gap-1.5 rounded-2xl bg-rose-400 px-4 py-2.5 text-sm font-black text-stone-950 whitespace-nowrap"
              >
                <Home className="h-4 w-4 stroke-[2.5]" />
                <span>হোম</span>
              </button>
            </div>

            {/* Secondary Progression Actions */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenGarage}
                className="comic-btn-sm flex items-center justify-center gap-1.5 rounded-xl bg-orange-300 px-3 py-1.5 text-xs font-black text-stone-950 whitespace-nowrap"
              >
                <Paintbrush className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>গ্যারেজ</span>
              </button>

              <button
                type="button"
                onClick={onOpenMissions}
                className="comic-btn-sm flex items-center justify-center gap-1.5 rounded-xl bg-sky-300 px-3 py-1.5 text-xs font-black text-stone-950 whitespace-nowrap"
              >
                <Target className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>মিশন</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
