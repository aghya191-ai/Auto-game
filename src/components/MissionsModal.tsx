import { Award, CheckCircle2, Gift, Target, X } from 'lucide-react';
import { MISSION_RANK_POINTS } from '../config/chattogramData';
import type { DailyMission, DriverProgression } from '../types/game';
import { toBn } from '../utils/bengaliDigits';
import { RickshawBorderStrip } from './StreetArtDecor';

interface MissionsModalProps {
  missions: DailyMission[];
  taka: number;
  driverProgression: DriverProgression;
  onClaim: (missionId: string) => void;
  onClose: () => void;
}

export function MissionsModal({
  missions,
  taka,
  driverProgression,
  onClaim,
  onClose,
}: MissionsModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="sticker-panel paper-torn w-full max-w-lg -rotate-[0.4deg] overflow-hidden rounded-3xl text-stone-950">
        {/* Bright Street-Art Header */}
        <div className="flex items-center justify-between bg-sky-400 px-5 py-3 border-b-[3px] border-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-stone-950 bg-yellow-300 text-stone-950">
              <Target className="h-5 w-5 stroke-[2.8]" />
            </div>
            <div>
              <h2 className="comic-text-stroke text-xl font-black text-white">দৈনিক ৩টি মিশন</h2>
              <p className="text-[11px] font-black text-stone-950 tabular-nums">
                প্রতি মিশনে টাকা ও +{toBn(MISSION_RANK_POINTS)} পয়েন্ট · জমা: ৳{toBn(taka)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="comic-btn-sm flex h-9 w-9 items-center justify-center rounded-xl bg-rose-400 text-stone-950"
          >
            <X className="h-4 w-4 stroke-[2.8]" />
          </button>
        </div>

        <RickshawBorderStrip />

        <div className="flex flex-col gap-3 p-4 sm:p-5">
          {missions.map((m, idx) => {
            const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
            const done = m.progress >= m.target;

            return (
              <div
                key={m.id}
                className={`sticker-chip rounded-2xl p-3.5 ${
                  idx % 2 === 0 ? '-rotate-[0.6deg]' : 'rotate-[0.6deg]'
                } ${
                  m.claimed
                    ? 'bg-emerald-200'
                    : done
                    ? 'bg-yellow-200'
                    : 'bg-white'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="text-sm font-black text-stone-950">{m.title}</div>
                  <div className="shrink-0 rounded-lg border-2 border-stone-950 bg-emerald-400 px-2 py-0.5 text-xs font-black text-stone-950 tabular-nums">
                    +৳{toBn(m.reward)}
                  </div>
                </div>

                <div className="mb-2.5 flex items-center gap-2">
                  <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-stone-950 bg-stone-200">
                    <div
                      className={`h-full transition-all ${
                        m.claimed
                          ? 'bg-emerald-500'
                          : done
                          ? 'bg-orange-400'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-stone-950 tabular-nums">
                    {toBn(Math.min(m.progress, m.target))} / {toBn(m.target)}
                  </span>
                </div>

                <div className="flex justify-end">
                  {m.claimed ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border-2 border-stone-950 bg-emerald-400 px-2.5 py-1 text-xs font-black text-stone-950">
                      <CheckCircle2 className="h-4 w-4 stroke-[2.6]" />
                      পুরস্কার নেওয়া হয়েছে
                    </span>
                  ) : done ? (
                    <button
                      type="button"
                      onClick={() => onClaim(m.id)}
                      className="comic-btn-sm inline-flex items-center gap-1.5 rounded-xl bg-orange-400 px-3.5 py-1.5 text-xs font-black text-stone-950"
                    >
                      <Gift className="h-4 w-4" />
                      <span>পুরস্কার নিন (৳{toBn(m.reward)})</span>
                    </button>
                  ) : (
                    <span className="text-xs font-extrabold text-stone-600">চলমান...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t-[3px] border-stone-950 bg-amber-200 px-4 py-2.5 text-xs font-black text-stone-950 tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Award className="h-4 w-4 shrink-0 text-red-600" />
            লেভেল {toBn(driverProgression.current.level)} · {driverProgression.current.title}
          </span>
          <span className="text-[11px] font-extrabold text-stone-800">
            {driverProgression.next
              ? `পরবর্তী র‍্যাঙ্কে +${toBn(driverProgression.pointsToNext)} পয়েন্ট`
              : 'সর্বোচ্চ র‍্যাঙ্ক অর্জিত!'}
          </span>
        </div>
      </div>
    </div>
  );
}
