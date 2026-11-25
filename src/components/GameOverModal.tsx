import { Award, Newspaper, Paintbrush, RotateCcw, Target, Trophy } from 'lucide-react';
import type { DeathReason, DriverProgression, GameOverSummary } from '../types/game';
import { toBn } from '../utils/bengaliDigits';
import { RickshawBorderStrip } from './StreetArtDecor';

interface GameOverModalProps {
  summary: GameOverSummary;
  totalTaka: number;
  driverProgression: DriverProgression;
  onRestart: () => void;
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
  driverProgression,
  onRestart,
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

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-3 sm:p-4">
      <div className="relative w-full max-w-xl -rotate-[0.6deg] overflow-visible">
        {/* Main Bold Comic Newspaper Front Page */}
        <div className="relative overflow-hidden rounded-2xl border-4 border-stone-950 bg-[#fef6df] text-stone-950 shadow-[8px_8px_0_#1c1917]">
          {/* Masthead */}
          <div className="border-b-4 border-stone-950 bg-red-600 px-4 py-2.5 text-white sm:px-5 sm:py-3">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-black text-yellow-300 sm:text-xs">
              <span className="flex items-center gap-1.5">
                <Newspaper className="h-4 w-4 stroke-[2.5]" />
                দৈনিক চাঁটগাঁ বার্তা · বিশেষ সংখ্যা
              </span>
              <span className="rounded-md border-2 border-stone-950 bg-stone-950 px-2 py-0.5 text-yellow-300">
                {causeLabel}
              </span>
            </div>
            <div className="comic-text-stroke mt-1 text-3xl font-black tracking-tight text-yellow-300 sm:text-4xl">
              বিশেষ ব্রেকিং সংবাদ!
            </div>
          </div>

          <RickshawBorderStrip />

          {/* Animated Slammed Ink Stamp */}
          <div
            aria-hidden="true"
            className="animate-stamp-slam pointer-events-none absolute top-16 right-4 z-20 rounded-xl border-4 border-red-700 bg-red-600/15 px-3.5 py-1 text-2xl font-black tracking-wider text-red-700 shadow-[0_0_0_2px_rgba(185,28,28,0.25)] sm:top-20 sm:right-6 sm:text-4xl"
          >
            {stampText}
          </div>

          {/* Newspaper Body */}
          <div className="p-4 sm:p-5">
            {summary.isNewRecord && (
              <div className="sticker-chip mb-2 inline-flex -rotate-1 items-center gap-1.5 rounded-lg bg-yellow-300 px-3 py-1 text-xs font-black text-stone-950">
                <Trophy className="h-4 w-4 text-red-600" />
                <span>নতুন সর্বোচ্চ স্কোর রেকর্ড!</span>
              </div>
            )}

            <h2 className="pr-16 text-xl font-black leading-snug text-red-700 sm:pr-24 sm:text-2xl">
              {summary.headline}
            </h2>
            <p className="mt-1.5 border-b-2 border-dashed border-stone-400 pb-3 text-xs font-extrabold text-stone-800 sm:text-sm">
              {summary.subheadline}
            </p>

            {/* Clipped Sticker Stat Boxes */}
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="sticker-chip -rotate-1 rounded-xl bg-red-200 p-2.5 tabular-nums">
                <div className="text-[11px] font-black text-red-900">জাতীয় ক্ষতি</div>
                <div className="text-lg font-black text-red-700">
                  ৳{toBn(summary.nationalDamage)}
                </div>
              </div>

              <div className="sticker-chip rotate-1 rounded-xl bg-emerald-300 p-2.5 tabular-nums">
                <div className="text-[11px] font-black text-emerald-950">ট্রিপে আয়</div>
                <div className="text-lg font-black text-stone-950">
                  +৳{toBn(summary.runTaka)}
                </div>
              </div>

              <div className="sticker-chip -rotate-1 rounded-xl bg-yellow-300 p-2.5 tabular-nums">
                <div className="text-[11px] font-black text-stone-900">মোট স্কোর</div>
                <div className="text-lg font-black text-stone-950">
                  {toBn(summary.score)}
                </div>
              </div>

              <div className="sticker-chip rotate-1 rounded-xl bg-sky-200 p-2.5">
                <div className="text-[11px] font-black text-sky-950">ঘটনাস্থল</div>
                <div className="truncate text-sm font-black text-stone-950">
                  {summary.areaName}
                </div>
                <div className="text-[11px] font-extrabold text-stone-800 tabular-nums">
                  লুপ #{toBn(summary.loopCount)} · {toBn(summary.distanceMeters)} মি
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-stone-950 bg-amber-100 px-3 py-1.5 text-xs font-black text-stone-950 tabular-nums">
              <span>মোট সঞ্চিত টাকা: ৳{toBn(totalTaka)}</span>
              <span className="inline-flex items-center gap-1">
                <Award className="h-4 w-4 text-red-600" />
                লেভেল {toBn(driverProgression.current.level)} · {driverProgression.current.title}
                {driverProgression.next && ` (${toBn(driverProgression.progressPct)}%)`}
              </span>
            </div>

            {/* Chunky 3D Actions */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={onRestart}
                className="comic-btn flex flex-1 -rotate-1 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-base font-black text-stone-950 whitespace-nowrap"
              >
                <RotateCcw className="h-5 w-5 stroke-[2.6]" />
                <span>আবার চালাও!</span>
              </button>

              <button
                type="button"
                onClick={onOpenGarage}
                className="comic-btn rotate-1 flex items-center justify-center gap-1.5 rounded-2xl bg-orange-400 px-4 py-3 text-sm font-black text-stone-950 whitespace-nowrap"
              >
                <Paintbrush className="h-4 w-4 stroke-[2.5]" />
                <span>গ্যারেজ</span>
              </button>

              <button
                type="button"
                onClick={onOpenMissions}
                className="comic-btn -rotate-1 flex items-center justify-center gap-1.5 rounded-2xl bg-sky-400 px-4 py-3 text-sm font-black text-stone-950 whitespace-nowrap"
              >
                <Target className="h-4 w-4 stroke-[2.5]" />
                <span>মিশন</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
