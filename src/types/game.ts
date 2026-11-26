export type GamePhase = 'menu' | 'playing' | 'paused' | 'garage' | 'gameover';

export type CameraMode = 'external' | 'driver';

export type DeathReason = 'bus' | 'truck' | 'pedestrian' | 'gas' | 'red_light';

export type TrafficLightState = 'green' | 'yellow' | 'red';

export type WeatherCondition = 'sunny' | 'rainy' | 'foggy';

export type AtmosphereMode = 'day' | 'evening' | 'rain';

export type GraphicsQuality = 'low' | 'high';

export type VehicleKind =
  | 'bus'
  | 'truck'
  | 'car'
  | 'rickshaw'
  | 'bike'
  | 'thelagari'
  | 'cng_ai';

export type AreaBuildingStyle = 'port' | 'oldtown' | 'market' | 'modern' | 'highway';

export interface AreaConfig {
  id: string;
  name: string;
  tagline: string;
  length: number;
  skyColor: string;
  fogColor: string;
  accentColor: string;
  buildingPalette: string[];
  buildingStyle: AreaBuildingStyle;
  trafficMultiplier: number;
  shopNames: string[];
  hasFlyover?: boolean;
}

export interface CngColorOption {
  id: string;
  name: string;
  hex: string;
  price: number;
}

export interface CngStickerOption {
  id: string;
  name: string;
  text: string;
  bgHex: string;
  textHex: string;
  price: number;
}

export type HornSoundId = 'classic_cng' | 'truck_air_horn' | 'bicycle_bell' | 'melody_bus';

export interface CngHornOption {
  id: HornSoundId;
  name: string;
  label: string;
  description: string;
  price: number;
  badgeBgClass: string;
}

export type MissionMetric =
  | 'distance'
  | 'areas'
  | 'horns'
  | 'gas_refills'
  | 'bribes'
  | 'near_misses'
  | 'boost_time'
  | 'passengers'
  | 'signal_stops'
  | 'events_survived';

export type CngUpgradeId = 'engine' | 'tank' | 'chassis' | 'handling';

export type CngUpgradesState = Record<CngUpgradeId, number>;

export interface CngUpgradeConfig {
  id: CngUpgradeId;
  name: string;
  description: string;
  effectPerLevel: string;
  prices: [number, number, number];
  badgeBgClass: string;
}

export type RandomEventKind =
  | 'road_digging'
  | 'strike_procession'
  | 'flooding'
  | 'vip_convoy';

export interface RandomEventConfig {
  kind: RandomEventKind;
  title: string;
  shortLabel: string;
  emoji: string;
  alertText: string;
  pillBgClass: string;
}

export interface DailyMission {
  id: string;
  title: string;
  metric: MissionMetric;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export type DriverRankId = 'learner' | 'rookie' | 'professional' | 'master' | 'legend';

export interface DriverRankTier {
  level: number;
  id: DriverRankId;
  title: string;
  tagline: string;
  minPoints: number;
  badgeTextClass: string;
  badgeBorderClass: string;
  badgeBgClass: string;
  barClass: string;
}

export interface DriverProgression {
  current: DriverRankTier;
  next: DriverRankTier | null;
  points: number;
  bestScore: number;
  completedMissions: number;
  progressPct: number;
  pointsToNext: number;
}

export interface PlayerSaveData {
  taka: number;
  highScore: number;
  driverXp: number;
  completedMissionsTotal: number;
  loginStreak: number;
  lastLoginDate: string;
  lastStreakClaimDate: string;
  unlockedColors: string[];
  unlockedStickers: string[];
  unlockedHorns: HornSoundId[];
  equippedColor: string;
  equippedSticker: string;
  equippedHorn: HornSoundId;
  upgrades: CngUpgradesState;
  missionDate: string;
  missions: DailyMission[];
}

export interface RadarEntity {
  dx: number;
  dz: number;
  kind:
    | 'bus'
    | 'truck'
    | 'car'
    | 'other'
    | 'gas'
    | 'bribe'
    | 'pickup'
    | 'dropoff'
    | 'hazard'
    | 'light_red'
    | 'light_yellow'
    | 'light_green';
}

export interface HudSnapshot {
  score: number;
  runTaka: number;
  nationalDamage: number;
  gas: number;
  hp: number;
  speedKmh: number;
  wanted: number;
  areaIndex: number;
  areaName: string;
  areaTagline: string;
  loopCount: number;
  distanceMeters: number;
  boosting: boolean;
  chasedCount: number;
  inGasZone: boolean;
  inBribeZone: boolean;
  passengerActive: boolean;
  passengerDestination: string;
  passengerFare: number;
  passengerDistLeft: number;
  passengerNearPickup: boolean;
  pickupProgress: number;
  activeEvent: { kind: RandomEventKind; label: string; emoji: string; timeLeft: number } | null;
  cameraMode: CameraMode;
  steerDir: -1 | 0 | 1;
  wrongWay: boolean;
  nearestGasDist: number | null;
  nearestGasAhead: boolean;
  aheadHazard: { label: string; sub: string; dist: number } | null;
  aheadTrafficLight: { state: TrafficLightState; dist: number; timeLeft: number } | null;
  rearHazard: string | null;
  weather: WeatherCondition;
  atmosphereMode: AtmosphereMode;
  graphicsQuality: GraphicsQuality;
  soundBombCooldown: number;
  radarEntities: RadarEntity[];
}

export interface GameOverSummary {
  reason: DeathReason;
  headline: string;
  subheadline: string;
  score: number;
  runTaka: number;
  nationalDamage: number;
  areaName: string;
  loopCount: number;
  distanceMeters: number;
  isNewRecord: boolean;
  crashPhotoDataUrl?: string;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  boost: boolean;
  hornPressed: boolean;
  lookBack?: boolean;
}

export type ToastPriority = 'gameover' | 'crash' | 'gas' | 'area' | 'level' | 'radio';

export interface GameEventToast {
  id: number;
  text: string;
  tone: 'info' | 'warning' | 'danger' | 'success' | 'pink';
  priority?: ToastPriority;
}

export type RadioClipKind = 'সংবাদ' | 'ট্রাফিক' | 'গতি';

export interface RadioBroadcastClip {
  id: number;
  station: string;
  kind: RadioClipKind;
  areaName: string;
  text: string;
}

export interface FloatingMoneyPopup {
  id: number;
  text: string;
  tone: 'gain' | 'damage';
  offsetX: number;
}


