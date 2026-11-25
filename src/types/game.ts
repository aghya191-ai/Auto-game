export type GamePhase = 'menu' | 'playing' | 'paused' | 'garage' | 'gameover';

export type CameraMode = 'external' | 'driver';

export type DeathReason = 'bus' | 'truck' | 'pedestrian' | 'gas' | 'red_light';

export type TrafficLightState = 'green' | 'yellow' | 'red';

export type WeatherCondition = 'sunny' | 'rainy' | 'foggy';

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

export type MissionMetric =
  | 'distance'
  | 'areas'
  | 'horns'
  | 'gas_refills'
  | 'bribes'
  | 'near_misses'
  | 'boost_time'
  | 'passengers'
  | 'signal_stops';

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
  completedMissionsTotal: number;
  loginStreak: number;
  lastLoginDate: string;
  lastStreakClaimDate: string;
  unlockedColors: string[];
  unlockedStickers: string[];
  equippedColor: string;
  equippedSticker: string;
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
  passengerFare: number;
  passengerDistLeft: number;
  passengerNearPickup: boolean;
  cameraMode: CameraMode;
  steerDir: -1 | 0 | 1;
  wrongWay: boolean;
  nearestGasDist: number | null;
  nearestGasAhead: boolean;
  aheadHazard: { label: string; sub: string; dist: number } | null;
  aheadTrafficLight: { state: TrafficLightState; dist: number; timeLeft: number } | null;
  weather: WeatherCondition;
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


