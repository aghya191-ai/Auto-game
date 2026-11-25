import { useState } from 'react';
import { Check, Lock, Paintbrush, Sticker, X } from 'lucide-react';
import { CNG_COLORS, CNG_STICKERS } from '../config/chattogramData';
import type { PlayerSaveData } from '../types/game';
import { toBn } from '../utils/bengaliDigits';
import { RickshawBorderStrip } from './StreetArtDecor';

interface GarageModalProps {
  save: PlayerSaveData;
  onBuyOrEquipColor: (colorId: string) => void;
  onBuyOrEquipSticker: (stickerId: string) => void;
  onClose: () => void;
}

export function GarageModal({
  save,
  onBuyOrEquipColor,
  onBuyOrEquipSticker,
  onClose,
}: GarageModalProps) {
  const [tab, setTab] = useState<'color' | 'sticker'>('color');

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Bar */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
        <div className="sticker-panel -rotate-1 overflow-hidden rounded-2xl bg-[#fef6df] text-stone-950">
          <div className="bg-amber-400 px-4 py-1.5">
            <div className="comic-text-stroke text-lg font-black text-white sm:text-xl">
              চট্টগ্রাম সিএনজি গ্যারেজ
            </div>
            <div className="text-[11px] font-extrabold text-stone-950">
              লাইভ ৩D প্রিভিউ — রং ও স্টিকার সাজান
            </div>
          </div>
          <RickshawBorderStrip className="h-2" />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="cng-plate rotate-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-black text-yellow-300 tabular-nums">
            জমা: ৳{toBn(save.taka)}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="comic-btn -rotate-1 flex h-10 items-center gap-1.5 rounded-xl bg-rose-400 px-3.5 text-sm font-black text-stone-950 whitespace-nowrap"
          >
            <X className="h-4 w-4 stroke-[2.8]" />
            <span>বন্ধ করুন</span>
          </button>
        </div>
      </div>

      {/* Bottom Docked Shop Poster */}
      <div className="pointer-events-auto sticker-panel paper-torn mx-auto w-full max-w-3xl overflow-hidden rounded-3xl text-stone-950">
        <RickshawBorderStrip />
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setTab('color')}
              className={`comic-btn-sm flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black sm:text-sm whitespace-nowrap ${
                tab === 'color'
                  ? 'bg-emerald-400 text-stone-950 -rotate-1'
                  : 'bg-white text-stone-800'
              }`}
            >
              <Paintbrush className="h-4 w-4 stroke-[2.5]" />
              <span>সিএনজির রং</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('sticker')}
              className={`comic-btn-sm flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black sm:text-sm whitespace-nowrap ${
                tab === 'sticker'
                  ? 'bg-pink-400 text-stone-950 rotate-1'
                  : 'bg-white text-stone-800'
              }`}
            >
              <Sticker className="h-4 w-4 stroke-[2.5]" />
              <span>পেছনের স্টিকার</span>
            </button>
          </div>

          {tab === 'color' ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {CNG_COLORS.map((item, idx) => {
                const unlocked = save.unlockedColors.includes(item.id);
                const equipped = save.equippedColor === item.id;
                const canAfford = save.taka >= item.price;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!unlocked && !canAfford}
                    onClick={() => onBuyOrEquipColor(item.id)}
                    className={`comic-btn-sm flex items-center justify-between gap-2 rounded-2xl p-2.5 text-left ${
                      idx % 2 === 0 ? '-rotate-[0.6deg]' : 'rotate-[0.6deg]'
                    } ${
                      equipped
                        ? 'bg-emerald-300 text-stone-950'
                        : unlocked
                        ? 'bg-white text-stone-950'
                        : canAfford
                        ? 'bg-yellow-200 text-stone-950'
                        : 'cursor-not-allowed bg-stone-300 text-stone-600 opacity-70'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-8 w-8 shrink-0 rounded-xl border-[2.5px] border-stone-950 shadow-inner"
                        style={{ backgroundColor: item.hex }}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black">{item.name}</div>
                        <div className="text-[11px] font-extrabold text-stone-800 tabular-nums">
                          {equipped
                            ? 'লাগানো আছে'
                            : unlocked
                            ? 'আনলক করা'
                            : `দাম: ৳${toBn(item.price)}`}
                        </div>
                      </div>
                    </div>
                    {equipped ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-900 stroke-[3]" />
                    ) : !unlocked ? (
                      <Lock className="h-4 w-4 shrink-0 text-red-700" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {CNG_STICKERS.map((item, idx) => {
                const unlocked = save.unlockedStickers.includes(item.id);
                const equipped = save.equippedSticker === item.id;
                const canAfford = save.taka >= item.price;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!unlocked && !canAfford}
                    onClick={() => onBuyOrEquipSticker(item.id)}
                    className={`comic-btn-sm flex items-center justify-between gap-2 rounded-2xl p-2.5 text-left ${
                      idx % 2 === 0 ? 'rotate-[0.6deg]' : '-rotate-[0.6deg]'
                    } ${
                      equipped
                        ? 'bg-emerald-300 text-stone-950'
                        : unlocked
                        ? 'bg-white text-stone-950'
                        : canAfford
                        ? 'bg-yellow-200 text-stone-950'
                        : 'cursor-not-allowed bg-stone-300 text-stone-600 opacity-70'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="mb-1 inline-block rounded-lg border-2 border-stone-950 px-2.5 py-0.5 text-xs font-black shadow-[1.5px_1.5px_0_#1c1917]"
                        style={{ backgroundColor: item.bgHex, color: item.textHex }}
                      >
                        {item.text}
                      </div>
                      <div className="text-[11px] font-extrabold text-stone-800 tabular-nums">
                        {equipped
                          ? 'লাগানো আছে'
                          : unlocked
                          ? 'আনলক করা'
                          : `দাম: ৳${toBn(item.price)}`}
                      </div>
                    </div>
                    {equipped ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-900 stroke-[3]" />
                    ) : !unlocked ? (
                      <Lock className="h-4 w-4 shrink-0 text-red-700" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
