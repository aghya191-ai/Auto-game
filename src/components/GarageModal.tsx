import { useState } from 'react';
import { Check, Lock, Paintbrush, Sticker, Volume2, Wrench, X } from 'lucide-react';
import { CNG_COLORS, CNG_HORNS, CNG_STICKERS, CNG_UPGRADES } from '../config/chattogramData';
import type { CngUpgradeId, HornSoundId, PlayerSaveData } from '../types/game';
import { toBn } from '../utils/bengaliDigits';
import { RickshawBorderStrip } from './StreetArtDecor';

interface GarageModalProps {
  save: PlayerSaveData;
  onBuyOrEquipColor: (colorId: string) => void;
  onBuyOrEquipSticker: (stickerId: string) => void;
  onBuyOrEquipHorn: (hornId: HornSoundId) => void;
  onPreviewHorn: (hornId: HornSoundId) => void;
  onBuyUpgrade: (upgradeId: CngUpgradeId) => void;
  onClose: () => void;
}

export function GarageModal({
  save,
  onBuyOrEquipColor,
  onBuyOrEquipSticker,
  onBuyOrEquipHorn,
  onPreviewHorn,
  onBuyUpgrade,
  onClose,
}: GarageModalProps) {
  const [tab, setTab] = useState<'color' | 'sticker' | 'horn' | 'upgrade'>('color');

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
              লাইভ ৩D প্রিভিউ — রং, স্টিকার, হর্ন ও ইঞ্জিন আপগ্রেড
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
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('color')}
              className={`comic-btn-sm flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black sm:text-sm whitespace-nowrap ${
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
              className={`comic-btn-sm flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black sm:text-sm whitespace-nowrap ${
                tab === 'sticker'
                  ? 'bg-pink-400 text-stone-950 rotate-1'
                  : 'bg-white text-stone-800'
              }`}
            >
              <Sticker className="h-4 w-4 stroke-[2.5]" />
              <span>পেছনের স্টিকার</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('horn')}
              className={`comic-btn-sm flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black sm:text-sm whitespace-nowrap ${
                tab === 'horn'
                  ? 'bg-sky-400 text-stone-950 -rotate-1'
                  : 'bg-white text-stone-800'
              }`}
            >
              <Volume2 className="h-4 w-4 stroke-[2.5]" />
              <span>হর্নের সাউন্ড</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('upgrade')}
              className={`comic-btn-sm flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black sm:text-sm whitespace-nowrap ${
                tab === 'upgrade'
                  ? 'bg-amber-400 text-stone-950 rotate-1'
                  : 'bg-white text-stone-800'
              }`}
            >
              <Wrench className="h-4 w-4 stroke-[2.5]" />
              <span>ইঞ্জিন আপগ্রেড</span>
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
          ) : tab === 'sticker' ? (
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
          ) : tab === 'horn' ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CNG_HORNS.map((item, idx) => {
                const unlocked = save.unlockedHorns.includes(item.id);
                const equipped = save.equippedHorn === item.id;
                const canAfford = save.taka >= item.price;

                return (
                  <div
                    key={item.id}
                    className={`flex items-stretch gap-2 rounded-2xl border-[2.5px] border-stone-950 p-2 shadow-[2.5px_2.5px_0_#1c1917] ${
                      idx % 2 === 0 ? '-rotate-[0.4deg]' : 'rotate-[0.4deg]'
                    } ${
                      equipped
                        ? 'bg-emerald-300 text-stone-950'
                        : unlocked
                        ? 'bg-white text-stone-950'
                        : canAfford
                        ? 'bg-yellow-200 text-stone-950'
                        : 'bg-stone-300 text-stone-700 opacity-85'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!unlocked && !canAfford}
                      onClick={() => onBuyOrEquipHorn(item.id)}
                      className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-2 py-1 text-left ${
                        !unlocked && !canAfford ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-xs font-black sm:text-sm">{item.name}</span>
                          <span
                            className={`rounded-md border border-stone-950 px-1.5 py-0.5 text-[10px] font-black text-stone-950 ${item.badgeBgClass}`}
                          >
                            {item.label}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-stone-800">
                          {item.description}
                        </div>
                        <div className="mt-1 text-[11px] font-black text-stone-900 tabular-nums">
                          {equipped
                            ? 'লাগানো আছে'
                            : unlocked
                            ? 'আনলক করা · লাগাতে ট্যাপ করুন'
                            : `দাম: ৳${toBn(item.price)}`}
                        </div>
                      </div>
                      {equipped ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-900 stroke-[3]" />
                      ) : !unlocked ? (
                        <Lock className="h-4 w-4 shrink-0 text-red-700" />
                      ) : null}
                    </button>

                    <button
                      type="button"
                      onClick={() => onPreviewHorn(item.id)}
                      title={`${item.label} শুনুন`}
                      className="comic-btn-sm flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-amber-300 px-2.5 py-1.5 text-[10px] font-black text-stone-950"
                    >
                      <Volume2 className="h-4 w-4 stroke-[2.5]" />
                      <span>শুনুন</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CNG_UPGRADES.map((item, idx) => {
                const level = save.upgrades[item.id] ?? 0;
                const maxed = level >= 3;
                const nextPrice = maxed ? 0 : item.prices[level];
                const canAfford = !maxed && save.taka >= nextPrice;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={maxed || !canAfford}
                    onClick={() => onBuyUpgrade(item.id)}
                    className={`comic-btn-sm flex items-center justify-between gap-3 rounded-2xl p-3 text-left ${
                      idx % 2 === 0 ? '-rotate-[0.4deg]' : 'rotate-[0.4deg]'
                    } ${
                      maxed
                        ? 'bg-emerald-300 text-stone-950'
                        : canAfford
                        ? 'bg-white text-stone-950'
                        : 'cursor-not-allowed bg-stone-300 text-stone-600 opacity-75'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-black sm:text-sm">{item.name}</span>
                        <span
                          className={`rounded-md border border-stone-950 px-1.5 py-0.5 text-[10px] font-black text-stone-950 ${item.badgeBgClass}`}
                        >
                          {item.effectPerLevel}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] font-bold text-stone-800">
                        {item.description}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {[0, 1, 2].map((pip) => (
                          <span
                            key={pip}
                            className={`h-2.5 w-6 rounded-full border-[1.5px] border-stone-950 ${
                              pip < level ? 'bg-emerald-500' : 'bg-stone-200'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-[10px] font-black text-stone-700 tabular-nums">
                          ধাপ {toBn(level)}/{toBn(3)}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {maxed ? (
                        <span className="inline-flex items-center gap-1 rounded-xl border-2 border-stone-950 bg-yellow-300 px-2.5 py-1 text-[11px] font-black text-stone-950">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          সর্বোচ্চ
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-xl border-2 border-stone-950 px-2.5 py-1 text-xs font-black tabular-nums ${
                            canAfford ? 'bg-amber-300 text-stone-950' : 'bg-stone-400 text-stone-800'
                          }`}
                        >
                          {!canAfford && <Lock className="h-3 w-3" />}
                          ৳{toBn(nextPrice)}
                        </span>
                      )}
                    </div>
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
