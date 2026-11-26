import { AlertTriangle } from 'lucide-react';
import type { HudSnapshot } from '../types/game';

interface CockpitDashboardProps {
  hud: HudSnapshot;
  showTouchControls: boolean;
  cleanMode?: boolean;
}

export function CockpitDashboard({
  hud,
  showTouchControls,
  cleanMode = false,
}: CockpitDashboardProps) {
  if (cleanMode || !hud.rearHazard) return null;

  return (
    <div
      className={`pointer-events-none fixed right-2.5 z-20 sm:right-4 ${
        showTouchControls ? 'bottom-[15.2rem] sm:bottom-12' : 'bottom-12'
      }`}
    >
      <div className="sticker-chip flex items-center gap-1 rounded-full bg-red-600/95 px-2.5 py-0.5 text-[11px] font-black text-white shadow-[2px_2px_0_#1c1917]">
        <AlertTriangle className="h-3 w-3 shrink-0 fill-yellow-300 text-stone-950" />
        <span>{hud.rearHazard}</span>
      </div>
    </div>
  );
}
