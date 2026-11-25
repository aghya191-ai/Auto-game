import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bomb,
  Eye,
  Volume2,
  Zap,
} from 'lucide-react';
import type { InputState } from '../types/game';
import { toBn } from '../utils/bengaliDigits';

interface MobileControlsProps {
  soundBombCooldown: number;
  onInputChange: (partial: Partial<InputState>) => void;
  onHorn: () => void;
  onSoundBomb: () => void;
}

export function MobileControls({
  soundBombCooldown,
  onInputChange,
  onHorn,
  onSoundBomb,
}: MobileControlsProps) {
  const bindHold = (key: keyof Omit<InputState, 'hornPressed'>) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      onInputChange({ [key]: true });
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      onInputChange({ [key]: false });
    },
    onPointerCancel: () => onInputChange({ [key]: false }),
    onLostPointerCapture: () => onInputChange({ [key]: false }),
  });

  const bombReady = soundBombCooldown <= 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-10 z-20 flex items-end justify-between px-3 sm:px-5">
      {/* Left Cluster: Look Back, Horn, Sound-Bomb, Left/Right Circles */}
      <div className="pointer-events-auto flex flex-col items-start gap-2">
        <button
          type="button"
          aria-label="পেছনে তাকান"
          {...bindHold('lookBack')}
          className="comic-btn -rotate-2 flex h-12 w-16 touch-none flex-col items-center justify-center rounded-2xl bg-sky-400 text-[11px] font-black text-stone-950"
        >
          <Eye className="h-4 w-4 stroke-[2.6]" />
          <span>পেছনে</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="হর্ন"
            onPointerDown={(e) => {
              e.preventDefault();
              onHorn();
            }}
            className="comic-btn rotate-2 flex h-12 w-16 touch-none flex-col items-center justify-center rounded-2xl bg-yellow-300 text-[11px] font-black text-stone-950"
          >
            <Volume2 className="h-4 w-4 stroke-[2.6]" />
            <span>হর্ন</span>
          </button>

          <button
            type="button"
            aria-label="শব্দবোমা"
            onPointerDown={(e) => {
              e.preventDefault();
              onSoundBomb();
            }}
            className={`comic-btn -rotate-1 flex h-12 w-18 touch-none flex-col items-center justify-center rounded-2xl text-[11px] font-black ${
              bombReady ? 'bg-pink-500 text-white' : 'bg-stone-300 text-stone-700'
            }`}
          >
            <Bomb className="h-4 w-4 stroke-[2.6]" />
            <span>{bombReady ? 'শব্দবোমা' : `${toBn(soundBombCooldown)}সে`}</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="বামে"
            {...bindHold('left')}
            className="comic-btn -rotate-2 flex h-16 w-16 touch-none items-center justify-center rounded-full bg-emerald-400 text-stone-950"
          >
            <ArrowLeft className="h-8 w-8 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="ডানে"
            {...bindHold('right')}
            className="comic-btn rotate-2 flex h-16 w-16 touch-none items-center justify-center rounded-full bg-emerald-400 text-stone-950"
          >
            <ArrowRight className="h-8 w-8 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Right Cluster: Brake, Drive, Boost */}
      <div className="pointer-events-auto flex items-end gap-2.5">
        <button
          type="button"
          aria-label="ব্রেক"
          {...bindHold('down')}
          className="comic-btn rotate-2 flex h-18 w-16 touch-none flex-col items-center justify-center gap-0.5 rounded-2xl bg-red-500 text-xs font-black text-white"
        >
          <ArrowDown className="h-6 w-6 stroke-[3]" />
          <span>ব্রেক</span>
        </button>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            aria-label="চালান"
            {...bindHold('up')}
            className="comic-btn -rotate-2 flex h-16 w-16 touch-none flex-col items-center justify-center rounded-full bg-lime-400 text-xs font-black text-stone-950"
          >
            <ArrowUp className="h-5 w-5 stroke-[3]" />
            <span>চালান</span>
          </button>

          <button
            type="button"
            aria-label="টান"
            {...bindHold('boost')}
            className="comic-btn rotate-1 flex h-24 w-20 touch-none flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500 text-sm font-black text-stone-950"
          >
            <Zap className="h-6 w-6 fill-white text-stone-950 stroke-[2.5]" />
            <span>টান</span>
          </button>
        </div>
      </div>
    </div>
  );
}
