import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AREAS,
  CNG_COLORS,
  CNG_STICKERS,
  pickRadioClip,
  RADIO_STATION_NAME,
} from './config/chattogramData';
import { GameEngine } from './three/GameEngine';
import type {
  GameEventToast,
  GameOverSummary,
  GamePhase,
  HudSnapshot,
  InputState,
  MissionMetric,
  PlayerSaveData,
  RadioBroadcastClip,
  RadioClipKind,
  ToastPriority,
} from './types/game';
import {
  claimDailyStreakBonus,
  getTodayKey,
  loadSaveData,
  savePlayerData,
} from './utils/storage';
import { HUD } from './components/HUD';
import { CockpitDashboard } from './components/CockpitDashboard';
import { MobileControls } from './components/MobileControls';
import { StartModal } from './components/StartModal';
import { GarageModal } from './components/GarageModal';
import { MissionsModal } from './components/MissionsModal';
import { GameOverModal } from './components/GameOverModal';
import { RickshawBorderStrip, SpeedLinesOverlay } from './components/StreetArtDecor';
import { getDriverProgression } from './utils/driverRank';
import { toBn } from './utils/bengaliDigits';
import type { FloatingMoneyPopup } from './types/game';

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  runTaka: 0,
  nationalDamage: 0,
  gas: 100,
  hp: 100,
  speedKmh: 0,
  wanted: 0,
  areaIndex: 0,
  areaName: AREAS[0].name,
  areaTagline: AREAS[0].tagline,
  loopCount: 1,
  distanceMeters: 0,
  boosting: false,
  chasedCount: 0,
  inGasZone: false,
  inBribeZone: false,
  passengerActive: false,
  passengerFare: 0,
  passengerDistLeft: 0,
  passengerNearPickup: false,
  cameraMode: 'external',
  steerDir: 0,
  wrongWay: false,
  nearestGasDist: null,
  nearestGasAhead: true,
  aheadHazard: null,
  aheadTrafficLight: null,
  soundBombCooldown: 0,
  weather: 'sunny',
  atmosphereMode: 'day',
  graphicsQuality: 'high',
  radarEntities: [],
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [save, setSave] = useState<PlayerSaveData>(() => loadSaveData());
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [returnToAfterGarage, setReturnToAfterGarage] = useState<'menu' | 'gameover'>('menu');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [gameOverSummary, setGameOverSummary] = useState<GameOverSummary | null>(null);
  const [showMissions, setShowMissions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [radioEnabled, setRadioEnabled] = useState(true);
  const [activeRadioClip, setActiveRadioClip] = useState<RadioBroadcastClip | null>(null);
  const [startAreaIndex, setStartAreaIndex] = useState(0);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false
  );
  const [areaBanner, setAreaBanner] = useState<{
    name: string;
    tagline: string;
    loopCount: number;
  } | null>(null);
  const [activeToast, setActiveToast] = useState<GameEventToast | null>(null);
  const [cleanMode, setCleanMode] = useState(false);
  const [floatingPopups, setFloatingPopups] = useState<FloatingMoneyPopup[]>([]);
  const [comboCount, setComboCount] = useState(0);
  const [comboBurstKey, setComboBurstKey] = useState(0);
  const [crashShakeActive, setCrashShakeActive] = useState(false);
  const [crashFlashKey, setCrashFlashKey] = useState(0);
  const [crashFlashActive, setCrashFlashActive] = useState(false);

  const areaBannerTimerRef = useRef<number>(0);
  const radioHideTimerRef = useRef<number>(0);
  const shakeResetTimerRef = useRef<number>(0);
  const flashResetTimerRef = useRef<number>(0);
  const comboTimerRef = useRef<number>(0);
  const toastHideTimerRef = useRef<number>(0);
  const toastQueueRef = useRef<GameEventToast[]>([]);
  const activeToastRef = useRef<GameEventToast | null>(null);
  const areaBannerActiveRef = useRef<boolean>(false);
  const toastIdRef = useRef(1);
  const popupIdRef = useRef(1);
  const radioIdRef = useRef(1);
  const lastRadioAtRef = useRef(0);
  const lastRadioTextRef = useRef('');
  const lastRadioAreaRef = useRef<number>(-1);
  const prevTakaRef = useRef<number>(0);
  const prevDamageRef = useRef<number>(0);
  const hudRef = useRef<HudSnapshot>(INITIAL_HUD);
  hudRef.current = hud;

  const announcedRankLevelRef = useRef<number>(
    getDriverProgression(save.highScore, save.completedMissionsTotal).current.level
  );

  const pushFloatingPopup = useCallback((text: string, tone: 'gain' | 'damage') => {
    const id = popupIdRef.current++;
    const offsetX = ((id % 5) - 2) * 20;
    setFloatingPopups((prev) => [...prev.slice(-3), { id, text, tone, offsetX }]);
    window.setTimeout(() => {
      setFloatingPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1350);
  }, []);

  const bumpCombo = useCallback((delta = 1) => {
    setComboCount((prev) => prev + delta);
    setComboBurstKey((k) => k + 1);
    clearTimeout(comboTimerRef.current);
    comboTimerRef.current = window.setTimeout(() => {
      setComboCount(0);
    }, 5200);
  }, []);

  const triggerCrashJuice = useCallback(() => {
    setComboCount(0);
    clearTimeout(comboTimerRef.current);
    setCrashShakeActive(false);
    requestAnimationFrame(() => setCrashShakeActive(true));
    clearTimeout(shakeResetTimerRef.current);
    shakeResetTimerRef.current = window.setTimeout(() => setCrashShakeActive(false), 340);

    setCrashFlashKey((k) => k + 1);
    setCrashFlashActive(true);
    clearTimeout(flashResetTimerRef.current);
    flashResetTimerRef.current = window.setTimeout(() => setCrashFlashActive(false), 260);
  }, []);

  const getToastPriorityWeight = (toast: Omit<GameEventToast, 'id'>): number => {
    const weights: Record<ToastPriority, number> = {
      gameover: 6,
      crash: 5,
      gas: 4,
      area: 3,
      level: 2,
      radio: 1,
    };
    if (toast.priority) return weights[toast.priority];
    const t = toast.text;
    if (
      toast.tone === 'danger' ||
      t.includes('ধাক্কা') ||
      t.includes('লাল বাতি') ||
      t.includes('ডিভাইডার') ||
      t.includes('ক্ষুব্ধ') ||
      t.includes('জ্যাম') ||
      t.includes('শব্দবোমা') ||
      t.includes('কম্বো')
    ) {
      return weights.crash;
    }
    if (
      t.includes('গ্যাস') ||
      t.includes('হলুদ জোন') ||
      t.includes('গোলাপি জোন') ||
      t.includes('যাত্রী') ||
      t.includes('সবুজ বাতি')
    ) {
      return weights.gas;
    }
    if (t.includes('এলাকা')) return weights.area;
    if (t.includes('লেভেল') || t.includes('পদোন্নতি') || t.includes('মিশন') || t.includes('স্ট্রিক')) {
      return weights.level;
    }
    if (t.includes('রেডিও') || t.includes('এফএম') || t.includes('ভিউ')) {
      return weights.radio;
    }
    return weights.gas;
  };

  const enqueueBoundedToast = useCallback((item: GameEventToast) => {
    const queue = [...toastQueueRef.current, item];
    if (queue.length > 3) {
      let dropIdx = 0;
      let lowestWeight = getToastPriorityWeight(queue[0]);
      for (let i = 1; i < queue.length; i++) {
        const w = getToastPriorityWeight(queue[i]);
        if (w < lowestWeight || (w === lowestWeight && queue[i].id < queue[dropIdx].id)) {
          lowestWeight = w;
          dropIdx = i;
        }
      }
      queue.splice(dropIdx, 1);
    }
    queue.sort((a, b) => {
      const diff = getToastPriorityWeight(b) - getToastPriorityWeight(a);
      return diff !== 0 ? diff : a.id - b.id;
    });
    toastQueueRef.current = queue;
  }, []);

  const showToastNow = useCallback((nextToast: GameEventToast) => {
    clearTimeout(toastHideTimerRef.current);
    activeToastRef.current = nextToast;
    setActiveToast(nextToast);
    toastHideTimerRef.current = window.setTimeout(() => {
      activeToastRef.current = null;
      setActiveToast(null);
      if (!areaBannerActiveRef.current && toastQueueRef.current.length > 0) {
        const upcoming = toastQueueRef.current.shift()!;
        showToastNow(upcoming);
      }
    }, 1500);
  }, []);

  const pushToast = useCallback(
    (toast: Omit<GameEventToast, 'id'>) => {
      const nextToast: GameEventToast = { ...toast, id: toastIdRef.current++ };
      const nextWeight = getToastPriorityWeight(nextToast);

      if (areaBannerActiveRef.current && nextWeight < 5) {
        enqueueBoundedToast(nextToast);
        return;
      }

      const current = activeToastRef.current;
      if (!current) {
        showToastNow(nextToast);
        return;
      }

      if (nextWeight > getToastPriorityWeight(current)) {
        enqueueBoundedToast(current);
        showToastNow(nextToast);
        return;
      }

      enqueueBoundedToast(nextToast);
    },
    [enqueueBoundedToast, showToastNow]
  );

  const triggerRadioBroadcast = useCallback(
    (preferKind?: RadioClipKind, force = false) => {
      if (!radioEnabled) return;
      const now = Date.now();
      if (!force && now - lastRadioAtRef.current < 6500) return;

      const currentHud = hudRef.current;
      const area = AREAS[currentHud.areaIndex] ?? AREAS[0];
      const picked = pickRadioClip({
        areaId: area.id,
        areaName: currentHud.areaName || area.name,
        speedKmh: currentHud.speedKmh,
        boosting: currentHud.boosting,
        wrongWay: currentHud.wrongWay,
        weather: currentHud.weather,
        lastText: lastRadioTextRef.current,
        preferKind,
      });

      lastRadioAtRef.current = now;
      lastRadioTextRef.current = picked.text;

      const clip: RadioBroadcastClip = {
        id: radioIdRef.current++,
        station: RADIO_STATION_NAME,
        kind: picked.kind,
        areaName: currentHud.areaName || area.name,
        text: picked.text,
      };
      setActiveRadioClip(clip);
      engineRef.current?.sound.playRadioBroadcast(picked.text, picked.kind);

      clearTimeout(radioHideTimerRef.current);
      radioHideTimerRef.current = window.setTimeout(() => {
        setActiveRadioClip((cur) => (cur?.id === clip.id ? null : cur));
      }, 6200);
    },
    [radioEnabled]
  );

  const handleMissionProgress = useCallback((metric: MissionMetric, delta: number) => {
    setSave((prev) => {
      let changed = false;
      let newlyCompleted = 0;
      const nextMissions = prev.missions.map((m) => {
        if (m.metric === metric && m.progress < m.target) {
          changed = true;
          const nextProgress = Math.min(m.target, m.progress + delta);
          if (nextProgress >= m.target) {
            newlyCompleted += 1;
          }
          return { ...m, progress: nextProgress };
        }
        return m;
      });
      if (!changed) return prev;
      const updated: PlayerSaveData = {
        ...prev,
        completedMissionsTotal: prev.completedMissionsTotal + newlyCompleted,
        missions: nextMissions,
      };
      savePlayerData(updated);
      return updated;
    });
  }, []);

  // Mount Three.js GameEngine once
  useEffect(() => {
    if (!mountRef.current) return;
    const initialSave = loadSaveData();

    const engine = new GameEngine(
      mountRef.current,
      {
        onHudUpdate: (snapshot) => {
          const takaGain = snapshot.runTaka - prevTakaRef.current;
          const dmgGain = snapshot.nationalDamage - prevDamageRef.current;
          if (prevTakaRef.current >= 0 && takaGain >= 20) {
            pushFloatingPopup(`+৳${toBn(takaGain)}`, 'gain');
            bumpCombo(1);
          }
          if (prevDamageRef.current >= 0 && dmgGain >= 150) {
            pushFloatingPopup(`+৳${toBn(dmgGain)} ক্ষতি!`, 'damage');
          }
          prevTakaRef.current = snapshot.runTaka;
          prevDamageRef.current = snapshot.nationalDamage;
          setHud(snapshot);
        },
        onAreaEnter: (name, tagline, loopCount) => {
          areaBannerActiveRef.current = true;
          setAreaBanner({ name, tagline, loopCount });
          clearTimeout(areaBannerTimerRef.current);
          areaBannerTimerRef.current = window.setTimeout(() => {
            areaBannerActiveRef.current = false;
            setAreaBanner(null);
            if (!activeToastRef.current && toastQueueRef.current.length > 0) {
              const next = toastQueueRef.current.shift()!;
              showToastNow(next);
            }
          }, 2000);
        },
        onToast: (t) => pushToast(t),
        onCrashJuice: () => triggerCrashJuice(),
        onMissionProgress: handleMissionProgress,
        onGameOver: (summary) => {
          clearTimeout(toastHideTimerRef.current);
          clearTimeout(areaBannerTimerRef.current);
          areaBannerActiveRef.current = false;
          toastQueueRef.current = [];
          activeToastRef.current = null;
          setActiveToast(null);
          setAreaBanner(null);
          setGameOverSummary(summary);
          setPhase('gameover');
          setSave((prev) => {
            const updated: PlayerSaveData = {
              ...prev,
              taka: prev.taka + summary.runTaka,
              highScore: Math.max(prev.highScore, summary.score),
            };
            savePlayerData(updated);
            return updated;
          });
        },
      },
      initialSave.equippedColor,
      initialSave.equippedSticker,
      initialSave.highScore
    );

    engineRef.current = engine;

    return () => {
      clearTimeout(areaBannerTimerRef.current);
      clearTimeout(radioHideTimerRef.current);
      clearTimeout(shakeResetTimerRef.current);
      clearTimeout(flashResetTimerRef.current);
      clearTimeout(comboTimerRef.current);
      clearTimeout(toastHideTimerRef.current);
      engine.dispose();
      engineRef.current = null;
    };
  }, [bumpCombo, handleMissionProgress, pushFloatingPopup, pushToast, showToastNow, triggerCrashJuice]);

  const handleToggleCamera = useCallback(() => {
    if (!engineRef.current) return;
    if (phase !== 'playing' && phase !== 'paused' && phase !== 'menu') return;
    const next = engineRef.current.toggleCameraMode();
    if (phase !== 'menu') {
      pushToast({
        text: next === 'driver' ? 'ড্রাইভার ভিউ চালু 🛺' : 'বাইরের ভিউ চালু 🎥',
        tone: 'info',
        priority: 'radio',
      });
    }
  }, [phase, pushToast]);

  const handleToggleRadio = useCallback(() => {
    setRadioEnabled((prev) => {
      const next = !prev;
      engineRef.current?.sound.setRadioEnabled(next);
      if (!next) {
        clearTimeout(radioHideTimerRef.current);
        setActiveRadioClip(null);
      }
      if (phase === 'playing') {
        pushToast({
          text: next ? 'চাঁটগাঁ এফএম ৯৯.৮ চালু 📻' : 'এফএম রেডিও বন্ধ',
          tone: 'info',
          priority: 'radio',
        });
      }
      return next;
    });
  }, [phase, pushToast]);

  // Keyboard controls (WASD, Arrows, Shift Boost, H Horn, C Camera, V Look Back, T Weather, R Radio, Escape Pause)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      if (!engineRef.current) return;
      const code = e.code;

      if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space'
      ) {
        if (phase === 'playing') e.preventDefault();
      }

      if (code === 'KeyA' || code === 'ArrowLeft') {
        engineRef.current.setInput({ left: isDown });
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        engineRef.current.setInput({ right: isDown });
      } else if (code === 'KeyW' || code === 'ArrowUp') {
        engineRef.current.setInput({ up: isDown });
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        engineRef.current.setInput({ down: isDown });
      } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
        engineRef.current.setInput({ boost: isDown });
      } else if (code === 'KeyV') {
        engineRef.current.setInput({ lookBack: isDown });
      } else if (code === 'KeyH' && isDown && !e.repeat) {
        engineRef.current.triggerHorn();
      } else if (code === 'KeyB' && isDown && !e.repeat) {
        engineRef.current.triggerSoundBomb();
      } else if (code === 'KeyC' && isDown && !e.repeat) {
        handleToggleCamera();
      } else if (code === 'KeyT' && isDown && !e.repeat && (phase === 'playing' || phase === 'menu')) {
        engineRef.current.toggleAtmosphereMode();
      } else if (code === 'KeyR' && isDown && !e.repeat && phase === 'playing') {
        handleToggleRadio();
      } else if (code === 'Escape' && isDown && !e.repeat) {
        if (phase === 'playing') {
          engineRef.current.setPhase('paused');
          setPhase('paused');
        } else if (phase === 'paused') {
          engineRef.current.setPhase('playing');
          setPhase('playing');
        }
      }
    };

    const onDown = (e: KeyboardEvent) => handleKey(e, true);
    const onUp = (e: KeyboardEvent) => handleKey(e, false);
    const onBlur = () => {
      engineRef.current?.setInput({
        left: false,
        right: false,
        up: false,
        down: false,
        boost: false,
        lookBack: false,
      });
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleToggleCamera, handleToggleRadio, phase]);

  // Periodic & reactive Chattogram FM radio scheduler during active gameplay
  useEffect(() => {
    if (phase !== 'playing' || !radioEnabled) {
      if (phase !== 'playing') {
        clearTimeout(radioHideTimerRef.current);
        setActiveRadioClip(null);
        engineRef.current?.sound.stopRadioSpeech();
      }
      return;
    }

    lastRadioAreaRef.current = hudRef.current.areaIndex;
    const initialTimer = window.setTimeout(() => {
      triggerRadioBroadcast('সংবাদ', true);
    }, 2800);

    const intervalId = window.setInterval(() => {
      triggerRadioBroadcast(undefined, false);
    }, 14500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [phase, radioEnabled, triggerRadioBroadcast]);

  // React to area transitions & extreme speed / wrong-way commentary
  useEffect(() => {
    if (phase !== 'playing' || !radioEnabled) return;

    if (lastRadioAreaRef.current !== hud.areaIndex) {
      lastRadioAreaRef.current = hud.areaIndex;
      triggerRadioBroadcast('সংবাদ', false);
      return;
    }

    if (hud.wrongWay && Date.now() - lastRadioAtRef.current >= 10500) {
      triggerRadioBroadcast('ট্রাফিক', false);
    } else if ((hud.speedKmh >= 80 || hud.boosting) && Date.now() - lastRadioAtRef.current >= 11500) {
      triggerRadioBroadcast('গতি', false);
    }
  }, [hud.areaIndex, hud.boosting, hud.speedKmh, hud.wrongWay, phase, radioEnabled, triggerRadioBroadcast]);

  const handleSelectStartArea = (idx: number) => {
    setStartAreaIndex(idx);
    engineRef.current?.setStartAreaIndex(idx);
  };

  const handleStartGame = () => {
    setGameOverSummary(null);
    setShowMissions(false);
    clearTimeout(toastHideTimerRef.current);
    clearTimeout(areaBannerTimerRef.current);
    areaBannerActiveRef.current = false;
    toastQueueRef.current = [];
    activeToastRef.current = null;
    setActiveToast(null);
    setAreaBanner(null);
    prevTakaRef.current = 0;
    prevDamageRef.current = 0;
    setFloatingPopups([]);
    setComboCount(0);
    lastRadioAtRef.current = 0;
    lastRadioAreaRef.current = startAreaIndex;
    setPhase('playing');
    engineRef.current?.startNewRun(startAreaIndex);
  };

  const handleOpenGarage = (from: 'menu' | 'gameover') => {
    setReturnToAfterGarage(from);
    setShowMissions(false);
    setPhase('garage');
    engineRef.current?.setPhase('garage');
  };

  const handleCloseGarage = () => {
    setPhase(returnToAfterGarage);
    engineRef.current?.setPhase(returnToAfterGarage === 'menu' ? 'menu' : 'gameover');
  };

  const handleTogglePause = () => {
    if (phase === 'playing') {
      engineRef.current?.setPhase('paused');
      setPhase('paused');
    } else if (phase === 'paused') {
      engineRef.current?.setPhase('playing');
      setPhase('playing');
    }
  };

  const handleToggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.sound.setMuted(next);
      return next;
    });
  };

  const handleToggleMusic = () => {
    setMusicEnabled((prev) => {
      const next = !prev;
      engineRef.current?.sound.setMusicEnabled(next);
      return next;
    });
  };

  const handleBuyOrEquipColor = (colorId: string) => {
    const item = CNG_COLORS.find((c) => c.id === colorId);
    if (!item) return;

    setSave((prev) => {
      const unlocked = prev.unlockedColors.includes(colorId);
      if (!unlocked && prev.taka < item.price) return prev;
      const next: PlayerSaveData = {
        ...prev,
        taka: unlocked ? prev.taka : prev.taka - item.price,
        unlockedColors: unlocked ? prev.unlockedColors : [...prev.unlockedColors, colorId],
        equippedColor: colorId,
      };
      savePlayerData(next);
      engineRef.current?.updateAppearance(next.equippedColor, next.equippedSticker);
      return next;
    });
  };

  const handleBuyOrEquipSticker = (stickerId: string) => {
    const item = CNG_STICKERS.find((s) => s.id === stickerId);
    if (!item) return;

    setSave((prev) => {
      const unlocked = prev.unlockedStickers.includes(stickerId);
      if (!unlocked && prev.taka < item.price) return prev;
      const next: PlayerSaveData = {
        ...prev,
        taka: unlocked ? prev.taka : prev.taka - item.price,
        unlockedStickers: unlocked
          ? prev.unlockedStickers
          : [...prev.unlockedStickers, stickerId],
        equippedSticker: stickerId,
      };
      savePlayerData(next);
      engineRef.current?.updateAppearance(next.equippedColor, next.equippedSticker);
      return next;
    });
  };

  const handleClaimMission = (missionId: string) => {
    setSave((prev) => {
      let gained = 0;
      const nextMissions = prev.missions.map((m) => {
        if (m.id === missionId && !m.claimed && m.progress >= m.target) {
          gained = m.reward;
          return { ...m, claimed: true };
        }
        return m;
      });
      if (gained === 0) return prev;
      const next: PlayerSaveData = {
        ...prev,
        taka: prev.taka + gained,
        missions: nextMissions,
      };
      savePlayerData(next);
      pushToast({ text: `মিশন পুরস্কার +৳${toBn(gained)} পকেটে!`, tone: 'success', priority: 'level' });
      return next;
    });
  };

  const handleClaimDailyStreak = () => {
    setSave((prev) => {
      const result = claimDailyStreakBonus(prev);
      if (!result) return prev;
      pushToast({
        text: `দিন ${toBn(result.updated.loginStreak)} স্ট্রিক বোনাস +৳${toBn(result.reward)} পকেটে!`,
        tone: 'success',
        priority: 'level',
      });
      return result.updated;
    });
  };

  const handleMobileInput = (partial: Partial<InputState>) => {
    engineRef.current?.setInput(partial);
  };

  const handleMobileHorn = () => {
    engineRef.current?.triggerHorn();
  };

  const unclaimedMissions = save.missions.filter(
    (m) => !m.claimed && m.progress >= m.target
  ).length;

  const effectiveBestScore =
    phase === 'playing' || phase === 'paused'
      ? Math.max(save.highScore, hud.score)
      : save.highScore;
  const driverProgression = getDriverProgression(effectiveBestScore, save.completedMissionsTotal);

  useEffect(() => {
    const lvl = driverProgression.current.level;
    if (lvl > announcedRankLevelRef.current) {
      announcedRankLevelRef.current = lvl;
      if (phase === 'playing' || phase === 'gameover') {
        pushToast({
          text: `পদোন্নতি! নতুন ড্রাইভার লেভেল ${toBn(lvl)}: ${driverProgression.current.title} 🏆`,
          tone: 'success',
          priority: 'level',
        });
      }
    }
  }, [driverProgression.current.level, driverProgression.current.title, phase, pushToast]);

  const dangerVignette =
    phase === 'playing' && (hud.hp < 35 || hud.gas < 25 || hud.chasedCount > 0 || hud.wrongWay);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-stone-950 ${
        crashShakeActive ? 'animate-screen-shake' : ''
      }`}
    >
      {/* Dedicated WebGL Mount Container */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* Boost Comic Speed Lines & Edge Vignette */}
      {phase === 'playing' && <SpeedLinesOverlay active={hud.boosting || hud.speedKmh >= 85} />}
      {phase === 'playing' && (
        <div
          className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-200"
          style={{
            boxShadow: dangerVignette
              ? 'inset 0 0 90px rgba(220, 38, 38, 0.58)'
              : 'inset 0 0 70px rgba(12, 10, 9, 0.34)',
          }}
        />
      )}

      {/* Crash Impact Flash Overlay */}
      {crashFlashActive && (
        <div
          key={crashFlashKey}
          className="animate-crash-flash pointer-events-none fixed inset-0 z-40"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,255,255,0.85) 0%, rgba(239,68,68,0.72) 70%, rgba(153,27,27,0.9) 100%)',
          }}
        />
      )}

      {/* Live Gameplay HUD */}
      {(phase === 'playing' || phase === 'paused') && (
        <HUD
          hud={hud}
          totalTaka={save.taka}
          driverProgression={driverProgression}
          phase={phase}
          muted={muted}
          musicEnabled={musicEnabled}
          radioEnabled={radioEnabled}
          activeRadioClip={activeRadioClip}
          floatingPopups={floatingPopups}
          comboCount={comboCount}
          comboBurstKey={comboBurstKey}
          showTouchControls={showTouchControls}
          cleanMode={cleanMode}
          areaBanner={areaBanner}
          activeToast={activeToast}
          onToggleMute={handleToggleMute}
          onToggleMusic={handleToggleMusic}
          onToggleRadio={handleToggleRadio}
          onNextRadioClip={() => triggerRadioBroadcast(undefined, true)}
          onToggleCamera={handleToggleCamera}
          onToggleAtmosphere={() => engineRef.current?.toggleAtmosphereMode()}
          onToggleGraphics={() => engineRef.current?.toggleGraphicsQuality()}
          onTogglePause={handleTogglePause}
          onToggleTouch={() => setShowTouchControls((v) => !v)}
          onToggleCleanMode={() => setCleanMode((v) => !v)}
          onOpenMissions={() => {
            if (phase === 'playing') {
              engineRef.current?.setPhase('paused');
              setPhase('paused');
            }
            setShowMissions(true);
          }}
        />
      )}

      {/* Driver View Instrument Dashboard */}
      {(phase === 'playing' || phase === 'paused') && hud.cameraMode === 'driver' && (
        <CockpitDashboard
          hud={hud}
          showTouchControls={showTouchControls}
          cleanMode={cleanMode}
        />
      )}

      {/* Mobile Touch Controls */}
      {phase === 'playing' && showTouchControls && (
        <MobileControls
          soundBombCooldown={hud.soundBombCooldown}
          onInputChange={handleMobileInput}
          onHorn={handleMobileHorn}
          onSoundBomb={() => engineRef.current?.triggerSoundBomb()}
        />
      )}

      {/* Start Menu */}
      {phase === 'menu' && (
        <>
          <StartModal
            taka={save.taka}
            highScore={save.highScore}
            driverProgression={driverProgression}
            loginStreak={save.loginStreak}
            streakClaimedToday={save.lastStreakClaimDate === getTodayKey()}
            startAreaIndex={startAreaIndex}
            cameraMode={hud.cameraMode}
            atmosphereMode={hud.atmosphereMode}
            graphicsQuality={hud.graphicsQuality}
            missions={save.missions}
            unclaimedMissions={unclaimedMissions}
            muted={muted}
            musicEnabled={musicEnabled}
            radioEnabled={radioEnabled}
            showTouchControls={showTouchControls}
            cleanMode={cleanMode}
            onSelectArea={handleSelectStartArea}
            onToggleCamera={handleToggleCamera}
            onToggleAtmosphere={() => engineRef.current?.toggleAtmosphereMode()}
            onToggleGraphics={() => engineRef.current?.toggleGraphicsQuality()}
            onToggleMute={handleToggleMute}
            onToggleMusic={handleToggleMusic}
            onToggleRadio={handleToggleRadio}
            onToggleTouch={() => setShowTouchControls((v) => !v)}
            onToggleCleanMode={() => setCleanMode((v) => !v)}
            onClaimStreak={handleClaimDailyStreak}
            onStart={handleStartGame}
            onOpenGarage={() => handleOpenGarage('menu')}
            onOpenMissions={() => setShowMissions(true)}
          />
          {activeToast && (
            <div className="pointer-events-none fixed left-1/2 top-20 z-30 flex w-[88vw] max-w-sm -translate-x-1/2 justify-center">
              <div
                key={activeToast.id}
                className="animate-toast-pop sticker-chip max-h-[44px] truncate rounded-full bg-emerald-400/90 px-4 py-1 text-center text-xs font-black text-stone-950 sm:text-sm"
              >
                {activeToast.text}
              </div>
            </div>
          )}
        </>
      )}

      {/* Pause Overlay — Bangladeshi Street-Art Card */}
      {phase === 'paused' && !showMissions && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <div className="sticker-panel w-full max-w-sm overflow-hidden rounded-3xl bg-[#fef6df] text-center text-stone-950">
            <div className="bg-amber-400 px-5 pt-3 pb-2.5">
              <h2 className="comic-text-stroke text-3xl font-black text-white">খেলা বিরতি!</h2>
              <p className="mt-0.5 text-xs font-extrabold text-stone-900">
                এলাকা: {hud.areaName} · লুপ #{toBn(hud.loopCount)}
              </p>
            </div>
            <RickshawBorderStrip />
            <div className="flex flex-col gap-3 p-5">
              <button
                type="button"
                onClick={handleTogglePause}
                className="comic-btn -rotate-1 rounded-2xl bg-emerald-400 py-3 text-base font-black text-stone-950 whitespace-nowrap"
              >
                আবার চালান!
              </button>
              <button
                type="button"
                onClick={() => setCleanMode((v) => !v)}
                className={`comic-btn rounded-2xl py-2.5 text-sm font-black text-stone-950 whitespace-nowrap ${
                  cleanMode ? 'bg-cyan-400' : 'bg-yellow-300'
                }`}
              >
                ক্লিন মোড: {cleanMode ? 'চালু' : 'বন্ধ'}
              </button>
              <button
                type="button"
                onClick={() => setShowMissions(true)}
                className="comic-btn rotate-1 rounded-2xl bg-sky-400 py-2.5 text-sm font-black text-stone-950 whitespace-nowrap"
              >
                দৈনিক মিশন দেখুন
              </button>
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.setPhase('menu');
                  setPhase('menu');
                }}
                className="comic-btn rounded-2xl bg-rose-400 py-2.5 text-sm font-black text-stone-950 whitespace-nowrap"
              >
                মূল মেনুতে যান
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Garage Overlay */}
      {phase === 'garage' && (
        <GarageModal
          save={save}
          onBuyOrEquipColor={handleBuyOrEquipColor}
          onBuyOrEquipSticker={handleBuyOrEquipSticker}
          onClose={handleCloseGarage}
        />
      )}

      {/* Game Over Satirical Newspaper */}
      {phase === 'gameover' && gameOverSummary && (
        <GameOverModal
          summary={gameOverSummary}
          totalTaka={save.taka}
          driverProgression={driverProgression}
          onRestart={handleStartGame}
          onOpenGarage={() => handleOpenGarage('gameover')}
          onOpenMissions={() => setShowMissions(true)}
        />
      )}

      {/* Daily Missions Modal */}
      {showMissions && (
        <MissionsModal
          missions={save.missions}
          taka={save.taka}
          driverProgression={driverProgression}
          onClaim={handleClaimMission}
          onClose={() => setShowMissions(false)}
        />
      )}
    </div>
  );
}
