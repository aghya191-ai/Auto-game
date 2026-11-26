import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AREAS,
  CNG_COLORS,
  CNG_STICKERS,
  RANDOM_EVENTS,
  SATIRE_HEADLINES,
} from '../config/chattogramData';
import type {
  AtmosphereMode,
  CameraMode,
  CngUpgradesState,
  DeathReason,
  GameEventToast,
  GameOverSummary,
  GamePhase,
  GraphicsQuality,
  HudSnapshot,
  InputState,
  MissionMetric,
  RadarEntity,
  RandomEventKind,
  TrafficLightState,
  VehicleKind,
  WeatherCondition,
} from '../types/game';
import { SoundEngine } from '../audio/soundEngine';
import {
  createAreaGantry,
  createCngModel,
  createCockpitModel,
  createFlyoverPillar,
  createOverheadRoadSign,
  createPedestrianModel,
  createProtestPlacard,
  createRoadDivider,
  createRoadDiggingBarrier,
  createStreetLight,
  createTeaStallBench,
  createTrafficLightModel,
  createVehicleModel,
  createVipConvoyVehicle,
  createZonePad,
  disposePedestrianAssetPool,
  pickRandomPedestrianStyle,
  type CngRig,
  type CockpitRig,
  type PedestrianPose,
  type PedestrianRig,
  type PedestrianStyle,
  type RoadDiggingRig,
  type SpeechCategory,
  type TrafficLightRig,
  type TrafficModelRig,
} from './models';
import { StreetDressingManager } from './streetDressing';
import {
  createLightGlowTexture,
  createMedianCurbTexture,
  createRoadTextureSet,
  createSidewalkTexture,
} from './textures';
import { disposeVehicleAssetPool } from './vehicleTextures';
import { toBn } from '../utils/bengaliDigits';

// Reusable module-scope math helpers (Zero GC in render loop)
const _targetTop = new THREE.Color();
const _targetHorizon = new THREE.Color();
const _targetSmog = new THREE.Color();
const _targetSunCol = new THREE.Color();
const _targetHemiSky = new THREE.Color();
const _targetHemiGround = new THREE.Color();
const _targetSunLightCol = new THREE.Color();
const _targetSunDir = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _puffDummy = new THREE.Object3D();
const _dustDummy = new THREE.Object3D();
const _debrisDummy = new THREE.Object3D();
const _debrisColor = new THREE.Color();

const LANES = [-6.0, -2.8, 2.8, 6.0];
const RAIN_COUNT = 340;
const PUFF_COUNT = 28;
const DUST_COUNT = 44;
const DEBRIS_COUNT = 76;
const MAX_DETAILED_PEDESTRIANS = 25;

interface LodEntry {
  rig: PedestrianRig;
  distSq: number;
}

interface ExhaustPuff {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
}

interface DebrisParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  scale: number;
  age: number;
  maxAge: number;
}

interface RoadChunk {
  chunkIndex: number;
  group: THREE.Group;
  sceneryGroup: THREE.Group;
  signGroup: THREE.Group;
  flyoverPillar: THREE.Group;
  hasDivider: boolean;
  builtAreaIndex: number;
  z: number;
}

interface TrafficEntity {
  rig: TrafficModelRig;
  kind: VehicleKind;
  x: number;
  targetX: number;
  z: number;
  speed: number;
  baseSpeed: number;
  prevSpeed: number;
  direction: 1 | -1; // 1 = forward (-Z), -1 = oncoming (+Z)
  nearMissed: boolean;
  laneTimer: number;
  honked: boolean;
  bouncePhase: number;
  driftPhase: number;
  driftSpeed: number;
  driftAmp: number;
  suddenStopTimer: number;
  suddenStopCooldown: number;
  turnSignalDir: -1 | 0 | 1 | 2;
  isVipConvoy?: boolean;
}

interface PedestrianEntity {
  rig: PedestrianRig;
  propGroup?: THREE.Group;
  x: number;
  z: number;
  baseY: number;
  walkDir: number;
  walkSpeed: number;
  basePose: PedestrianPose;
  isChasing: boolean;
  isProtestor?: boolean;
  canCollide: boolean;
  hitCooldown: number;
  animPhase: number;
  jumpBackTimer: number;
  fallTimer: number;
  speechTimer: number;
  reactYaw: number;
  reactTimer: number;
  closePassReacted?: boolean;
}

interface ZoneEntity {
  group: THREE.Group;
  type: 'gas' | 'bribe' | 'dropoff';
  x: number;
  z: number;
  triggered: boolean;
}

interface WaitingPassengerEntity {
  rig: PedestrianRig;
  pad: THREE.Group;
  destination: string;
  x: number;
  z: number;
  wavePhase: number;
  boardTimer: number;
  pickedUp: boolean;
}

interface StallEntity {
  group: THREE.Group;
  x: number;
  z: number;
  hit: boolean;
  halfWidth: number;
  halfLength: number;
}

interface DiggingBarrierEntity {
  rig: RoadDiggingRig;
  x: number;
  z: number;
  hit: boolean;
}

interface GantryEntity {
  group: THREE.Group;
  z: number;
}

interface TrafficLightEntity {
  rig: TrafficLightRig;
  z: number; // gantry z; painted stop line sits at z + 8.5
  prevStopZ: number;
  state: TrafficLightState;
  timer: number;
  penalized: boolean;
  stoppedAtRed: boolean;
  rewardedGreen: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onAreaEnter: (areaName: string, tagline: string, loopCount: number) => void;
  onToast: (toast: Omit<GameEventToast, 'id'>) => void;
  onMissionProgress: (metric: MissionMetric, delta: number) => void;
  onDriverXpGain?: (xp: number) => void;
  onGameOver: (summary: GameOverSummary) => void;
  onCrashJuice?: (intensity: 'minor' | 'major') => void;
  onCrashBurstText?: (text: string) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  public sound: SoundEngine;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private skyMesh!: THREE.Mesh;
  private skyUniforms!: {
    uTopColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uSmogColor: { value: THREE.Color };
    uSunColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uSunIntensity: { value: number };
    uSmogStrength: { value: number };
  };
  private roadMatPlain!: THREE.MeshStandardMaterial;
  private roadMatZebra!: THREE.MeshStandardMaterial;
  private roadBumpPlain!: THREE.CanvasTexture;
  private roadBumpZebra!: THREE.CanvasTexture;
  private streetBulbMat!: THREE.MeshStandardMaterial;
  private streetGlowMat!: THREE.SpriteMaterial;
  private streetPoolMat!: THREE.MeshBasicMaterial;
  private rainLines!: THREE.LineSegments;
  private rainPositions!: Float32Array;
  private exhaustMesh!: THREE.InstancedMesh;
  private puffPool: ExhaustPuff[] = [];
  private puffCursor = 0;
  private puffEmitAccum = 0;
  private dustMesh!: THREE.InstancedMesh;
  private dustPool: ExhaustPuff[] = [];
  private dustCursor = 0;
  private debrisMesh!: THREE.InstancedMesh;
  private debrisPool: DebrisParticle[] = [];
  private debrisCursor = 0;
  private wheelDustAccum = 0;
  private lodScratch: LodEntry[] = [];
  private leftMirrorRT!: THREE.WebGLRenderTarget;
  private rightMirrorRT!: THREE.WebGLRenderTarget;
  private leftMirrorCam!: THREE.PerspectiveCamera;
  private rightMirrorCam!: THREE.PerspectiveCamera;
  private mirrorFrameCounter = 0;
  private isSoftwareGl = false;
  private maxAnisotropy = 1;

  private cngRig!: CngRig;
  private cockpitRig!: CockpitRig;
  private streetDressing!: StreetDressingManager;
  private roadChunks: RoadChunk[] = [];
  private traffic: TrafficEntity[] = [];
  private pedestrians: PedestrianEntity[] = [];
  private zones: ZoneEntity[] = [];
  private waitingPassengers: WaitingPassengerEntity[] = [];
  private stalls: StallEntity[] = [];
  private diggingBarriers: DiggingBarrierEntity[] = [];
  private gantries: GantryEntity[] = [];
  private trafficLights: TrafficLightEntity[] = [];
  private pickupRingGroup!: THREE.Group;
  private pickupRingProgressSegments: THREE.Mesh[] = [];
  private floodWaterMesh!: THREE.Mesh;
  private floodWaterMat!: THREE.MeshStandardMaterial;

  private phase: GamePhase = 'menu';
  private cameraMode: CameraMode = 'external';
  private atmosphereMode: AtmosphereMode = 'day';
  private baseTimeMode: 'day' | 'evening' = 'day';
  private graphicsQuality: GraphicsQuality = 'high';
  private weather: WeatherCondition = 'sunny';
  private weatherTimer = 24;
  private input: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    hornPressed: false,
    lookBack: false,
  };

  // Player state
  private playerX = 2.8;
  private lateralVel = 0;
  private playerSpeed = 0;
  private prevPlayerSpeed = 0;
  private playerRoll = 0;
  private playerPitch = 0;
  private steerDir: -1 | 0 | 1 = 0;
  private steerSmoothed = 0;
  private handlebarAngle = 0;
  private ornamentPhase = 0;
  private lookYaw = 0;
  private lookPitch = 0;
  private isDraggingLook = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private gas = 100;
  private hp = 100;
  private wanted = 0;
  private score = 0;
  private runTaka = 0;
  private nationalDamage = 0;
  private distanceMeters = 0;
  private areaIndex = 0;
  private areaProgress = 0;
  private loopCount = 1;

  // Passenger state
  private passengerActive = false;
  private passengerDestination = '';
  private passengerFare = 0;
  private passengerDistLeft = 0;
  private passengerDropoffSpawned = false;
  private distanceSincePassenger = 0;

  // Random events state (20-30s each)
  private activeEventKind: RandomEventKind | null = null;
  private activeEventTimer = 0;
  private nextEventCooldown = 20;
  private lastEventKind: RandomEventKind | null = null;
  private diggingSpawnAccum = 0;
  private processionSpawnAccum = 0;
  private processionLaneX = 2.8;
  private vipSpawned = false;
  private vipYieldAwarded = false;
  private vipLaneX = 2.8;
  private vipSirenCooldown = 0;
  private floodSplashAccum = 0;

  // Timers & cooldowns
  private invulnTimer = 0;
  private dividerCooldown = 0;
  private shakeTimer = 0;
  private shakeTrauma = 0;
  private slowMoTimer = 0;
  private slowMoDuration = 0.34;
  private gameoverImpactTimer = 0;
  private crashCinematicActive = false;
  private crashCinematicTimer = 0;
  private pendingGameOverSummary: GameOverSummary | null = null;
  private stallSpawnDist = 25;
  private boostFovKick = 0;
  private wasBoosting = false;
  private hornZoomPulse = 0;
  private hornCooldown = 0;
  private soundBombCooldown = 0;
  private trafficHornCooldown = 0;
  private hudEmitTimer = 0;
  private trafficSpawnTimer = 0;
  private jamCooldown = 14;
  private pedSpawnTimer = 0;
  private distanceSinceGasZone = 0;
  private distanceSinceBribeZone = 0;
  private distanceSinceTrafficLight = 0;
  private boostMissionAccum = 0;
  private distMissionAccum = 0;
  private gasZoneSoundCooldown = 0;
  private orbitAngle = 0;
  private animTime = 0;
  private realTime = 0;
  private startAreaIndex = 0;

  private frameId = 0;
  private lastTime = 0;
  private disposed = false;
  private highScoreRef = 0;

  private equippedColorHex = CNG_COLORS[0].hex;
  private equippedSticker = CNG_STICKERS[0];
  private equippedUpgrades: CngUpgradesState = {
    engine: 0,
    tank: 0,
    chassis: 0,
    handling: 0,
  };

  constructor(
    container: HTMLElement,
    callbacks: EngineCallbacks,
    initialColorId: string,
    initialStickerId: string,
    initialHighScore: number,
    initialUpgrades?: CngUpgradesState
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.sound = new SoundEngine();
    this.highScoreRef = initialHighScore;
    if (initialUpgrades) {
      this.equippedUpgrades = { ...this.equippedUpgrades, ...initialUpgrades };
    }

    this.equippedColorHex =
      CNG_COLORS.find((c) => c.id === initialColorId)?.hex ?? CNG_COLORS[0].hex;
    this.equippedSticker =
      CNG_STICKERS.find((s) => s.id === initialStickerId) ?? CNG_STICKERS[0];

    this.initRenderer();
    this.initScene();
    this.bindEvents();

    this.lastTime = performance.now();
    this.tick();
  }

  private detectSoftwareGl(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initRenderer(): void {
    this.isSoftwareGl = this.detectSoftwareGl();
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    const startArea = AREAS[0];
    this.scene.background = new THREE.Color('#dec68d');
    this.scene.fog = new THREE.FogExp2('#dec68d', 0.0086);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.08, 280);
    this.camera.position.set(0, 4.4, 7.6);

    // Procedural Sky Dome: dusty yellow-beige gradient, warm hazy sun, thin horizon smog band
    this.skyUniforms = {
      uTopColor: { value: new THREE.Color('#93aabd') },
      uHorizonColor: { value: new THREE.Color('#e7d39f') },
      uSmogColor: { value: new THREE.Color('#dec68d') },
      uSunColor: { value: new THREE.Color('#fff2c2') },
      uSunDir: { value: new THREE.Vector3(0.26, 0.24, -1.0).normalize() },
      uSunIntensity: { value: 1.0 },
      uSmogStrength: { value: 0.86 },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: true,
      vertexShader: `
        varying vec3 vLocalDir;
        void main() {
          vLocalDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vLocalDir;
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSmogColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        uniform float uSunIntensity;
        uniform float uSmogStrength;

        void main() {
          vec3 dir = normalize(vLocalDir);
          float h = clamp(dir.y, -0.15, 1.0);
          vec3 sky = mix(uHorizonColor, uTopColor, smoothstep(0.0, 0.56, max(h, 0.0)));
          float smogBand = exp(-abs(h - 0.022) * 17.0) * uSmogStrength;
          float lowHaze = smoothstep(0.16, -0.02, h) * 0.44 * uSmogStrength;
          sky = mix(sky, uSmogColor, clamp(smogBand + lowHaze, 0.0, 0.94));

          vec3 sDir = normalize(uSunDir);
          float sunDot = max(dot(dir, sDir), 0.0);
          float halo = pow(sunDot, 7.0) * 0.34 + pow(sunDot, 36.0) * 0.44;
          float disc = smoothstep(0.9942, 0.9988, sunDot) * 0.95;
          sky += uSunColor * (halo + disc) * uSunIntensity;

          gl_FragColor = vec4(sky, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(235, 24, 16), skyMat);
    this.skyMesh.frustumCulled = false;
    this.scene.add(this.skyMesh);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.hemiLight = new THREE.HemisphereLight('#f5e6bf', '#574c3f', 1.15);
    this.scene.add(this.hemiLight);

    // Warm directional sun with soft shadows scoped tightly around the player's CNG
    this.sunLight = new THREE.DirectionalLight('#fff2cf', 1.65);
    this.sunLight.position.set(10, 17, 9);
    this.sunLight.castShadow = !this.isSoftwareGl && this.graphicsQuality === 'high';
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 42;
    this.sunLight.shadow.camera.left = -6;
    this.sunLight.shadow.camera.right = 6;
    this.sunLight.shadow.camera.top = 7;
    this.sunLight.shadow.camera.bottom = -7;
    this.sunLight.shadow.radius = 3.5;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight('#fde68a', 0.42);
    this.rimLight.position.set(-14, 10, -24);
    this.scene.add(this.rimLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(360, 420),
      new THREE.MeshStandardMaterial({ color: '#786957', roughness: 0.96 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.04, -70);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const roadPlainSet = createRoadTextureSet(this.maxAnisotropy, false);
    const roadZebraSet = createRoadTextureSet(this.maxAnisotropy, true);
    this.roadBumpPlain = roadPlainSet.bumpMap;
    this.roadBumpZebra = roadZebraSet.bumpMap;
    const sideTexLeft = createSidewalkTexture(this.maxAnisotropy, -1);
    const sideTexRight = createSidewalkTexture(this.maxAnisotropy, 1);
    const curbTex = createMedianCurbTexture(this.maxAnisotropy);
    curbTex.repeat.set(1, 5);
    this.roadMatPlain = new THREE.MeshStandardMaterial({
      map: roadPlainSet.map,
      roughnessMap: roadPlainSet.roughnessMap,
      bumpMap: this.roadBumpPlain,
      bumpScale: 0.032,
      roughness: 0.94,
      metalness: 0.04,
      envMapIntensity: 1.2,
    });
    this.roadMatZebra = new THREE.MeshStandardMaterial({
      map: roadZebraSet.map,
      roughnessMap: roadZebraSet.roughnessMap,
      bumpMap: this.roadBumpZebra,
      bumpScale: 0.032,
      roughness: 0.94,
      metalness: 0.04,
      envMapIntensity: 1.2,
    });
    const roadMatPlain = this.roadMatPlain;
    const roadMatZebra = this.roadMatZebra;
    const sideMatLeft = new THREE.MeshStandardMaterial({ map: sideTexLeft, roughness: 0.92 });
    const sideMatRight = new THREE.MeshStandardMaterial({ map: sideTexRight, roughness: 0.92 });
    const curbEdgeMat = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.72 });

    // Shared street light materials so all chunks respond together in day/evening/rain
    const glowTex = createLightGlowTexture();
    this.streetBulbMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#fbbf24',
      emissiveIntensity: 0.28,
      roughness: 0.2,
    });
    this.streetGlowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: '#fbbf24',
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.streetPoolMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: '#f59e0b',
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Procedural 3D Rain Streak System (Zero GC per-frame buffer updates)
    this.rainPositions = new Float32Array(RAIN_COUNT * 6);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const rx = (Math.random() - 0.5) * 28;
      const ry = Math.random() * 14 + 0.5;
      const rz = -34 + Math.random() * 44;
      const idx = i * 6;
      this.rainPositions[idx] = rx;
      this.rainPositions[idx + 1] = ry;
      this.rainPositions[idx + 2] = rz;
      this.rainPositions[idx + 3] = rx - 0.08;
      this.rainPositions[idx + 4] = ry + 0.65;
      this.rainPositions[idx + 5] = rz - 0.16;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: '#cbd5e1',
      transparent: true,
      opacity: 0.58,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, rainMat);
    this.rainLines.visible = false;
    this.rainLines.frustumCulled = false;
    this.scene.add(this.rainLines);

    this.streetDressing = new StreetDressingManager(this.scene, this.maxAnisotropy);

    const CHUNK_LEN = 45;
    const CHUNK_COUNT = 6;
    const curbEdgeGeo = new THREE.BoxGeometry(0.36, 0.3, CHUNK_LEN);
    for (let i = 0; i < CHUNK_COUNT; i++) {
      const chunkGroup = new THREE.Group();
      const hasZebra = i % 2 === 1;
      const roadMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(17.4, CHUNK_LEN),
        hasZebra ? roadMatZebra : roadMatPlain
      );
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.y = 0;
      roadMesh.receiveShadow = true;

      const leftWalk = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, CHUNK_LEN), sideMatLeft);
      leftWalk.position.set(-10.6, 0.09, 0);
      leftWalk.receiveShadow = true;

      const rightWalk = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, CHUNK_LEN), sideMatRight);
      rightWalk.position.set(10.6, 0.09, 0);
      rightWalk.receiveShadow = true;

      const leftCurb = new THREE.Mesh(curbEdgeGeo, curbEdgeMat);
      leftCurb.position.set(-8.66, 0.15, 0);
      leftCurb.receiveShadow = true;

      const rightCurb = new THREE.Mesh(curbEdgeGeo, curbEdgeMat);
      rightCurb.position.set(8.66, 0.15, 0);
      rightCurb.receiveShadow = true;

      chunkGroup.add(roadMesh, leftWalk, rightWalk, leftCurb, rightCurb);

      // Center median divider curb (median trees & bushes rendered by StreetDressingManager InstancedMesh)
      const hasDivider = !hasZebra;
      if (hasDivider) {
        const divider = createRoadDivider(36, this.maxAnisotropy, false);
        divider.position.set(0, 0, -2);
        chunkGroup.add(divider);
      } else {
        const divider = createRoadDivider(20, this.maxAnisotropy, false);
        divider.position.set(0, 0, 10);
        chunkGroup.add(divider);
      }

      // Street lights on both sidewalks with shared bloom-like glow & ground pool
      const lightL = createStreetLight(-1, this.streetBulbMat, this.streetGlowMat, this.streetPoolMat);
      lightL.position.set(-9.4, 0, -14);
      const lightR = createStreetLight(1, this.streetBulbMat, this.streetGlowMat, this.streetPoolMat);
      lightR.position.set(9.4, 0, 14);
      chunkGroup.add(lightL, lightR);

      // Pooled buildings, shops, banners, posters, footbridges & utility wires container
      const sceneryGroup = new THREE.Group();
      chunkGroup.add(sceneryGroup);
      this.streetDressing.initChunkPool(i, sceneryGroup);

      // Overhead directional sign container
      const signGroup = new THREE.Group();
      chunkGroup.add(signGroup);

      const flyoverPillar = createFlyoverPillar();
      flyoverPillar.visible = Boolean(startArea.hasFlyover) && i % 2 === 0;
      chunkGroup.add(flyoverPillar);

      const chunk: RoadChunk = {
        chunkIndex: i,
        group: chunkGroup,
        sceneryGroup,
        signGroup,
        flyoverPillar,
        hasDivider,
        builtAreaIndex: -1,
        z: 30 - i * CHUNK_LEN,
      };
      this.rebuildChunkScenery(chunk, i);

      chunkGroup.position.z = chunk.z;
      this.scene.add(chunkGroup);
      this.roadChunks.push(chunk);
    }
    this.streetDressing.syncChunkTransforms(this.roadChunks, this.graphicsQuality);

    this.cngRig = createCngModel(
      this.equippedColorHex,
      this.equippedSticker,
      this.maxAnisotropy
    );
    this.cockpitRig = createCockpitModel(this.equippedColorHex);

    // Live Rear-View Looking Glass Render Targets & Cameras (rendered only in Driver View)
    this.leftMirrorRT = new THREE.WebGLRenderTarget(160, 160, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    this.rightMirrorRT = new THREE.WebGLRenderTarget(160, 160, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    this.leftMirrorCam = new THREE.PerspectiveCamera(62, 1, 0.25, 160);
    this.rightMirrorCam = new THREE.PerspectiveCamera(62, 1, 0.25, 160);
    this.cockpitRig.leftMirrorMat.map = this.leftMirrorRT.texture;
    this.cockpitRig.leftMirrorMat.color.set('#ffffff');
    this.cockpitRig.leftMirrorMat.needsUpdate = true;
    this.cockpitRig.rightMirrorMat.map = this.rightMirrorRT.texture;
    this.cockpitRig.rightMirrorMat.color.set('#ffffff');
    this.cockpitRig.rightMirrorMat.needsUpdate = true;

    this.cngRig.group.add(this.cockpitRig.group);

    // Dotted White Pickup Ring around the CNG (shown when a passenger can be picked up)
    this.pickupRingGroup = new THREE.Group();
    const dashCount = 24;
    const outerDashGeo = new THREE.BoxGeometry(0.36, 0.025, 0.13);
    const outerDashMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const innerDashGeo = new THREE.BoxGeometry(0.28, 0.03, 0.11);
    this.pickupRingProgressSegments = [];
    for (let i = 0; i < dashCount; i++) {
      const theta = (i / dashCount) * Math.PI * 2;
      const dash = new THREE.Mesh(outerDashGeo, outerDashMat);
      dash.position.set(Math.sin(theta) * 2.65, 0.05, Math.cos(theta) * 2.65);
      dash.rotation.y = theta;
      this.pickupRingGroup.add(dash);

      const progMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
      const progDash = new THREE.Mesh(innerDashGeo, progMat);
      progDash.position.set(Math.sin(theta) * 2.15, 0.055, Math.cos(theta) * 2.15);
      progDash.rotation.y = theta;
      progDash.visible = false;
      this.pickupRingGroup.add(progDash);
      this.pickupRingProgressSegments.push(progDash);
    }
    this.pickupRingGroup.visible = false;
    this.cngRig.group.add(this.pickupRingGroup);

    this.cngRig.group.position.set(2.8, 0, 0);
    this.scene.add(this.cngRig.group);
    this.syncCameraVisibility();

    // Pooled CNG Boost Exhaust Puff InstancedMesh (Zero GC)
    const puffGeo = new THREE.SphereGeometry(0.16, 7, 6);
    const puffMat = new THREE.MeshBasicMaterial({
      color: '#e2e8f0',
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    });
    this.exhaustMesh = new THREE.InstancedMesh(puffGeo, puffMat, PUFF_COUNT);
    this.exhaustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.exhaustMesh.frustumCulled = false;
    _puffDummy.scale.setScalar(0);
    _puffDummy.updateMatrix();
    this.puffPool = [];
    for (let i = 0; i < PUFF_COUNT; i++) {
      this.puffPool.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 0.45,
      });
      this.exhaustMesh.setMatrixAt(i, _puffDummy.matrix);
    }
    this.exhaustMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.exhaustMesh);

    // Pooled Stumble/Fall Dust Burst InstancedMesh (Zero GC, No Gore)
    const dustGeo = new THREE.SphereGeometry(0.24, 6, 5);
    const dustMat = new THREE.MeshBasicMaterial({
      color: '#d6c3a1',
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    this.dustMesh = new THREE.InstancedMesh(dustGeo, dustMat, DUST_COUNT);
    this.dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dustMesh.frustumCulled = false;
    _dustDummy.scale.setScalar(0);
    _dustDummy.updateMatrix();
    this.dustPool = [];
    for (let i = 0; i < DUST_COUNT; i++) {
      this.dustPool.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 0.6,
      });
      this.dustMesh.setMatrixAt(i, _dustDummy.matrix);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.dustMesh);

    // Pooled Crash Debris Chunks InstancedMesh (Zero GC)
    const debrisGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.55,
      metalness: 0.25,
      flatShading: true,
    });
    this.debrisMesh = new THREE.InstancedMesh(debrisGeo, debrisMat, DEBRIS_COUNT);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debrisMesh.frustumCulled = false;
    _debrisDummy.scale.setScalar(0);
    _debrisDummy.updateMatrix();
    const debrisPalette = [
      '#16a34a',
      '#facc15',
      '#ef4444',
      '#94a3b8',
      '#92400e',
      '#b45309',
      '#f97316',
      '#22c55e',
      '#fde047',
    ];
    this.debrisPool = [];
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      this.debrisPool.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        vrx: 0,
        vry: 0,
        vrz: 0,
        scale: 1,
        age: 0,
        maxAge: 0.85,
      });
      this.debrisMesh.setMatrixAt(i, _debrisDummy.matrix);
      _debrisColor.set(debrisPalette[i % debrisPalette.length]);
      this.debrisMesh.setColorAt(i, _debrisColor);
    }
    this.debrisMesh.instanceMatrix.needsUpdate = true;
    if (this.debrisMesh.instanceColor) this.debrisMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.debrisMesh);

    // Chattogram Flooding Water Sheet (visible only during 'flooding' random event)
    this.floodWaterMat = new THREE.MeshStandardMaterial({
      color: '#1e3a5f',
      roughness: 0.14,
      metalness: 0.42,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      envMapIntensity: 1.8,
    });
    this.floodWaterMesh = new THREE.Mesh(new THREE.PlaneGeometry(17.4, 220), this.floodWaterMat);
    this.floodWaterMesh.rotation.x = -Math.PI / 2;
    this.floodWaterMesh.position.set(0, 0.024, -65);
    this.floodWaterMesh.visible = false;
    this.scene.add(this.floodWaterMesh);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private disposeGroupChildren(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            if (!mat) continue;
            (mat as THREE.MeshStandardMaterial).map?.dispose();
            mat.dispose();
          }
        }
      });
    }
  }

  private rebuildChunkScenery(chunk: RoadChunk, seedIdx: number): void {
    this.disposeGroupChildren(chunk.signGroup);
    const area = AREAS[this.areaIndex];
    chunk.builtAreaIndex = this.areaIndex;
    chunk.flyoverPillar.visible = Boolean(area.hasFlyover) && seedIdx % 2 === 0;

    this.streetDressing.populateChunk(
      chunk.chunkIndex,
      seedIdx,
      area,
      chunk.hasDivider,
      this.graphicsQuality
    );

    // Overhead green directional road sign + signal on odd chunks (clear of footbridges & utility poles)
    if (seedIdx % 2 === 1) {
      const sign = createOverheadRoadSign(area.name, this.maxAnisotropy);
      sign.position.set(0, 0, -15);
      chunk.signGroup.add(sign);
    }
  }

  private onResize = (): void => {
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.phase !== 'playing' || this.cameraMode !== 'driver') return;
    this.isDraggingLook = true;
    this.lastDragX = e.clientX;
    this.lastDragY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDraggingLook || this.phase !== 'playing' || this.cameraMode !== 'driver') return;
    const dx = e.clientX - this.lastDragX;
    const dy = e.clientY - this.lastDragY;
    this.lastDragX = e.clientX;
    this.lastDragY = e.clientY;
    this.lookYaw = THREE.MathUtils.clamp(this.lookYaw - dx * 0.0055, -0.78, 0.78);
    this.lookPitch = THREE.MathUtils.clamp(this.lookPitch - dy * 0.0035, -0.22, 0.22);
  };

  private onPointerUp = (): void => {
    this.isDraggingLook = false;
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  public setHighScore(score: number): void {
    this.highScoreRef = score;
  }

  public setInput(partial: Partial<InputState>): void {
    Object.assign(this.input, partial);
    if (partial.hornPressed) {
      this.triggerHorn();
      this.input.hornPressed = false;
    }
  }

  private vibrate(pattern: number | number[]): void {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors on unsupported browsers
    }
  }

  public triggerHorn(): void {
    if (this.phase !== 'playing') return;
    if (this.hornCooldown > 0) return;
    this.hornCooldown = 0.4;
    this.hornZoomPulse = 1.0;
    this.vibrate(22);
    this.sound.playHorn();
    this.callbacks.onMissionProgress('horns', 1);

    // Startle nearby non-chasing pedestrians (jump back!) and nudge blocking cars ahead
    let hornTalkers = 0;
    for (const ped of this.pedestrians) {
      if (!ped.isChasing && ped.fallTimer <= 0 && Math.abs(ped.z) < 28 && Math.abs(ped.x - this.playerX) < 6.4) {
        if (ped.basePose !== 'sit_tea_stall') {
          ped.jumpBackTimer = 0.58;
          ped.walkDir = ped.x >= this.playerX ? 1 : -1;
          ped.walkSpeed = 6.8;
        }
        ped.reactYaw = Math.atan2(this.playerX - ped.x, 0 - ped.z);
        ped.reactTimer = 1.4;
        if (hornTalkers < 2 && Math.random() < 0.65) {
          hornTalkers++;
          ped.rig.showSpeech('horn');
          ped.speechTimer = 1.7;
        }
      }
    }
    for (const t of this.traffic) {
      if (t.z < -2 && t.z > -26 && Math.abs(t.x - this.playerX) < 1.8) {
        const candidate = t.x > 0 ? (t.x > 4 ? 2.8 : 6.0) : t.x < -4 ? -2.8 : -6.0;
        t.targetX = candidate;
      }
    }
  }

  public triggerSoundBomb(): void {
    if (this.phase !== 'playing') return;
    if (this.soundBombCooldown > 0) return;
    this.soundBombCooldown = 10.0;
    this.shakeTimer = 0.24;
    this.shakeTrauma = Math.max(this.shakeTrauma, 0.6);
    this.hornZoomPulse = 1.5;
    this.vibrate([30, 20, 45]);
    this.sound.playHorn();
    this.sound.playTrafficHorn('heavy');
    this.callbacks.onMissionProgress('horns', 2);

    // Clear agile cars out of player lane & scatter nearby pedestrians
    let talkers = 0;
    for (const ped of this.pedestrians) {
      if (Math.abs(ped.z) < 35) {
        ped.isChasing = false;
        ped.rig.alertBadge.visible = false;
        if (ped.basePose !== 'sit_tea_stall' && ped.fallTimer <= 0) {
          ped.jumpBackTimer = 0.65;
          ped.walkDir = ped.x >= this.playerX ? 1 : -1;
          ped.walkSpeed = 8.5;
        }
        if (talkers < 3) {
          talkers++;
          ped.rig.showSpeech('horn');
          ped.speechTimer = 1.8;
        }
      }
    }
    for (const t of this.traffic) {
      if (t.z < 0 && t.z > -38 && Math.abs(t.x - this.playerX) < 2.2) {
        if (t.x > 0) {
          t.targetX = t.x > 4 ? 2.8 : 6.0;
        } else {
          t.targetX = t.x < -4 ? -2.8 : -6.0;
        }
      }
    }
    this.callbacks.onToast({
      text: 'শব্দবোমা! রাস্তা থেকে সবাই ছিটকে সরেছে 💣',
      tone: 'warning',
    });
    this.emitHud();
  }

  public setStartAreaIndex(idx: number): void {
    this.startAreaIndex = Math.max(0, Math.min(AREAS.length - 1, idx));
    if (this.phase === 'menu') {
      this.areaIndex = this.startAreaIndex;
      this.roadChunks.forEach((chunk, i) => {
        this.rebuildChunkScenery(chunk, i);
      });
      this.streetDressing.syncChunkTransforms(this.roadChunks, this.graphicsQuality);
    }
  }

  public updateAppearance(colorId: string, stickerId: string): void {
    this.equippedColorHex =
      CNG_COLORS.find((c) => c.id === colorId)?.hex ?? CNG_COLORS[0].hex;
    this.equippedSticker =
      CNG_STICKERS.find((s) => s.id === stickerId) ?? CNG_STICKERS[0];
    this.cngRig.updateAppearance(
      this.equippedColorHex,
      this.equippedSticker,
      this.maxAnisotropy
    );
    this.cockpitRig.updateAppearance(this.equippedColorHex);
  }

  public updateUpgrades(upgrades: CngUpgradesState): void {
    this.equippedUpgrades = { ...this.equippedUpgrades, ...upgrades };
  }

  private syncCameraVisibility(): void {
    const driverActive =
      this.cameraMode === 'driver' && (this.phase === 'playing' || this.phase === 'paused');
    this.cngRig.bodyGroup.visible = !driverActive;
    for (const w of this.cngRig.wheels) {
      w.visible = !driverActive;
    }
    this.cockpitRig.group.visible = driverActive;
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.isDraggingLook = false;
    this.syncCameraVisibility();
    this.emitHud();
  }

  public toggleCameraMode(): CameraMode {
    const next: CameraMode = this.cameraMode === 'external' ? 'driver' : 'external';
    this.setCameraMode(next);
    return next;
  }

  public setAtmosphereMode(mode: AtmosphereMode, announce = true): void {
    this.atmosphereMode = mode;
    if (mode === 'day' || mode === 'evening') {
      this.baseTimeMode = mode;
      this.applyWeather('sunny', false);
    } else {
      this.applyWeather('rainy', false);
    }

    if (announce) {
      if (mode === 'evening') {
        this.callbacks.onToast({
          text: 'সন্ধ্যার কমলা আকাশ ও রাস্তার আলো জ্বলে উঠেছে 🌆',
          tone: 'warning',
          priority: 'radio',
        });
      } else if (mode === 'rain') {
        this.callbacks.onToast({
          text: 'ঝুম বৃষ্টি! ভেজা রাস্তায় ব্রেক ও টার্নে সাবধান 🌧️',
          tone: 'info',
          priority: 'radio',
        });
      } else {
        this.callbacks.onToast({
          text: 'দিনের উজ্জ্বল ধুলোমাখা আকাশ ফিরে এসেছে ☀️',
          tone: 'success',
          priority: 'radio',
        });
      }
    }
    this.emitHud();
  }

  public toggleAtmosphereMode(): AtmosphereMode {
    const order: AtmosphereMode[] = ['day', 'evening', 'rain'];
    const next = order[(order.indexOf(this.atmosphereMode) + 1) % order.length];
    this.setAtmosphereMode(next, this.phase === 'playing');
    return next;
  }

  public setGraphicsQuality(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    const isHigh = quality === 'high';
    this.renderer.setPixelRatio(
      !isHigh || this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = isHigh && !this.isSoftwareGl;
    this.sunLight.castShadow = isHigh && !this.isSoftwareGl;
    this.roadMatPlain.bumpMap = isHigh ? this.roadBumpPlain : null;
    this.roadMatZebra.bumpMap = isHigh ? this.roadBumpZebra : null;
    this.roadMatPlain.needsUpdate = true;
    this.roadMatZebra.needsUpdate = true;
    this.rainLines.geometry.setDrawRange(
      0,
      isHigh ? RAIN_COUNT * 2 : Math.floor(RAIN_COUNT * 0.45) * 2
    );
    this.streetDressing?.applyQuality(quality);
    this.emitHud();
  }

  public toggleGraphicsQuality(): GraphicsQuality {
    const next: GraphicsQuality = this.graphicsQuality === 'high' ? 'low' : 'high';
    this.setGraphicsQuality(next);
    if (this.phase === 'playing') {
      this.callbacks.onToast({
        text: next === 'high' ? 'গ্রাফিক্স: উচ্চ (High) ✨' : 'গ্রাফিক্স: নিম্ন (60fps মোড) ⚡',
        tone: 'info',
        priority: 'radio',
      });
    }
    return next;
  }

  public toggleWeather(): WeatherCondition {
    const order: WeatherCondition[] = ['sunny', 'rainy', 'foggy'];
    const next = order[(order.indexOf(this.weather) + 1) % order.length];
    this.applyWeather(next, this.phase === 'playing');
    return next;
  }

  private applyWeather(next: WeatherCondition, announce: boolean): void {
    this.weather = next;
    this.weatherTimer = 22 + Math.random() * 14;
    this.rainLines.visible = next === 'rainy';
    this.sound.setWeatherRain(next === 'rainy' && this.phase === 'playing');
    if (next === 'rainy') {
      this.atmosphereMode = 'rain';
    } else if (next === 'sunny') {
      this.atmosphereMode = this.baseTimeMode;
    }

    if (announce) {
      if (next === 'rainy') {
        this.callbacks.onToast({
          text: 'হঠাৎ ঝুম বৃষ্টি! রাস্তা পিচ্ছিল — ব্রেক ও টার্নে সাবধান 🌧️',
          tone: 'info',
        });
      } else if (next === 'foggy') {
        this.callbacks.onToast({
          text: 'ঘন কুয়াশা নেমেছে! দূরের দৃশ্য ঝাপসা, গতি সামলান 🌫️',
          tone: 'warning',
        });
      } else {
        this.callbacks.onToast({
          text: 'আবহাওয়া পরিষ্কার হয়েছে — রাস্তা শুকনো ☀️',
          tone: 'success',
        });
      }
    }
    this.emitHud();
  }

  public setPhase(next: GamePhase): void {
    this.phase = next;
    if (next === 'playing') {
      this.sound.startEngine();
      this.sound.setWeatherRain(this.weather === 'rainy');
    } else {
      this.sound.stopEngine();
      this.sound.setWeatherRain(false);
      if (next === 'menu' || next === 'garage') {
        this.clearDynamicEntities();
        const wantRain = this.atmosphereMode === 'rain';
        this.weather = wantRain ? 'rainy' : 'sunny';
        this.rainLines.visible = wantRain;
        this.cngRig.group.position.set(next === 'menu' ? 2.8 : 0, 0, 0);
        this.cngRig.group.rotation.set(0, 0, 0);
        this.cngRig.bodyGroup.rotation.set(0, 0, 0);
      }
    }
    this.syncCameraVisibility();
  }

  public startNewRun(areaIdx?: number): void {
    this.clearDynamicEntities();

    const chosenArea = areaIdx ?? this.startAreaIndex;
    this.playerX = 2.8;
    this.lateralVel = 0;
    this.playerSpeed = 16;
    this.prevPlayerSpeed = 16;
    this.playerRoll = 0;
    this.playerPitch = 0;
    this.steerSmoothed = 0;
    this.handlebarAngle = 0;
    this.cngRig.setSteerAngle(0);
    this.gas = 100;
    this.hp = 100;
    this.wanted = 0;
    this.score = 0;
    this.runTaka = 0;
    this.nationalDamage = 0;
    this.distanceMeters = 0;
    this.areaIndex = chosenArea;
    this.areaProgress = 0;
    this.loopCount = 1;

    this.passengerActive = false;
    this.passengerDestination = '';
    this.passengerFare = 0;
    this.passengerDistLeft = 0;
    this.passengerDropoffSpawned = false;
    this.distanceSincePassenger = 35;

    this.activeEventKind = null;
    this.activeEventTimer = 0;
    this.nextEventCooldown = 16 + Math.random() * 6;
    this.diggingSpawnAccum = 0;
    this.processionSpawnAccum = 0;
    this.vipSpawned = false;
    this.vipYieldAwarded = false;
    this.vipSirenCooldown = 0;
    this.floodSplashAccum = 0;

    this.invulnTimer = 0;
    this.dividerCooldown = 0;
    this.shakeTimer = 0;
    this.shakeTrauma = 0;
    this.slowMoTimer = 0;
    this.gameoverImpactTimer = 0;
    this.crashCinematicActive = false;
    this.crashCinematicTimer = 0;
    this.pendingGameOverSummary = null;
    this.stallSpawnDist = 25;
    this.boostFovKick = 0;
    this.wasBoosting = false;
    this.wheelDustAccum = 0;
    this.soundBombCooldown = 0;
    this.trafficSpawnTimer = 0.25;
    this.jamCooldown = 12;
    this.pedSpawnTimer = 0.6;
    this.distanceSinceGasZone = 0;
    this.distanceSinceBribeZone = 0;
    this.distanceSinceTrafficLight = 60;
    this.boostMissionAccum = 0;
    this.distMissionAccum = 0;

    const wantRain = this.atmosphereMode === 'rain';
    this.weather = wantRain ? 'rainy' : 'sunny';
    this.weatherTimer = 18 + Math.random() * 12;
    this.rainLines.visible = wantRain;
    this.sound.setWeatherRain(wantRain);

    this.cngRig.group.position.set(this.playerX, 0, 0);
    this.cngRig.group.rotation.set(0, 0, 0);
    this.cngRig.bodyGroup.rotation.set(0, 0, 0);
    this.cngRig.group.visible = true;
    if (this.pickupRingGroup) this.pickupRingGroup.visible = false;

    const firstArea = AREAS[this.areaIndex];
    this.roadChunks.forEach((chunk, idx) => {
      this.rebuildChunkScenery(chunk, idx);
    });
    this.streetDressing.syncChunkTransforms(this.roadChunks, this.graphicsQuality);

    this.spawnAreaGantry(firstArea.name, firstArea.tagline, firstArea.accentColor, -75);
    this.callbacks.onAreaEnter(firstArea.name, firstArea.tagline, 1);

    this.spawnInitialPedestrians();

    this.setPhase('playing');
    this.emitHud();
  }

  private clearDynamicEntities(): void {
    for (const t of this.traffic) this.scene.remove(t.rig.group);
    this.traffic = [];
    for (const p of this.pedestrians) {
      this.scene.remove(p.rig.group);
      if (p.propGroup) this.scene.remove(p.propGroup);
    }
    this.pedestrians = [];
    for (const z of this.zones) this.scene.remove(z.group);
    this.zones = [];
    for (const wp of this.waitingPassengers) {
      this.scene.remove(wp.rig.group);
      this.scene.remove(wp.pad);
    }
    this.waitingPassengers = [];
    for (const s of this.stalls) {
      this.scene.remove(s.group);
    }
    this.stalls = [];
    for (const b of this.diggingBarriers) {
      this.scene.remove(b.rig.group);
    }
    this.diggingBarriers = [];
    for (const g of this.gantries) this.scene.remove(g.group);
    this.gantries = [];
    for (const tl of this.trafficLights) this.scene.remove(tl.rig.group);
    this.trafficLights = [];
    this.activeEventKind = null;
    this.activeEventTimer = 0;
    this.vipSpawned = false;
    this.vipYieldAwarded = false;
    this.crashCinematicActive = false;
    this.crashCinematicTimer = 0;
    this.pendingGameOverSummary = null;
    if (this.pickupRingGroup) this.pickupRingGroup.visible = false;
    if (this.floodWaterMesh) {
      this.floodWaterMesh.visible = false;
      this.floodWaterMat.opacity = 0;
    }
    this.resetExhaustPuffs();
    this.resetDustPuffs();
    this.resetDebrisParticles();
  }

  private resetExhaustPuffs(): void {
    if (!this.exhaustMesh) return;
    _puffDummy.scale.setScalar(0);
    _puffDummy.updateMatrix();
    for (let i = 0; i < this.puffPool.length; i++) {
      this.puffPool[i].active = false;
      this.exhaustMesh.setMatrixAt(i, _puffDummy.matrix);
    }
    this.exhaustMesh.instanceMatrix.needsUpdate = true;
  }

  private resetDustPuffs(): void {
    if (!this.dustMesh) return;
    _dustDummy.scale.setScalar(0);
    _dustDummy.updateMatrix();
    for (let i = 0; i < this.dustPool.length; i++) {
      this.dustPool[i].active = false;
      this.dustMesh.setMatrixAt(i, _dustDummy.matrix);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
  }

  private resetDebrisParticles(): void {
    if (!this.debrisMesh) return;
    _debrisDummy.scale.setScalar(0);
    _debrisDummy.updateMatrix();
    for (let i = 0; i < this.debrisPool.length; i++) {
      this.debrisPool[i].active = false;
      this.debrisMesh.setMatrixAt(i, _debrisDummy.matrix);
    }
    this.debrisMesh.instanceMatrix.needsUpdate = true;
  }

  private spawnDebrisBurst(x: number, y: number, z: number, count = 12, power = 1): void {
    if (!this.debrisMesh) return;
    for (let i = 0; i < count; i++) {
      const p = this.debrisPool[this.debrisCursor];
      this.debrisCursor = (this.debrisCursor + 1) % DEBRIS_COUNT;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
      const spd = (2.4 + Math.random() * 4.2) * power;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.55;
      p.y = y + Math.random() * 0.45;
      p.z = z + (Math.random() - 0.5) * 0.55;
      p.vx = Math.cos(angle) * spd;
      p.vy = (2.8 + Math.random() * 3.6) * power;
      p.vz = Math.sin(angle) * spd + (Math.random() - 0.3) * 3.5;
      p.rx = Math.random() * Math.PI;
      p.ry = Math.random() * Math.PI;
      p.rz = Math.random() * Math.PI;
      p.vrx = (Math.random() - 0.5) * 18;
      p.vry = (Math.random() - 0.5) * 18;
      p.vrz = (Math.random() - 0.5) * 18;
      p.scale = 0.65 + Math.random() * 0.9;
      p.age = 0;
      p.maxAge = 0.75 + Math.random() * 0.45;
    }
  }

  private spawnStallDebrisBurst(x: number, y: number, z: number, count = 22): void {
    if (!this.debrisMesh) return;
    for (let i = 0; i < count; i++) {
      const p = this.debrisPool[this.debrisCursor];
      this.debrisCursor = (this.debrisCursor + 1) % DEBRIS_COUNT;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
      const spd = 2.0 + Math.random() * 4.4;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.7;
      p.y = y + Math.random() * 0.55;
      p.z = z + (Math.random() - 0.5) * 0.7;
      p.vx = Math.cos(angle) * spd;
      p.vy = 2.6 + Math.random() * 3.4;
      p.vz = Math.sin(angle) * spd + (Math.random() - 0.3) * 2.5;
      p.rx = Math.random() * Math.PI;
      p.ry = Math.random() * Math.PI;
      p.rz = Math.random() * Math.PI;
      p.vrx = (Math.random() - 0.5) * 16;
      p.vry = (Math.random() - 0.5) * 16;
      p.vrz = (Math.random() - 0.5) * 16;
      p.scale = 0.95 + Math.random() * 0.85;
      p.age = 0;
      p.maxAge = 2.6 + Math.random() * 1.1; // Stays scattered on road briefly (~3s)
    }
  }

  private updateDebrisParticles(dt: number, distStep: number): void {
    if (!this.debrisMesh) return;
    let dirty = false;
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      const p = this.debrisPool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        _debrisDummy.scale.setScalar(0);
        _debrisDummy.updateMatrix();
        this.debrisMesh.setMatrixAt(i, _debrisDummy.matrix);
        dirty = true;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 14.5 * dt;
      p.z += p.vz * dt + distStep;
      if (p.y < 0.09) {
        p.y = 0.09;
        p.vy = Math.abs(p.vy) > 0.8 ? Math.abs(p.vy) * 0.34 : 0;
        p.vx *= 0.65;
        p.vz *= 0.65;
        if (Math.abs(p.vx) < 0.15) {
          p.vrx *= 0.8;
          p.vry *= 0.8;
          p.vrz *= 0.8;
        }
      }
      p.rx += p.vrx * dt;
      p.ry += p.vry * dt;
      p.rz += p.vrz * dt;
      const t = p.age / p.maxAge;
      const s = p.scale * (t > 0.8 ? Math.max(0.01, (1 - t) * 5) : 1);
      _debrisDummy.position.set(p.x, p.y, p.z);
      _debrisDummy.rotation.set(p.rx, p.ry, p.rz);
      _debrisDummy.scale.setScalar(s);
      _debrisDummy.updateMatrix();
      this.debrisMesh.setMatrixAt(i, _debrisDummy.matrix);
      dirty = true;
    }
    if (dirty) {
      this.debrisMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private triggerCrashSlowMo(duration = 0.34): void {
    this.slowMoDuration = duration;
    this.slowMoTimer = duration;
  }

  private spawnDustBurst(x: number, y: number, z: number, count = 8): void {
    if (!this.dustMesh) return;
    for (let i = 0; i < count; i++) {
      const puff = this.dustPool[this.dustCursor];
      this.dustCursor = (this.dustCursor + 1) % DUST_COUNT;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const spd = 1.6 + Math.random() * 2.2;
      puff.active = true;
      puff.x = x + (Math.random() - 0.5) * 0.35;
      puff.y = y + Math.random() * 0.25;
      puff.z = z + (Math.random() - 0.5) * 0.35;
      puff.vx = Math.cos(angle) * spd;
      puff.vy = 0.9 + Math.random() * 1.1;
      puff.vz = Math.sin(angle) * spd;
      puff.age = 0;
      puff.maxAge = 0.55 + Math.random() * 0.25;
    }
  }

  private updateDustPuffs(dt: number, distStep: number): void {
    if (!this.dustMesh) return;
    let dirty = false;
    for (let i = 0; i < DUST_COUNT; i++) {
      const p = this.dustPool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        _dustDummy.scale.setScalar(0);
        _dustDummy.updateMatrix();
        this.dustMesh.setMatrixAt(i, _dustDummy.matrix);
        dirty = true;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 1.4 * dt;
      p.z += p.vz * dt + distStep;
      const t = p.age / p.maxAge;
      const s = t < 0.35 ? 0.5 + t * 4.0 : Math.max(0.01, (1 - t) * 2.8);
      _dustDummy.position.set(p.x, Math.max(0.1, p.y), p.z);
      _dustDummy.scale.setScalar(s);
      _dustDummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, _dustDummy.matrix);
      dirty = true;
    }
    if (dirty) {
      this.dustMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateExhaustPuffs(dt: number, boosting: boolean): void {
    if (!this.exhaustMesh) return;
    let dirty = false;

    if (boosting) {
      this.puffEmitAccum += dt;
      while (this.puffEmitAccum >= 0.032) {
        this.puffEmitAccum -= 0.032;
        const puff = this.puffPool[this.puffCursor];
        this.puffCursor = (this.puffCursor + 1) % PUFF_COUNT;
        puff.active = true;
        puff.x = this.playerX - 0.45 + (Math.random() - 0.5) * 0.08;
        puff.y = 0.34 + (Math.random() - 0.5) * 0.06;
        puff.z = 1.65;
        puff.vx = (Math.random() - 0.5) * 0.7;
        puff.vy = 0.55 + Math.random() * 0.55;
        puff.vz = 3.8 + this.playerSpeed * 0.28 + Math.random() * 1.4;
        puff.age = 0;
        puff.maxAge = 0.36 + Math.random() * 0.16;
      }
    } else {
      this.puffEmitAccum = 0;
    }

    for (let i = 0; i < PUFF_COUNT; i++) {
      const p = this.puffPool[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        _puffDummy.scale.setScalar(0);
        _puffDummy.updateMatrix();
        this.exhaustMesh.setMatrixAt(i, _puffDummy.matrix);
        dirty = true;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const t = p.age / p.maxAge;
      const s = t < 0.7 ? 0.5 + t * 1.7 : Math.max(0.01, (1 - t) * 5.6);
      _puffDummy.position.set(p.x, p.y, p.z);
      _puffDummy.scale.setScalar(s);
      _puffDummy.updateMatrix();
      this.exhaustMesh.setMatrixAt(i, _puffDummy.matrix);
      dirty = true;
    }

    if (dirty) {
      this.exhaustMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private spawnAreaGantry(name: string, tagline: string, accent: string, z: number): void {
    const g = createAreaGantry(name, tagline, accent, this.maxAnisotropy);
    g.position.set(0, 0, z);
    this.scene.add(g);
    this.gantries.push({ group: g, z });
  }

  private spawnTrafficLight(): void {
    const rig = createTrafficLightModel(this.maxAnisotropy);
    const spawnZ = -148;
    const roll = Math.random();
    let state: TrafficLightState = 'green';
    let timer = 4.5 + Math.random() * 3.5;

    if (roll < 0.38) {
      state = 'red';
      timer = 4.5 + Math.random() * 3.2;
    } else if (roll < 0.58) {
      state = 'yellow';
      timer = 2.0 + Math.random() * 0.8;
    }

    rig.setState(state);
    rig.group.position.set(0, 0, spawnZ);
    this.scene.add(rig.group);

    this.trafficLights.push({
      rig,
      z: spawnZ,
      prevStopZ: spawnZ + 8.5,
      state,
      timer,
      penalized: false,
      stoppedAtRed: false,
      rewardedGreen: false,
    });
  }

  private pickVehicleKind(): VehicleKind {
    const r = Math.random();
    if (r < 0.19) return 'bus';
    if (r < 0.34) return 'truck';
    if (r < 0.52) return 'car';
    if (r < 0.67) return 'bike';
    if (r < 0.8) return 'cng_ai';
    if (r < 0.91) return 'rickshaw';
    return 'thelagari';
  }

  private spawnTrafficVehicle(forcedLane?: number, forcedZ = -148, forcedSpeed?: number): void {
    const area = AREAS[this.areaIndex];
    const diff = 1 + (this.loopCount - 1) * 0.25;
    let kind = this.pickVehicleKind();

    const lane = forcedLane ?? LANES[Math.floor(Math.random() * LANES.length)];

    // Prevent overlap
    for (const other of this.traffic) {
      if (Math.abs(other.z - forcedZ) < 15 && Math.abs(other.x - lane) < 2.4) {
        return;
      }
    }

    // Never wall all 4 lanes with lethal buses/trucks simultaneously
    if (kind === 'bus' || kind === 'truck') {
      const heavyNearby = this.traffic.filter(
        (t) => (t.kind === 'bus' || t.kind === 'truck') && Math.abs(t.z - forcedZ) < 18
      );
      if (heavyNearby.length >= 2) {
        kind = Math.random() < 0.5 ? 'car' : 'cng_ai';
      }
    }

    const rig = createVehicleModel(kind, this.maxAnisotropy);
    const direction: 1 | -1 = lane < 0 ? -1 : 1; // Left carriageway = oncoming traffic (উল্টো পথ)!
    const baseSpeed =
      kind === 'thelagari'
        ? 5.5 + Math.random() * 2.5
        : kind === 'rickshaw'
        ? 8 + Math.random() * 3
        : kind === 'cng_ai'
        ? 14 + Math.random() * 4
        : kind === 'bike'
        ? 16 + Math.random() * 4
        : kind === 'truck'
        ? 11 + Math.random() * 3.5
        : kind === 'bus'
        ? 12.5 + Math.random() * 4
        : 13.5 + Math.random() * 4.5;

    const finalSpeed =
      direction === -1
        ? Math.min(16, baseSpeed * 0.68)
        : forcedSpeed ??
          baseSpeed * Math.min(1.45, diff * (0.85 + area.trafficMultiplier * 0.14));

    rig.group.position.set(lane, 0, forcedZ);
    rig.group.rotation.y = direction === -1 ? Math.PI : 0;
    this.scene.add(rig.group);

    this.traffic.push({
      rig,
      kind,
      x: lane,
      targetX: lane,
      z: forcedZ,
      speed: finalSpeed,
      baseSpeed: finalSpeed,
      prevSpeed: finalSpeed,
      direction,
      nearMissed: false,
      laneTimer: 1.5 + Math.random() * 3.0,
      honked: false,
      bouncePhase: Math.random() * Math.PI * 2,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 1.2 + Math.random() * 1.4,
      driftAmp: kind === 'rickshaw' || kind === 'thelagari' ? 0.24 : 0.14,
      suddenStopTimer: 0,
      suddenStopCooldown: 6 + Math.random() * 12,
      turnSignalDir: 0,
    });
  }

  private spawnTrafficJamCluster(): void {
    // Spawn a congested cluster in forward lanes [2.8, 6.0] + 1 oncoming
    const jamSpeed = 7.0 + Math.random() * 2.5;
    this.spawnTrafficVehicle(2.8, -142, jamSpeed);
    this.spawnTrafficVehicle(6.0, -152, jamSpeed);
    this.spawnTrafficVehicle(-2.8, -146, jamSpeed);
    this.sound.playTrafficHorn('heavy');
    this.callbacks.onToast({
      text: 'সামনে জ্যাম লেগেছে! সাবধানে ওভারটেক করুন 🚦',
      tone: 'warning',
    });
  }

  private spawnInitialPedestrians(): void {
    const initialZs = [-18, -32, -46, -60, -76, -92, -108, -124];
    for (const z of initialZs) {
      this.spawnPedestrian(z);
    }
  }

  private spawnRoadsideStall(side: -1 | 1, z = -142): void {
    if (this.stalls.length >= 6) return;
    const x = side * 7.85;
    const group = new THREE.Group();

    const crateMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 });
    const topCrateMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.82 });
    const poleMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 });
    const umbColors = ['#ef4444', '#facc15', '#0284c7', '#16a34a', '#ea580c'];
    const umbMat = new THREE.MeshStandardMaterial({
      color: umbColors[Math.floor(Math.random() * umbColors.length)],
      roughness: 0.68,
      side: THREE.DoubleSide,
    });

    const baseCrate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.56, 1.75), crateMat);
    baseCrate.position.set(0, 0.28, 0);
    const sideBox = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.68), topCrateMat);
    sideBox.position.set(-side * 0.16, 0.78, -0.35);

    const fruitColors = ['#facc15', '#f97316', '#ef4444', '#22c55e'];
    for (let f = 0; f < 5; f++) {
      const fruit = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.14, 0),
        new THREE.MeshStandardMaterial({ color: fruitColors[f % fruitColors.length], roughness: 0.5 })
      );
      fruit.position.set((f % 2 - 0.5) * 0.35, 0.68 + Math.floor(f / 3) * 0.14, -0.25 + f * 0.2);
      group.add(fruit);
    }

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.9, 6), poleMat);
    pole.position.set(side * 0.12, 1.25, 0.25);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.42, 8), umbMat);
    umb.position.set(side * 0.12, 2.22, 0.25);

    group.add(baseCrate, sideBox, pole, umb);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.stalls.push({
      group,
      x,
      z,
      hit: false,
      halfWidth: 0.72,
      halfLength: 1.05,
    });
  }

  private spawnPedestrian(forcedZ?: number): void {
    if (this.pedestrians.length >= 42) return;
    const side: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
    const baseZ = forcedZ ?? -136 - Math.random() * 20;
    const roll = Math.random();

    if (roll < 0.22 && this.pedestrians.length <= 39) {
      // Roadside Tea-Stall Sitters on wooden bench along brick sidewalk (y = 0.20)
      const benchX = side * 11.15;
      const bench = createTeaStallBench(this.maxAnisotropy);
      bench.position.set(benchX, 0.20, baseZ);
      this.scene.add(bench);

      const benchStyles: PedestrianStyle[] = ['lungi_shirt', 'panjabi', 'rickshaw_puller', 'office_wear'];
      for (let k = 0; k < 2; k++) {
        const s = benchStyles[Math.floor(Math.random() * benchStyles.length)];
        const rig = createPedestrianModel({
          style: s,
          withTeaCup: true,
          maxAnisotropy: this.maxAnisotropy,
        });
        const px = benchX - side * 0.08;
        const pz = baseZ + (k === 0 ? -0.45 : 0.45);
        rig.group.position.set(px, 0.20, pz);
        rig.group.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
        this.scene.add(rig.group);
        this.pedestrians.push({
          rig,
          propGroup: k === 0 ? bench : undefined,
          x: px,
          z: pz,
          baseY: 0.20,
          walkDir: 0,
          walkSpeed: 0,
          basePose: 'sit_tea_stall',
          isChasing: false,
          canCollide: false,
          hitCooldown: 0,
          animPhase: Math.random() * Math.PI * 2,
          jumpBackTimer: 0,
          fallTimer: 0,
          speechTimer: 0,
          reactYaw: side === 1 ? -Math.PI / 2 : Math.PI / 2,
          reactTimer: 0,
        });
      }
      return;
    }

    if (roll < 0.30 && this.pedestrians.length <= 39) {
      // Arguing pair on sidewalk edge
      const px = side * 9.55;
      for (let k = 0; k < 2; k++) {
        const rig = createPedestrianModel({
          style: pickRandomPedestrianStyle(),
          maxAnisotropy: this.maxAnisotropy,
        });
        const pz = baseZ + (k === 0 ? -0.55 : 0.55);
        const yaw = k === 0 ? 0 : Math.PI;
        rig.group.position.set(px, 0.20, pz);
        rig.group.rotation.y = yaw;
        this.scene.add(rig.group);
        this.pedestrians.push({
          rig,
          x: px,
          z: pz,
          baseY: 0.20,
          walkDir: 0,
          walkSpeed: 0,
          basePose: 'argue',
          isChasing: false,
          canCollide: false,
          hitCooldown: 0,
          animPhase: Math.random() * Math.PI * 2,
          jumpBackTimer: 0,
          fallTimer: 0,
          speechTimer: 0,
          reactYaw: yaw,
          reactTimer: 0,
        });
      }
      return;
    }

    if (roll < 0.38) {
      // Traffic Police on curb edge waving/directing traffic
      const rig = createPedestrianModel({
        style: 'traffic_police',
        maxAnisotropy: this.maxAnisotropy,
      });
      const px = side * 8.95;
      const yaw = side === 1 ? -Math.PI / 2 : Math.PI / 2;
      rig.group.position.set(px, 0.20, baseZ);
      rig.group.rotation.y = yaw;
      this.scene.add(rig.group);
      this.pedestrians.push({
        rig,
        x: px,
        z: baseZ,
        baseY: 0.20,
        walkDir: 0,
        walkSpeed: 0,
        basePose: 'wave',
        isChasing: false,
        canCollide: false,
        hitCooldown: 0,
        animPhase: Math.random() * Math.PI * 2,
        jumpBackTimer: 0,
        fallTimer: 0,
        speechTimer: 0,
        reactYaw: yaw,
        reactTimer: 0,
      });
      return;
    }

    // Active road/curb pedestrians: jaywalkers (cross_unaware), bag carriers, sidewalk strollers
    const jaywalks = roll < 0.72 + this.wanted * 0.04;
    const carryBag = !jaywalks && Math.random() < 0.65;
    const style = pickRandomPedestrianStyle();
    const rig = createPedestrianModel({
      style: style === 'traffic_police' ? 'office_wear' : style,
      carryBag,
      maxAnisotropy: this.maxAnisotropy,
    });
    const fromLeft = side === -1;
    const startX = jaywalks ? (fromLeft ? -8.8 : 8.8) : fromLeft ? -9.5 : 9.5;
    const baseY = Math.abs(startX) >= 8.7 ? 0.20 : 0;
    const basePose: PedestrianPose = jaywalks
      ? 'cross_unaware'
      : carryBag
      ? 'carry_bags'
      : 'walk';

    rig.group.position.set(startX, baseY, baseZ);
    this.scene.add(rig.group);

    this.pedestrians.push({
      rig,
      x: startX,
      z: baseZ,
      baseY,
      walkDir: jaywalks ? (fromLeft ? 1 : -1) : 0,
      walkSpeed: jaywalks ? 2.4 + Math.random() * 1.8 : 1.5 + Math.random() * 0.7,
      basePose,
      isChasing: false,
      canCollide: true,
      hitCooldown: 0,
      animPhase: Math.random() * Math.PI * 2,
      jumpBackTimer: 0,
      fallTimer: 0,
      speechTimer: 0,
      reactYaw: Math.PI,
      reactTimer: 0,
    });
  }

  private spawnWaitingPassenger(): void {
    const side: -1 | 1 = Math.random() < 0.5 ? 1 : -1;
    const x = side * 7.6;
    const z = -142;

    const destStep = 1 + Math.floor(Math.random() * 3);
    const destination = AREAS[(this.areaIndex + destStep) % AREAS.length].name;

    const passengerStyles: PedestrianStyle[] = ['office_wear', 'saree', 'panjabi', 'lungi_shirt', 'burqa', 'school_uniform'];
    const rig = createPedestrianModel({
      style: passengerStyles[Math.floor(Math.random() * passengerStyles.length)],
      isWaitingPassenger: true,
      carryBag: Math.random() < 0.45,
      maxAnisotropy: this.maxAnisotropy,
    });
    rig.group.position.set(side * 9.3, 0.20, z);
    rig.group.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;

    const pad = createZonePad('pickup', this.maxAnisotropy, destination);
    pad.position.set(x, 0, z);

    this.scene.add(rig.group);
    this.scene.add(pad);

    this.waitingPassengers.push({
      rig,
      pad,
      destination,
      x,
      z,
      wavePhase: 0,
      boardTimer: 0,
      pickedUp: false,
    });
  }

  private spawnZone(type: 'gas' | 'bribe' | 'dropoff'): void {
    const laneX = type === 'dropoff' ? (Math.random() < 0.5 ? 6.2 : -6.2) : Math.random() < 0.5 ? 4.4 : -4.4;
    const padLabel = type === 'dropoff' ? this.passengerDestination || undefined : undefined;
    const pad = createZonePad(type, this.maxAnisotropy, padLabel);
    if (laneX < 0 && pad.children[1] && type !== 'dropoff') {
      pad.children[1].position.x = -4.6;
    }
    pad.position.set(laneX, 0, -145);
    this.scene.add(pad);
    this.zones.push({ group: pad, type, x: laneX, z: -145, triggered: false });
  }

  private startRandomEvent(): void {
    const allKinds: RandomEventKind[] = ['road_digging', 'strike_procession', 'flooding', 'vip_convoy'];
    const pool = allKinds.filter((k) => k !== this.lastEventKind);
    const kind = pool[Math.floor(Math.random() * pool.length)] ?? 'road_digging';
    this.lastEventKind = kind;
    this.activeEventKind = kind;
    this.activeEventTimer = 20 + Math.random() * 10; // 20–30 seconds each
    this.diggingSpawnAccum = 28;
    this.processionSpawnAccum = 14;
    this.processionLaneX = Math.random() < 0.5 ? 2.8 : 6.0;
    this.vipSpawned = false;
    this.vipYieldAwarded = false;
    this.vipLaneX = Math.abs(this.playerX - 2.8) < 1.8 ? 6.0 : 2.8;
    this.vipSirenCooldown = 0.4;

    if (kind === 'flooding') {
      this.floodWaterMesh.visible = true;
    } else if (kind === 'vip_convoy') {
      this.spawnVipConvoy();
    } else if (kind === 'road_digging') {
      this.spawnDiggingBarriers();
    } else if (kind === 'strike_procession') {
      this.spawnProtestWave();
    }

    const cfg = RANDOM_EVENTS[kind];
    this.sound.playTrafficHornBurst(kind === 'vip_convoy' ? 'heavy' : 'light', 2);
    this.callbacks.onToast({
      text: cfg.alertText,
      tone: kind === 'flooding' ? 'info' : kind === 'vip_convoy' ? 'pink' : 'warning',
      priority: 'gas',
    });
  }

  private endRandomEvent(survived: boolean): void {
    if (!this.activeEventKind) return;
    const endedKind = this.activeEventKind;
    this.activeEventKind = null;
    this.activeEventTimer = 0;
    this.nextEventCooldown = 22 + Math.random() * 12;

    if (survived && this.phase === 'playing') {
      const cfg = RANDOM_EVENTS[endedKind];
      this.score += 150;
      this.callbacks.onMissionProgress('events_survived', 1);
      this.callbacks.onDriverXpGain?.(140);
      this.callbacks.onToast({
        text: `✅ ${cfg.shortLabel} নিরাপদে পার! +১৪০ XP`,
        tone: 'success',
        priority: 'level',
      });
    }
  }

  private spawnDiggingBarriers(): void {
    const forwardLanes = [2.8, 6.0];
    const pickedLane = forwardLanes[Math.floor(Math.random() * forwardLanes.length)];
    const lanesToBlock = Math.random() < 0.35 ? [pickedLane, -2.8] : [pickedLane];
    for (const bx of lanesToBlock) {
      const rig = createRoadDiggingBarrier(this.maxAnisotropy);
      const bz = -142 - (bx < 0 ? 12 : 0);
      rig.group.position.set(bx, 0, bz);
      this.scene.add(rig.group);
      this.diggingBarriers.push({ rig, x: bx, z: bz, hit: false });
    }
  }

  private spawnProtestWave(): void {
    const labels = ['দাবি মানতে হবে!', 'হরতাল চলছে!', 'রাস্তা ছাড়ো!', 'চাকা বন্ধ!'];
    const colors = ['#dc2626', '#b91c1c', '#9f1239', '#ea580c'];
    const styles: PedestrianStyle[] = ['lungi_shirt', 'panjabi', 'office_wear', 'rickshaw_puller'];
    const count = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < count; i++) {
      if (this.pedestrians.length >= 44) break;
      const rig = createPedestrianModel({
        style: styles[i % styles.length],
        maxAnisotropy: this.maxAnisotropy,
      });
      const placard = createProtestPlacard(
        labels[(i + Math.floor(Math.random() * labels.length)) % labels.length],
        colors[i % colors.length],
        this.maxAnisotropy
      );
      rig.group.add(placard);

      const px = THREE.MathUtils.clamp(this.processionLaneX + (i - 0.5) * 1.15, 1.4, 7.2);
      const pz = -138 - i * 2.1;
      rig.group.position.set(px, 0, pz);
      rig.group.rotation.y = Math.PI;
      this.scene.add(rig.group);

      this.pedestrians.push({
        rig,
        x: px,
        z: pz,
        baseY: 0,
        walkDir: 0,
        walkSpeed: 4.2,
        basePose: 'wave',
        isChasing: false,
        isProtestor: true,
        canCollide: true,
        hitCooldown: 0,
        animPhase: Math.random() * Math.PI * 2,
        jumpBackTimer: 0,
        fallTimer: 0,
        speechTimer: 0,
        reactYaw: Math.PI,
        reactTimer: 0,
      });
    }
  }

  private spawnVipConvoy(): void {
    if (this.vipSpawned) return;
    this.vipSpawned = true;
    const roles: ('police' | 'vip')[] = ['police', 'vip', 'police'];
    const zOffsets = [-150, -162, -174];
    for (let i = 0; i < roles.length; i++) {
      const rig = createVipConvoyVehicle(roles[i], this.maxAnisotropy);
      const z = zOffsets[i];
      rig.group.position.set(this.vipLaneX, 0, z);
      rig.group.rotation.y = 0;
      this.scene.add(rig.group);
      this.traffic.push({
        rig,
        kind: 'car',
        x: this.vipLaneX,
        targetX: this.vipLaneX,
        z,
        speed: 25,
        baseSpeed: 25,
        prevSpeed: 25,
        direction: 1,
        nearMissed: false,
        laneTimer: 99,
        honked: true,
        bouncePhase: i * 1.1,
        driftPhase: 0,
        driftSpeed: 0,
        driftAmp: 0,
        suddenStopTimer: 0,
        suddenStopCooldown: 99,
        turnSignalDir: 0,
        isVipConvoy: true,
      });
    }
  }

  private triggerCrowdReaction(
    originX: number,
    originZ: number,
    category: SpeechCategory,
    chaseQuota: number
  ): void {
    let chasersAdded = 0;
    let bubblesShown = 0;

    for (const p of this.pedestrians) {
      if (Math.abs(p.z - originZ) > 26 || Math.abs(p.x - originX) > 12) continue;

      // Nearby pedestrians turn toward player and shout short Bangla lines
      p.reactYaw = Math.atan2(this.playerX - p.x, 0 - p.z);
      p.reactTimer = 2.6;

      if (bubblesShown < 4 && p.speechTimer <= 0.1) {
        bubblesShown++;
        p.rig.showSpeech(category);
        p.speechTimer = 2.4;
      }

      if (
        chasersAdded < chaseQuota &&
        p.canCollide &&
        !p.isChasing &&
        p.fallTimer <= 0 &&
        Math.abs(p.x - originX) < 8.5 &&
        Math.abs(p.z - originZ) < 16
      ) {
        chasersAdded++;
        p.isChasing = true;
        p.rig.alertBadge.visible = true;
      }
    }
  }

  private handleGameOver(reason: DeathReason): void {
    this.phase = 'gameover';
    this.isDraggingLook = false;
    this.input.lookBack = false;
    this.cngRig.group.visible = true;
    this.syncCameraVisibility();
    if (this.pickupRingGroup) this.pickupRingGroup.visible = false;
    this.resetExhaustPuffs();
    this.shakeTrauma = 1.0;
    this.spawnDustBurst(this.playerX, 0.35, 0, 14);
    this.spawnDebrisBurst(this.playerX, 0.65, -0.2, 22, 1.45);
    this.sound.stopEngine();
    this.sound.playCrash(true);
    this.vibrate([80, 35, 110]);
    this.callbacks.onCrashJuice?.('major');

    // Render exact crash moment & capture canvas photo for the newspaper ("ঘটনাস্থলের ছবি")
    let crashPhotoDataUrl: string | undefined;
    try {
      this.renderer.render(this.scene, this.camera);
      crashPhotoDataUrl = this.renderer.domElement.toDataURL('image/jpeg', 0.86);
    } catch {
      crashPhotoDataUrl = undefined;
    }

    const pool = SATIRE_HEADLINES[reason];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const finalScore = Math.round(this.score);
    const isNewRecord = finalScore > this.highScoreRef;
    if (isNewRecord) this.highScoreRef = finalScore;

    const summary: GameOverSummary = {
      reason,
      headline: pick.headline,
      subheadline: pick.subheadline,
      score: finalScore,
      runTaka: Math.round(this.runTaka),
      nationalDamage: Math.round(this.nationalDamage),
      areaName: AREAS[this.areaIndex].name,
      loopCount: this.loopCount,
      distanceMeters: Math.round(this.distanceMeters),
      isNewRecord,
      crashPhotoDataUrl,
    };

    this.emitHud();

    // Crash Cinematic (0.6s slow-mo + "ধপাস!" + 2.0s top-down orbit showing converging crowd)
    if (reason === 'bus' || reason === 'truck' || reason === 'pedestrian') {
      this.crashCinematicActive = true;
      this.crashCinematicTimer = 0;
      this.gameoverImpactTimer = 2.65;
      this.pendingGameOverSummary = summary;
      this.triggerCrowdReaction(this.playerX, 0, 'crash', 6);
      this.callbacks.onCrashBurstText?.('ধপাস!');
      return;
    }

    this.gameoverImpactTimer = 0.55;
    this.callbacks.onGameOver(summary);
  }

  private emitHud(): void {
    const area = AREAS[this.areaIndex];
    const inGas = this.zones.some(
      (z) => z.type === 'gas' && Math.abs(z.z) < 6 && Math.abs(z.x - this.playerX) < 3.1
    );
    const inBribe = this.zones.some(
      (z) => z.type === 'bribe' && Math.abs(z.z) < 6 && Math.abs(z.x - this.playerX) < 3.1
    );
    const nearPickup = this.waitingPassengers.some(
      (wp) => !wp.pickedUp && wp.z > -32 && wp.z < 6
    );

    // Nearest Gas Zone distance & direction for minimap pill
    let nearestGasDist: number | null = null;
    let nearestGasAhead = true;
    for (const z of this.zones) {
      if (z.type !== 'gas') continue;
      const dist = Math.abs(Math.round(z.z));
      if (nearestGasDist === null || dist < nearestGasDist) {
        nearestGasDist = dist;
        nearestGasAhead = z.z <= 0;
      }
    }

    // Nearest blocking heavy vehicle or road-digging barrier ahead in player's path
    let aheadHazard: { label: string; sub: string; dist: number } | null = null;
    for (const t of this.traffic) {
      if (t.z < -4 && t.z > -65 && Math.abs(t.x - this.playerX) < 2.2) {
        const d = Math.round(Math.abs(t.z));
        if (!aheadHazard || d < aheadHazard.dist) {
          aheadHazard = {
            label: t.isVipConvoy ? 'ভিআইপি!' : t.direction === -1 ? 'মুখোমুখি!' : 'অবরোধ',
            sub: t.isVipConvoy
              ? 'সাইড দিন!'
              : t.kind === 'bus' || t.kind === 'truck'
              ? 'বড় গাড়ি সামনে!'
              : 'ওভারটেক করুন!',
            dist: d,
          };
        }
      }
    }
    for (const b of this.diggingBarriers) {
      if (!b.hit && b.z < -4 && b.z > -65 && Math.abs(b.x - this.playerX) < 2.2) {
        const d = Math.round(Math.abs(b.z));
        if (!aheadHazard || d < aheadHazard.dist) {
          aheadHazard = {
            label: 'রাস্তা খোঁড়া!',
            sub: 'লেন বদলান!',
            dist: d,
          };
        }
      }
    }

    // Nearest upcoming traffic light (stop line ahead of or right at player)
    let aheadTrafficLight: { state: TrafficLightState; dist: number; timeLeft: number } | null = null;
    for (const tl of this.trafficLights) {
      const stopZ = tl.z + 8.5;
      if (stopZ <= 1.5 && stopZ > -95) {
        const d = Math.max(0, Math.round(Math.abs(stopZ)));
        if (!aheadTrafficLight || d < aheadTrafficLight.dist) {
          aheadTrafficLight = {
            state: tl.state,
            dist: d,
            timeLeft: Math.max(1, Math.ceil(tl.timer)),
          };
        }
      }
    }

    // Rear hazard check for Driver View looking glass badge ("পেছনে বাস" etc.)
    let rearHazard: string | null = null;
    let nearestRearZ = 999;
    for (const t of this.traffic) {
      if (t.z > 1.4 && t.z < 24 && Math.abs(t.x - this.playerX) < 3.6 && t.z < nearestRearZ) {
        nearestRearZ = t.z;
        rearHazard =
          t.isVipConvoy
            ? 'পেছনে ভিআইপি'
            : t.kind === 'bus'
            ? 'পেছনে বাস'
            : t.kind === 'truck'
            ? 'পেছনে ট্রাক'
            : t.kind === 'car'
            ? 'পেছনে গাড়ি'
            : 'পেছনে যান';
      }
    }

    const radarEntities: RadarEntity[] = [];
    for (const tl of this.trafficLights) {
      const stopZ = tl.z + 8.5;
      if (stopZ > -95 && stopZ < 40) {
        radarEntities.push({
          dx: 0,
          dz: stopZ,
          kind:
            tl.state === 'red'
              ? 'light_red'
              : tl.state === 'yellow'
              ? 'light_yellow'
              : 'light_green',
        });
      }
    }
    for (const b of this.diggingBarriers) {
      if (b.z > -95 && b.z < 40) {
        radarEntities.push({
          dx: b.x - this.playerX,
          dz: b.z,
          kind: 'hazard',
        });
      }
    }
    for (const t of this.traffic) {
      if (t.z > -90 && t.z < 40) {
        radarEntities.push({
          dx: t.x - this.playerX,
          dz: t.z,
          kind: t.isVipConvoy
            ? 'hazard'
            : t.kind === 'bus'
            ? 'bus'
            : t.kind === 'truck'
            ? 'truck'
            : t.kind === 'car'
            ? 'car'
            : 'other',
        });
      }
    }
    for (const z of this.zones) {
      if (z.z > -120 && z.z < 90) {
        radarEntities.push({
          dx: z.x - this.playerX,
          dz: z.z,
          kind: z.type,
        });
      }
    }
    for (const wp of this.waitingPassengers) {
      if (!wp.pickedUp && wp.z > -120 && wp.z < 60) {
        radarEntities.push({
          dx: wp.x - this.playerX,
          dz: wp.z,
          kind: 'pickup',
        });
      }
    }

    const activeEventCfg = this.activeEventKind ? RANDOM_EVENTS[this.activeEventKind] : null;

    let pickupProgress = 0;
    for (const wp of this.waitingPassengers) {
      if (!wp.pickedUp) {
        pickupProgress = Math.max(pickupProgress, Math.min(1, wp.boardTimer / 1.5));
      }
    }

    this.callbacks.onHudUpdate({
      score: Math.round(this.score),
      runTaka: Math.round(this.runTaka),
      nationalDamage: Math.round(this.nationalDamage),
      gas: Math.max(0, Math.min(100, this.gas)),
      hp: Math.max(0, Math.min(100, this.hp)),
      speedKmh: Math.round(this.playerSpeed * 2.5),
      wanted: this.wanted,
      areaIndex: this.areaIndex,
      areaName: area.name,
      areaTagline: area.tagline,
      loopCount: this.loopCount,
      distanceMeters: Math.round(this.distanceMeters),
      boosting: Boolean(this.input.boost && this.gas > 2 && this.playerSpeed > 10),
      chasedCount: this.pedestrians.filter((p) => p.isChasing).length,
      inGasZone: inGas,
      inBribeZone: inBribe,
      passengerActive: this.passengerActive,
      passengerDestination: this.passengerActive ? this.passengerDestination : '',
      passengerFare: this.passengerFare,
      passengerDistLeft: Math.max(0, Math.round(this.passengerDistLeft)),
      passengerNearPickup: nearPickup,
      pickupProgress,
      activeEvent: activeEventCfg
        ? {
            kind: activeEventCfg.kind,
            label: activeEventCfg.shortLabel,
            emoji: activeEventCfg.emoji,
            timeLeft: Math.max(1, Math.ceil(this.activeEventTimer)),
          }
        : null,
      cameraMode: this.cameraMode,
      steerDir: this.steerDir,
      wrongWay: this.playerX < -0.55,
      nearestGasDist,
      nearestGasAhead,
      aheadHazard,
      aheadTrafficLight,
      rearHazard,
      weather: this.weather,
      atmosphereMode: this.atmosphereMode,
      graphicsQuality: this.graphicsQuality,
      soundBombCooldown: Math.max(0, Math.ceil(this.soundBombCooldown)),
      radarEntities,
    });
  }

  private updateAtmosphereAndLighting(dt: number): void {
    const isRain = this.atmosphereMode === 'rain' || this.weather === 'rainy';
    const isEvening = !isRain && this.atmosphereMode === 'evening';
    const isFoggy = !isRain && this.weather === 'foggy';
    const isHigh = this.graphicsQuality === 'high';

    // Center sky dome on camera so horizon never clips
    this.skyMesh.position.set(this.camera.position.x, 0, this.camera.position.z - 20);

    // Scope directional shadow frustum tightly around the player's CNG
    const focusX = this.phase === 'garage' ? 0 : this.playerX;
    this.sunLight.target.position.set(focusX, 0, -1.5);
    this.sunLight.target.updateMatrixWorld();

    let targetFogDensity = 0.0085;
    let targetSunLightInt = 1.65;
    let targetHemiInt = 1.15;
    let targetSunVis = 1.0;
    let targetSmog = 0.86;
    let targetRoadRough = 0.94;
    let targetRoadMetal = 0.04;
    let targetEnvInt = 1.2;
    let targetStreetEmissive = 0.25;
    let targetStreetGlow = 0.05;
    let targetStreetPool = 0.0;
    let targetCngGlow = 0.16;

    if (isRain) {
      _targetTop.set('#363f4b');
      _targetHorizon.set('#5e6975');
      _targetSmog.set('#545f6b');
      _targetSunCol.set('#cbd5e1');
      _targetSunDir.set(0.24, 0.28, -1.0).normalize();
      _targetSunLightCol.set('#cbd5e1');
      _targetHemiSky.set('#94a3b8');
      _targetHemiGround.set('#334155');
      this.sunLight.position.set(focusX + 8, 17, 9);

      targetFogDensity = 0.0175;
      targetSunLightInt = 0.72;
      targetHemiInt = 0.92;
      targetSunVis = 0.08;
      targetSmog = 0.94;
      targetRoadRough = 0.20;
      targetRoadMetal = 0.18;
      targetEnvInt = 1.95;
      targetStreetEmissive = 2.7;
      targetStreetGlow = 0.72;
      targetStreetPool = isHigh ? 0.24 : 0.0;
      targetCngGlow = 0.85;
    } else if (isEvening) {
      _targetTop.set('#38284c');
      _targetHorizon.set('#f4903c');
      _targetSmog.set('#d96c38');
      _targetSunCol.set('#ffedd5');
      _targetSunDir.set(0.20, 0.11, -1.0).normalize();
      _targetSunLightCol.set('#ff9b52');
      _targetHemiSky.set('#fdba74');
      _targetHemiGround.set('#422006');
      this.sunLight.position.set(focusX + 10, 12, 8);

      targetFogDensity = isFoggy ? 0.036 : 0.0095;
      targetSunLightInt = isFoggy ? 0.78 : 1.38;
      targetHemiInt = 0.9;
      targetSunVis = isFoggy ? 0.35 : 1.15;
      targetSmog = 0.92;
      targetRoadRough = isFoggy ? 0.65 : 0.88;
      targetRoadMetal = 0.08;
      targetEnvInt = 1.35;
      targetStreetEmissive = 3.2;
      targetStreetGlow = 0.88;
      targetStreetPool = isHigh ? 0.30 : 0.0;
      targetCngGlow = 0.95;
    } else {
      // Dusty yellow-beige Chattogram daytime
      _targetTop.set('#93aabd');
      _targetHorizon.set('#e7d39f');
      _targetSmog.set('#dec68d');
      _targetSunCol.set('#fff2c2');
      _targetSunDir.set(0.26, 0.24, -1.0).normalize();
      _targetSunLightCol.set('#fff2cf');
      _targetHemiSky.set('#f5e6bf');
      _targetHemiGround.set('#574c3f');
      this.sunLight.position.set(focusX + 10, 17, 9);

      targetFogDensity = isFoggy ? 0.036 : 0.0085;
      targetSunLightInt = isFoggy ? 0.68 : 1.65;
      targetHemiInt = isFoggy ? 0.98 : 1.15;
      targetSunVis = isFoggy ? 0.32 : 1.0;
      targetSmog = isFoggy ? 1.0 : 0.86;
      targetRoadRough = isFoggy ? 0.68 : 0.94;
      targetRoadMetal = isFoggy ? 0.08 : 0.04;
      targetEnvInt = 1.2;
      targetStreetEmissive = isFoggy ? 1.5 : 0.25;
      targetStreetGlow = isFoggy ? 0.45 : 0.05;
      targetStreetPool = isFoggy && isHigh ? 0.08 : 0.0;
      targetCngGlow = isFoggy ? 0.52 : 0.16;
    }

    const blend = Math.min(1, dt * 2.4);
    this.skyUniforms.uTopColor.value.lerp(_targetTop, blend);
    this.skyUniforms.uHorizonColor.value.lerp(_targetHorizon, blend);
    this.skyUniforms.uSmogColor.value.lerp(_targetSmog, blend);
    this.skyUniforms.uSunColor.value.lerp(_targetSunCol, blend);
    this.skyUniforms.uSunDir.value.lerp(_targetSunDir, blend).normalize();
    this.skyUniforms.uSunIntensity.value = THREE.MathUtils.damp(
      this.skyUniforms.uSunIntensity.value,
      targetSunVis,
      2.6,
      dt
    );
    this.skyUniforms.uSmogStrength.value = THREE.MathUtils.damp(
      this.skyUniforms.uSmogStrength.value,
      targetSmog,
      2.6,
      dt
    );

    (this.scene.background as THREE.Color).lerp(_targetSmog, blend);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(_targetSmog, blend);
      this.scene.fog.density = THREE.MathUtils.damp(this.scene.fog.density, targetFogDensity, 2.2, dt);
    }

    this.sunLight.color.lerp(_targetSunLightCol, blend);
    this.sunLight.intensity = THREE.MathUtils.damp(this.sunLight.intensity, targetSunLightInt, 2.4, dt);
    this.hemiLight.color.lerp(_targetHemiSky, blend);
    this.hemiLight.groundColor.lerp(_targetHemiGround, blend);
    this.hemiLight.intensity = THREE.MathUtils.damp(this.hemiLight.intensity, targetHemiInt, 2.4, dt);
    this.rimLight.color.lerp(_targetHorizon, blend);

    this.roadMatPlain.roughness = THREE.MathUtils.damp(this.roadMatPlain.roughness, targetRoadRough, 2.5, dt);
    this.roadMatZebra.roughness = this.roadMatPlain.roughness;
    this.roadMatPlain.metalness = THREE.MathUtils.damp(this.roadMatPlain.metalness, targetRoadMetal, 2.5, dt);
    this.roadMatZebra.metalness = this.roadMatPlain.metalness;
    this.roadMatPlain.envMapIntensity = THREE.MathUtils.damp(
      this.roadMatPlain.envMapIntensity,
      targetEnvInt,
      2.5,
      dt
    );
    this.roadMatZebra.envMapIntensity = this.roadMatPlain.envMapIntensity;

    this.streetBulbMat.emissiveIntensity = THREE.MathUtils.damp(
      this.streetBulbMat.emissiveIntensity,
      targetStreetEmissive,
      3.0,
      dt
    );
    this.streetGlowMat.opacity = THREE.MathUtils.damp(
      this.streetGlowMat.opacity,
      targetStreetGlow,
      3.0,
      dt
    );
    this.streetPoolMat.opacity = THREE.MathUtils.damp(
      this.streetPoolMat.opacity,
      targetStreetPool,
      3.0,
      dt
    );
    this.cngRig.setLightsGlow(targetCngGlow);

    if (this.rainLines.visible) {
      const posAttr = this.rainLines.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = this.rainPositions;
      const activeCount = isHigh ? RAIN_COUNT : Math.floor(RAIN_COUNT * 0.45);
      const speedRef = this.phase === 'playing' ? this.playerSpeed : 4;
      const fallY = 26 * dt;
      const slantZ = (1.6 + speedRef * 0.35) * dt;
      for (let i = 0; i < activeCount; i++) {
        const idx = i * 6;
        arr[idx + 1] -= fallY;
        arr[idx + 4] -= fallY;
        arr[idx + 2] += slantZ;
        arr[idx + 5] += slantZ;

        if (arr[idx + 1] < 0 || arr[idx + 2] > 12) {
          const rx = focusX + (Math.random() - 0.5) * 26;
          const ry = 10 + Math.random() * 5;
          const rz = -34 + Math.random() * 40;
          arr[idx] = rx;
          arr[idx + 1] = ry;
          arr[idx + 2] = rz;
          arr[idx + 3] = rx - 0.09;
          arr[idx + 4] = ry + 0.72;
          arr[idx + 5] = rz - (0.18 + speedRef * 0.012);
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  private stepGameplay(dt: number, realDt: number): void {
    const area = AREAS[this.areaIndex];
    const loopMult = 1 + (this.loopCount - 1) * 0.22;

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.dividerCooldown > 0) this.dividerCooldown -= dt;
    if (this.shakeTimer > 0) this.shakeTimer -= realDt;
    if (this.shakeTrauma > 0) this.shakeTrauma = Math.max(0, this.shakeTrauma - realDt * 2.35);
    if (this.hornCooldown > 0) this.hornCooldown -= realDt;
    if (this.soundBombCooldown > 0) this.soundBombCooldown = Math.max(0, this.soundBombCooldown - realDt);
    if (this.trafficHornCooldown > 0) this.trafficHornCooldown -= realDt;
    if (this.gasZoneSoundCooldown > 0) this.gasZoneSoundCooldown -= realDt;

    // Random weather cycling during gameplay
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      const candidates: WeatherCondition[] = (['sunny', 'rainy', 'foggy'] as WeatherCondition[]).filter(
        (w) => w !== this.weather
      );
      const nextWeather = candidates[Math.floor(Math.random() * candidates.length)];
      this.applyWeather(nextWeather, true);
    }

    const engineMult = 1 + this.equippedUpgrades.engine * 0.08;
    const tankDrainMult = Math.max(0.65, 1 - this.equippedUpgrades.tank * 0.1);
    const tankRefillMult = 1 + this.equippedUpgrades.tank * 0.15;
    const chassisDmgMult = Math.max(0.4, 1 - this.equippedUpgrades.chassis * 0.18);
    const handlingMult = 1 + this.equippedUpgrades.handling * 0.12;
    const isFlooding = this.activeEventKind === 'flooding';

    // Speed & Boost physics (Weather & Flooding impact traction, braking distance & top speed)
    const boosting = this.input.boost && this.gas > 2;
    if (boosting && !this.wasBoosting) {
      this.boostFovKick = 1.0;
      this.vibrate(14);
    }
    this.wasBoosting = boosting;

    const weatherSpeedMult = (this.weather === 'foggy' ? 0.92 : 1.0) * (isFlooding ? 0.89 : 1.0);
    const maxSpeed =
      (boosting ? 50 : 35) *
      engineMult *
      Math.min(1.35, 1 + (this.loopCount - 1) * 0.08) *
      weatherSpeedMult;
    let targetSpeed = 14 * weatherSpeedMult;
    if (this.input.up || boosting) targetSpeed = maxSpeed;
    else if (this.input.down) targetSpeed = 0;

    const baseBrakeDamp = this.weather === 'rainy' || isFlooding ? 4.3 : this.weather === 'foggy' ? 6.8 : 9.2;
    const brakeDamp = baseBrakeDamp * handlingMult;
    const accelDamp = (this.weather === 'rainy' ? 2.4 : 3.4) * engineMult;

    this.prevPlayerSpeed = this.playerSpeed;
    this.playerSpeed = THREE.MathUtils.damp(
      this.playerSpeed,
      targetSpeed,
      this.input.down ? brakeDamp : accelDamp,
      dt
    );
    if (this.input.down && this.playerSpeed < 0.3) {
      this.playerSpeed = 0;
    }

    const playerAccel = (this.playerSpeed - this.prevPlayerSpeed) / Math.max(dt, 0.008);
    const targetPitch = THREE.MathUtils.clamp(-playerAccel * 0.0032 - (boosting ? 0.025 : 0), -0.065, 0.075);
    this.playerPitch = THREE.MathUtils.damp(this.playerPitch, targetPitch, 11, dt);

    this.cngRig.boostFlameLeft.visible = boosting;
    this.cngRig.boostFlameRight.visible = boosting;
    if (boosting) {
      const flicker = 0.8 + Math.sin(this.realTime * 52) * 0.25 + 0.15;
      this.cngRig.boostFlameLeft.scale.set(1, flicker, 1);
      this.cngRig.boostFlameRight.scale.set(1, flicker, 1);
      this.boostMissionAccum += dt;
      if (this.boostMissionAccum >= 1) {
        const whole = Math.floor(this.boostMissionAccum);
        this.boostMissionAccum -= whole;
        this.callbacks.onMissionProgress('boost_time', whole);
      }
    }
    this.updateExhaustPuffs(dt, boosting);

    // Smooth Damped Steering, Body Lean, Front Wheel Turn & Cockpit Handlebar (Zero FPS Jitter)
    const steerInput = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    this.steerDir = steerInput as -1 | 0 | 1;
    this.steerSmoothed = THREE.MathUtils.damp(this.steerSmoothed, steerInput, 14, dt);

    const baseSteerSpeed = 12.0 * handlingMult * (0.65 + 0.35 * (this.playerSpeed / 35));
    const steerMult = this.weather === 'foggy' ? 0.88 : this.weather === 'rainy' || isFlooding ? 1.06 : 1.0;
    let targetLatVel = steerInput * baseSteerSpeed * steerMult;
    if ((this.weather === 'rainy' || isFlooding) && this.playerSpeed > 24) {
      targetLatVel += Math.sin(this.animTime * (isFlooding ? 9.5 : 8.0)) * ((isFlooding ? 1.75 : 1.45) / handlingMult);
    }
    const latDamp = (this.weather === 'rainy' || isFlooding ? 5.0 : this.weather === 'foggy' ? 12.5 : 18.0) * handlingMult;
    this.lateralVel = THREE.MathUtils.damp(this.lateralVel, targetLatVel, latDamp, dt);

    const unclampedX = this.playerX + this.lateralVel * dt;
    this.playerX = THREE.MathUtils.clamp(unclampedX, -7.4, 7.4);
    if (this.playerX !== unclampedX) {
      this.lateralVel = 0;
    }
    this.playerRoll = THREE.MathUtils.damp(
      this.playerRoll,
      -THREE.MathUtils.clamp(this.lateralVel / 12, -1.25, 1.25) * 0.165,
      11,
      dt
    );

    const speedRatio = Math.min(1.2, this.playerSpeed / 38);
    this.cngRig.group.position.x = this.playerX;
    this.cngRig.bodyGroup.rotation.z = this.playerRoll;
    this.cngRig.bodyGroup.rotation.x = this.playerPitch;
    this.cngRig.bodyGroup.position.y =
      Math.sin(this.animTime * 36) * (0.01 + speedRatio * 0.006);

    // Physical wheel & fork turn + cockpit handlebar swing
    this.cngRig.setSteerAngle(-this.steerSmoothed * 0.36);
    this.handlebarAngle = -this.steerSmoothed * 0.19;
    this.cockpitRig.handlebarPivot.rotation.y = this.handlebarAngle;
    if (this.cameraMode === 'driver') {
      this.cockpitRig.updateMeter(this.playerSpeed * 2.5, this.gas, boosting);
    }

    // Tire road-dust trail during hard braking, sharp cornering, or high-speed boost on dry asphalt
    if (
      this.weather !== 'rainy' &&
      this.playerSpeed > 16 &&
      (boosting || Math.abs(this.lateralVel) > 4.4 || (this.input.down && this.playerSpeed > 18))
    ) {
      this.wheelDustAccum += dt;
      if (this.wheelDustAccum >= 0.06) {
        this.wheelDustAccum = 0;
        const side = Math.random() < 0.5 ? -0.75 : 0.75;
        this.spawnDustBurst(this.playerX + side, 0.12, 0.95, 1);
      }
    } else {
      this.wheelDustAccum = 0;
    }

    this.ornamentPhase += dt * (4.5 + this.playerSpeed * 0.22);
    const targetOrnZ = -this.steerSmoothed * 0.28 + Math.sin(this.ornamentPhase) * (0.08 + (boosting ? 0.09 : 0));
    const targetOrnX = (this.input.down ? -0.22 : boosting ? 0.24 : 0.06) + Math.cos(this.ornamentPhase * 0.8) * 0.05;
    this.cockpitRig.ornamentPivot.rotation.z = THREE.MathUtils.damp(
      this.cockpitRig.ornamentPivot.rotation.z,
      targetOrnZ,
      9,
      dt
    );
    this.cockpitRig.ornamentPivot.rotation.x = THREE.MathUtils.damp(
      this.cockpitRig.ornamentPivot.rotation.x,
      targetOrnX,
      9,
      dt
    );
    this.cngRig.ornamentPivot.rotation.z = this.cockpitRig.ornamentPivot.rotation.z;
    this.cngRig.ornamentPivot.rotation.x = this.cockpitRig.ornamentPivot.rotation.x;

    const wheelSpin = (this.playerSpeed * dt) / 0.32;
    for (const w of this.cngRig.wheels) {
      w.rotation.x -= wheelSpin;
    }

    this.cngRig.group.visible = true;
    if (this.cameraMode !== 'driver') {
      const blinkVis = this.invulnTimer <= 0 || Math.floor(this.invulnTimer * 16) % 2 === 0;
      this.cngRig.bodyGroup.visible = blinkVis;
      for (const w of this.cngRig.wheels) {
        w.visible = blinkVis;
      }
    }

    const chasedNow = this.pedestrians.filter((p) => p.isChasing).length;
    this.sound.updateEngine(Math.min(1.15, this.playerSpeed / 38), boosting, true, chasedNow);

    const distStep = this.playerSpeed * dt;
    this.distanceMeters += distStep;
    this.areaProgress += distStep;
    this.distanceSinceGasZone += distStep;
    this.distanceSinceBribeZone += distStep;
    this.distanceSincePassenger += distStep;
    this.distanceSinceTrafficLight += distStep;

    const wrongWayMult = this.playerX < -0.55 ? 1.5 : 1.0;
    this.score += distStep * (boosting ? 1.8 : 1.0) * loopMult * wrongWayMult;
    this.runTaka += distStep * 0.14 * (wrongWayMult > 1 ? 1.25 : 1.0);

    this.distMissionAccum += distStep;
    if (this.distMissionAccum >= 25) {
      const chunk = Math.floor(this.distMissionAccum);
      this.distMissionAccum -= chunk;
      this.callbacks.onMissionProgress('distance', chunk);
    }

    // Area progression
    if (this.areaProgress >= area.length) {
      this.areaProgress -= area.length;
      this.areaIndex = (this.areaIndex + 1) % AREAS.length;
      if (this.areaIndex === 0) {
        this.loopCount += 1;
        this.callbacks.onToast({
          text: `নতুন লুপ #${toBn(this.loopCount)} শুরু! রাস্তায় চাপ আরও বেড়েছে!`,
          tone: 'warning',
        });
      }
      const nextArea = AREAS[this.areaIndex];
      this.runTaka += 60 * this.loopCount;
      this.score += 250 * this.loopCount;
      this.spawnAreaGantry(nextArea.name, nextArea.tagline, nextArea.accentColor, -135);
      this.sound.playAreaBanner();
      this.callbacks.onAreaEnter(nextArea.name, nextArea.tagline, this.loopCount);
      this.callbacks.onMissionProgress('areas', 1);
    }

    // Smooth dusty sky dome, horizon smog, tight CNG shadow tracking, road wetness & rain
    this.updateAtmosphereAndLighting(dt);

    // Gas consumption (gentle idle drain when stopped at red light)
    const gasDrain =
      (this.playerSpeed < 1.0
        ? 0.35
        : (boosting ? 4.6 : 1.95) * (1 + (this.loopCount - 1) * 0.12)) * tankDrainMult;
    this.gas -= gasDrain * dt;
    if (this.gas <= 0) {
      this.gas = 0;
      this.handleGameOver('gas');
      return;
    }

    // Recycle road chunks & rebuild area scenery as chunks wrap
    const TOTAL_ROAD_LEN = 45 * 6;
    for (let idx = 0; idx < this.roadChunks.length; idx++) {
      const chunk = this.roadChunks[idx];
      chunk.z += distStep;
      if (chunk.z > 55) {
        chunk.z -= TOTAL_ROAD_LEN;
        if (chunk.builtAreaIndex !== this.areaIndex) {
          this.rebuildChunkScenery(chunk, idx + Math.floor(this.distanceMeters / 45));
        }
      }
      chunk.group.position.z = chunk.z;

      // Center divider collision check (full chunk divider sits [-20,+16], zebra chunk divider sits [0,+20])
      if (this.dividerCooldown <= 0) {
        const divMinZ = chunk.hasDivider ? chunk.z - 20 : chunk.z;
        const divMaxZ = chunk.hasDivider ? chunk.z + 16 : chunk.z + 20;
        if (0 >= divMinZ && 0 <= divMaxZ && Math.abs(this.playerX) < 1.05) {
          this.dividerCooldown = 0.45;
          this.nationalDamage += 200;
          this.shakeTimer = 0.2;
          this.shakeTrauma = Math.max(this.shakeTrauma, 0.56);
          this.vibrate([30, 20, 30]);
          this.callbacks.onCrashJuice?.('minor');
          this.playerSpeed = Math.max(8, this.playerSpeed * 0.72);
          this.playerX = this.playerX >= 0 ? 1.28 : -1.28;
          this.spawnDustBurst(this.playerX, 0.2, 0, 7);
          this.spawnDebrisBurst(this.playerX, 0.35, 0, 8, 0.8);
          this.sound.playCrash(false);
          this.triggerCrowdReaction(this.playerX, 0, 'violation', 0);
          this.callbacks.onToast({
            text: 'ডিভাইডারে ঘষা! জাতীয় ক্ষতি +৳২০০',
            tone: 'danger',
          });
        }
      }
    }
    this.streetDressing.syncChunkTransforms(this.roadChunks, this.graphicsQuality);

    // Move gantries
    for (let i = this.gantries.length - 1; i >= 0; i--) {
      const g = this.gantries[i];
      g.z += distStep;
      g.group.position.z = g.z;
      if (g.z > 25) {
        this.scene.remove(g.group);
        this.gantries.splice(i, 1);
      }
    }

    // Passenger Pickup (dotted white ring + 1.5s hold inside) & Drop-off
    if (!this.passengerActive && this.distanceSincePassenger > 85 && this.waitingPassengers.length === 0) {
      this.distanceSincePassenger = 0;
      this.spawnWaitingPassenger();
    }

    let bestBoardProgress = 0;
    let showPickupRing = false;
    for (let i = this.waitingPassengers.length - 1; i >= 0; i--) {
      const wp = this.waitingPassengers[i];
      wp.z += distStep;
      wp.wavePhase += dt * 10;
      wp.rig.group.position.z = wp.z;
      wp.pad.position.z = wp.z;
      wp.rig.applyPose('wave', wp.wavePhase);
      wp.rig.alertBadge.rotation.y += dt * 3;

      if (!this.passengerActive && !wp.pickedUp && wp.z > -36 && wp.z < 10) {
        showPickupRing = true;
      }

      const nearSide = Math.abs(wp.x - this.playerX) < 3.9 && Math.abs(wp.z) < 5.6;
      if (!wp.pickedUp && nearSide && this.playerSpeed < 4.5) {
        wp.boardTimer += dt;
      } else {
        wp.boardTimer = Math.max(0, wp.boardTimer - dt * 1.5);
      }
      bestBoardProgress = Math.max(bestBoardProgress, Math.min(1, wp.boardTimer / 1.5));

      if (!wp.pickedUp && wp.boardTimer >= 1.5) {
        wp.pickedUp = true;
        this.passengerActive = true;
        this.passengerDestination = wp.destination;
        this.passengerDistLeft = 150 + Math.random() * 110;
        this.passengerFare = 130 + Math.round(this.passengerDistLeft * 0.65);
        this.passengerDropoffSpawned = false;
        this.sound.playPickup();
        this.callbacks.onToast({
          text: `যাত্রী উঠেছে (${this.passengerDestination})! ভাড়া ৳${toBn(this.passengerFare)}`,
          tone: 'success',
        });
        this.scene.remove(wp.rig.group);
        this.scene.remove(wp.pad);
        this.waitingPassengers.splice(i, 1);
        continue;
      }

      if (wp.z > 22) {
        this.scene.remove(wp.rig.group);
        this.scene.remove(wp.pad);
        this.waitingPassengers.splice(i, 1);
      }
    }

    if (this.pickupRingGroup) {
      this.pickupRingGroup.visible = !this.passengerActive && showPickupRing;
      if (this.pickupRingGroup.visible) {
        this.pickupRingGroup.rotation.y += dt * 1.25;
        const litCount = Math.round(bestBoardProgress * this.pickupRingProgressSegments.length);
        for (let k = 0; k < this.pickupRingProgressSegments.length; k++) {
          this.pickupRingProgressSegments[k].visible = k < litCount;
        }
      }
    }

    if (this.passengerActive) {
      this.passengerDistLeft -= distStep;
      if (this.passengerDistLeft <= 125 && !this.passengerDropoffSpawned) {
        this.passengerDropoffSpawned = true;
        this.spawnZone('dropoff');
      }
    }

    // Roadside Fruit/Crate Stalls along outer shoulder edge (scatter debris when hit)
    this.stallSpawnDist += distStep;
    if (this.stallSpawnDist >= 52) {
      this.stallSpawnDist = 0;
      const side: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
      this.spawnRoadsideStall(side, -142);
    }

    for (let i = this.stalls.length - 1; i >= 0; i--) {
      const st = this.stalls[i];
      st.z += distStep;
      st.group.position.z = st.z;

      const hitX = Math.abs(st.x - this.playerX) < st.halfWidth + 0.72;
      const hitZ = Math.abs(st.z) < st.halfLength + 1.35;
      if (!st.hit && hitX && hitZ) {
        st.hit = true;
        st.group.visible = false;
        const stallHpLoss = Math.round(6 * chassisDmgMult);
        this.hp -= stallHpLoss;
        this.nationalDamage += 350;
        this.shakeTimer = 0.25;
        this.shakeTrauma = Math.max(this.shakeTrauma, 0.55);
        this.playerSpeed = Math.max(8, this.playerSpeed * 0.75);
        this.spawnDustBurst(st.x, 0.3, st.z, 9);
        this.spawnStallDebrisBurst(st.x, 0.55, st.z, 22);
        this.sound.playCrash(false);
        this.vibrate([35, 20, 35]);
        this.callbacks.onCrashJuice?.('minor');
        this.triggerCrowdReaction(st.x, st.z, 'crash', 1);
        this.callbacks.onToast({
          text: 'ফলের দোকান ভেঙেছে! ক্রেট-ফল ছড়িয়ে গেছে 🥭📦',
          tone: 'danger',
          priority: 'crash',
        });
        if (this.hp <= 0) {
          this.hp = 0;
          this.handleGameOver('pedestrian');
          return;
        }
      }

      if (st.z > 24) {
        this.scene.remove(st.group);
        this.stalls.splice(i, 1);
      }
    }

    // Random Events (road digging, strike procession, flooding, VIP convoy — 20-30s each)
    if (!this.activeEventKind) {
      this.nextEventCooldown -= dt;
      if (this.nextEventCooldown <= 0) {
        this.startRandomEvent();
      }
    } else {
      this.activeEventTimer -= dt;
      if (this.activeEventKind === 'road_digging') {
        this.diggingSpawnAccum += distStep;
        if (this.diggingSpawnAccum >= 44) {
          this.diggingSpawnAccum = 0;
          this.spawnDiggingBarriers();
        }
      } else if (this.activeEventKind === 'strike_procession') {
        this.processionSpawnAccum += distStep;
        if (this.processionSpawnAccum >= 22) {
          this.processionSpawnAccum = 0;
          this.spawnProtestWave();
        }
      } else if (this.activeEventKind === 'vip_convoy') {
        this.vipSirenCooldown -= dt;
        if (this.vipSirenCooldown <= 0) {
          this.vipSirenCooldown = 3.2;
          this.sound.playTrafficHornBurst('heavy', 2);
        }
        const vipCars = this.traffic.filter((v) => v.isVipConvoy);
        if (
          this.vipSpawned &&
          !this.vipYieldAwarded &&
          vipCars.length > 0 &&
          vipCars.every((v) => v.z > 3.5)
        ) {
          this.vipYieldAwarded = true;
          this.runTaka += 80;
          this.score += 120;
          this.sound.playCoinDing(2);
          this.callbacks.onToast({
            text: '🚨 ভিআইপি কনভয়কে সাইড দিয়েছেন! +৳৮০ বোনাস',
            tone: 'success',
            priority: 'gas',
          });
        }
      }

      if (this.activeEventTimer <= 0) {
        this.endRandomEvent(true);
      }
    }

    // Flooding surface mesh fade & wheel splash spray
    if (this.floodWaterMesh) {
      const targetFloodOpacity = this.activeEventKind === 'flooding' ? 0.52 : 0;
      this.floodWaterMat.opacity = THREE.MathUtils.damp(this.floodWaterMat.opacity, targetFloodOpacity, 2.4, dt);
      this.floodWaterMesh.visible = this.floodWaterMat.opacity > 0.02;
      if (this.floodWaterMesh.visible) {
        this.floodWaterMesh.position.z = -65;
        if (this.playerSpeed > 10) {
          this.floodSplashAccum += dt;
          if (this.floodSplashAccum >= 0.08) {
            this.floodSplashAccum = 0;
            this.spawnDustBurst(this.playerX + (Math.random() < 0.5 ? -0.75 : 0.75), 0.14, 0.9, 2);
          }
        }
      }
    }

    // Update Road Digging Barriers & collisions
    for (let i = this.diggingBarriers.length - 1; i >= 0; i--) {
      const b = this.diggingBarriers[i];
      b.z += distStep;
      b.rig.group.position.z = b.z;
      b.rig.lampMat.emissiveIntensity = Math.sin(this.realTime * 10 + i) > 0 ? 3.2 : 0.35;

      const hitX = Math.abs(b.x - this.playerX) < b.rig.halfWidth + 0.65;
      const hitZ = Math.abs(b.z) < b.rig.halfLength + 1.25;
      if (!b.hit && hitX && hitZ && this.invulnTimer <= 0) {
        b.hit = true;
        const hpLoss = Math.round(14 * chassisDmgMult);
        this.hp -= hpLoss;
        this.nationalDamage += 450;
        this.invulnTimer = 0.75;
        this.shakeTimer = 0.34;
        this.shakeTrauma = Math.max(this.shakeTrauma, 0.8);
        this.triggerCrashSlowMo(0.28);
        this.playerSpeed = Math.max(8, this.playerSpeed * 0.52);
        this.spawnDustBurst(b.x, 0.3, b.z, 10);
        this.spawnDebrisBurst(b.x, 0.55, b.z, 12, 1.1);
        this.sound.playCrash(true);
        this.vibrate([45, 25, 50]);
        this.callbacks.onCrashJuice?.('minor');
        this.callbacks.onToast({
          text: `🚧 রাস্তা খোঁড়ায় ধাক্কা! -${toBn(hpLoss)} HP ও ক্ষতি +৳৪৫০`,
          tone: 'danger',
          priority: 'crash',
        });
        if (this.hp <= 0) {
          this.hp = 0;
          this.handleGameOver('pedestrian');
          return;
        }
      }

      if (b.z > 24) {
        this.scene.remove(b.rig.group);
        this.diggingBarriers.splice(i, 1);
      }
    }

    // Spawn Yellow Gas / Pink Bribe Zones
    if (this.distanceSinceGasZone > (this.gas < 38 ? 110 : 190)) {
      this.distanceSinceGasZone = 0;
      this.spawnZone('gas');
    }
    if (this.distanceSinceBribeZone > (this.wanted >= 2 ? 145 : 235)) {
      this.distanceSinceBribeZone = 0;
      this.spawnZone('bribe');
    }

    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.z += distStep;
      z.group.position.z = z.z;

      const onPad = Math.abs(z.z) < 5.6 && Math.abs(z.x - this.playerX) < 3.2;
      if (onPad) {
        if (z.type === 'gas') {
          this.gas = Math.min(100, this.gas + 48 * tankRefillMult * dt);
          if (this.gasZoneSoundCooldown <= 0) {
            this.sound.playGasRefill();
            this.gasZoneSoundCooldown = 0.55;
          }
          if (!z.triggered) {
            z.triggered = true;
            this.callbacks.onToast({ text: 'হলুদ জোন: সিএনজি গ্যাস ভরছে! ⛽', tone: 'warning' });
            this.callbacks.onMissionProgress('gas_refills', 1);
          }
        } else if (z.type === 'bribe' && !z.triggered) {
          z.triggered = true;
          this.sound.playBribe();
          if (this.wanted > 0) {
            this.wanted = Math.max(0, this.wanted - 2);
            const fee = Math.min(Math.round(this.runTaka), 50);
            this.runTaka -= fee;
            this.callbacks.onToast({
              text:
                fee > 0
                  ? `গোলাপি জোন: ৳${toBn(fee)} চা-পানি! ওয়ান্টেড কমেছে ☕`
                  : 'গোলাপি জোন: বাকি খাতায় চা-পানি! ওয়ান্টেড কমেছে ☕',
              tone: 'pink',
            });
          } else {
            this.callbacks.onToast({
              text: 'গোলাপি জোন: পুলিশকে সালাম দিয়ে পার! ☕',
              tone: 'pink',
            });
          }
          this.callbacks.onMissionProgress('bribes', 1);
        } else if (z.type === 'dropoff' && !z.triggered && this.passengerActive && this.playerSpeed < 19) {
          z.triggered = true;
          const destLabel = this.passengerDestination;
          this.passengerActive = false;
          this.passengerDestination = '';
          this.runTaka += this.passengerFare;
          this.score += 320;
          this.vibrate(25);
          this.sound.playFare();
          this.callbacks.onToast({
            text: `${destLabel} পৌঁছেছে! ভাড়া +৳${toBn(this.passengerFare)} পকেটে 💵`,
            tone: 'success',
          });
          this.callbacks.onMissionProgress('passengers', 1);
          this.callbacks.onDriverXpGain?.(180);
        }
      }

      if (z.z > 24) {
        if (z.type === 'dropoff' && !z.triggered && this.passengerActive) {
          // Missed dropoff -> spawn another dropoff ahead shortly
          this.passengerDropoffSpawned = false;
          this.passengerDistLeft = 80;
        }
        this.scene.remove(z.group);
        this.zones.splice(i, 1);
      }
    }

    // Spawn & Update Traffic Lights
    const lightSpacing = Math.max(135, 178 - (this.loopCount - 1) * 10);
    if (this.distanceSinceTrafficLight > lightSpacing) {
      this.distanceSinceTrafficLight = 0;
      this.spawnTrafficLight();
    }

    for (let i = this.trafficLights.length - 1; i >= 0; i--) {
      const tl = this.trafficLights[i];
      tl.z += distStep;
      tl.rig.group.position.z = tl.z;
      const stopZ = tl.z + 8.5;

      // Cycle signal state: Green (8s) -> Yellow (2.6s) -> Red (6.5s) -> Green
      tl.timer -= dt;
      if (tl.timer <= 0) {
        const prevState = tl.state;
        if (tl.state === 'green') {
          tl.state = 'yellow';
          tl.timer = 2.6;
        } else if (tl.state === 'yellow') {
          tl.state = 'red';
          tl.timer = 6.5;
        } else {
          tl.state = 'green';
          tl.timer = 8.0;
        }
        tl.rig.setState(tl.state);

        if (
          prevState === 'red' &&
          tl.state === 'green' &&
          tl.stoppedAtRed &&
          !tl.rewardedGreen &&
          stopZ > -22 &&
          stopZ < 5
        ) {
          tl.rewardedGreen = true;
          this.runTaka += 35;
          this.score += 90;
          this.sound.playGreenLightGo();
          this.callbacks.onMissionProgress('signal_stops', 1);
          this.callbacks.onToast({
            text: 'সবুজ বাতি! নিয়ম মেনে থামায় +৳৩৫ বোনাস 🟢',
            tone: 'success',
          });
        }
      }

      // Track if player properly stopped behind red light
      if (tl.state === 'red' && stopZ >= -14 && stopZ <= 0.5 && this.playerSpeed < 2.2) {
        tl.stoppedAtRed = true;
      }

      // Red light violation detection when crossing stop line (stopZ crosses 0)
      if (tl.prevStopZ <= 0 && stopZ > 0 && !tl.penalized && tl.state === 'red' && this.playerSpeed > 2.8) {
        tl.penalized = true;
        const wrongMult = this.playerX < -0.55 ? 1.5 : 1.0;
        const dmg = Math.round(1500 * wrongMult);
        const fine = Math.min(Math.round(this.runTaka), 120);
        this.nationalDamage += dmg;
        this.runTaka -= fine;
        this.hp -= Math.round(14 * chassisDmgMult);
        this.wanted = Math.min(5, this.wanted + 1);
        this.shakeTimer = 0.28;
        this.shakeTrauma = Math.max(this.shakeTrauma, 0.58);
        this.vibrate([45, 25, 50]);
        this.callbacks.onCrashJuice?.('minor');
        this.sound.playRedLightPenalty();
        this.triggerCrowdReaction(this.playerX, 0, 'violation', 1);
        this.callbacks.onToast({
          text:
            fine > 0
              ? `লাল বাতি অমান্য! জরিমানা -৳${toBn(fine)} ও ক্ষতি +৳${toBn(dmg)} 🚨`
              : `লাল বাতি অমান্য! ওয়ান্টেড +১ ও ক্ষতি +৳${toBn(dmg)} 🚨`,
          tone: 'danger',
        });

        if (this.hp <= 0) {
          this.hp = 0;
          this.handleGameOver('red_light');
          return;
        }
      }

      tl.prevStopZ = stopZ;

      if (tl.z > 28) {
        this.scene.remove(tl.rig.group);
        this.trafficLights.splice(i, 1);
      }
    }

    // Spawn Traffic + Traffic Jams
    this.jamCooldown -= dt;
    if (this.jamCooldown <= 0) {
      this.jamCooldown = Math.max(12, 22 - this.loopCount * 2) + Math.random() * 6;
      this.spawnTrafficJamCluster();
    }

    this.trafficSpawnTimer -= dt;
    if (this.trafficSpawnTimer <= 0) {
      const interval = Math.max(0.32, 0.82 / (area.trafficMultiplier * loopMult));
      this.trafficSpawnTimer = interval * (0.7 + Math.random() * 0.5);
      this.spawnTrafficVehicle();
    }

    // Update Traffic, Red-Light Stopping, Sudden Stops, Overtaking, Lane Drift, Horns, LOD & Collisions
    const playerHalfW = 0.72;
    const playerHalfL = 1.38;
    const nowSec = performance.now() * 0.001;
    const blinkOn = Math.sin(nowSec * 18) > 0;

    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const t = this.traffic[i];

      // Occasional sudden passenger/signal stops on buses, rickshaws & CNGs (at safe forward distance)
      if (t.suddenStopTimer > 0) {
        t.suddenStopTimer -= dt;
      } else {
        t.suddenStopCooldown -= dt;
        if (
          t.suddenStopCooldown <= 0 &&
          t.direction === 1 &&
          t.z < -28 &&
          t.z > -75 &&
          (t.kind === 'bus' || t.kind === 'cng_ai' || t.kind === 'rickshaw') &&
          Math.random() < 0.016
        ) {
          t.suddenStopTimer = 1.6 + Math.random() * 0.9;
          t.suddenStopCooldown = 14 + Math.random() * 8;
        }
      }

      // Determine desired speed based on upcoming red/yellow traffic light & vehicle ahead
      let desiredSpeed = t.suddenStopTimer > 0 ? 0 : t.baseSpeed;
      for (const tl of this.trafficLights) {
        if (tl.state === 'green') continue;
        const stopZ = tl.z + 8.5;
        const gapToStop = t.direction === 1 ? t.z - stopZ : stopZ - t.z;
        const stopThreshold = tl.state === 'red' ? 16 : 9;
        if (gapToStop > t.rig.halfLength + 0.5 && gapToStop < t.rig.halfLength + stopThreshold) {
          desiredSpeed = 0;
          break;
        }
      }

      // Queue behind slower/stopped vehicles in the same lane & detect overtaking opportunity
      let slowerAhead = false;
      for (const other of this.traffic) {
        if (other === t || other.direction !== t.direction) continue;
        if (Math.abs(other.x - t.x) > 1.75) continue;
        const gap =
          t.direction === 1
            ? t.z - other.z - (t.rig.halfLength + other.rig.halfLength)
            : other.z - t.z - (t.rig.halfLength + other.rig.halfLength);
        if (gap > 0 && gap < 5.5) {
          desiredSpeed = Math.min(desiredSpeed, other.speed * (gap < 2.2 ? 0.5 : 0.9));
        }
        if (gap > 0 && gap < 11 && other.speed < t.baseSpeed - 2.5) {
          slowerAhead = true;
        }
      }

      t.speed = THREE.MathUtils.damp(t.speed, desiredSpeed, desiredSpeed === 0 ? 6.5 : 3.2, dt);
      if (desiredSpeed === 0 && t.speed < 0.25) t.speed = 0;

      const relZ =
        t.direction === 1
          ? (this.playerSpeed - t.speed) * dt
          : (this.playerSpeed + t.speed) * dt;
      t.z += relZ;

      // Overtaking slower vehicles ahead or occasional lane changes for agile vehicles
      t.laneTimer -= dt;
      const canAgileChange = t.kind === 'car' || t.kind === 'bike' || t.kind === 'cng_ai';
      if (slowerAhead && t.direction === 1 && t.suddenStopTimer <= 0 && t.speed > 4 && canAgileChange) {
        const adjLane = Math.abs(t.targetX - 2.8) < 0.7 ? 6.0 : 2.8;
        const blocked = this.traffic.some(
          (o) => o !== t && Math.abs(o.x - adjLane) < 2.2 && Math.abs(o.z - t.z) < 12
        );
        if (!blocked) {
          t.targetX = adjLane;
          t.laneTimer = 2.8;
          if (!t.honked && Math.abs(t.z) < 42 && this.trafficHornCooldown <= 0) {
            t.honked = true;
            this.trafficHornCooldown = 1.3;
            this.sound.playTrafficHornBurst('light', 2);
          }
        }
      } else if (t.speed > 4 && t.laneTimer <= 0 && canAgileChange) {
        t.laneTimer = 2.5 + Math.random() * 3.5;
        const sameSideLanes = t.x < 0 ? [-6.0, -2.8] : [2.8, 6.0];
        const nextLane = sameSideLanes[Math.floor(Math.random() * sameSideLanes.length)];
        const blocked = this.traffic.some(
          (o) => o !== t && Math.abs(o.x - nextLane) < 2.2 && Math.abs(o.z - t.z) < 10
        );
        if (!blocked) {
          t.targetX = nextLane;
          if (!t.honked && Math.abs(t.z) < 42 && this.trafficHornCooldown <= 0) {
            t.honked = true;
            this.trafficHornCooldown = 1.4;
            this.sound.playTrafficHornBurst('light', 2);
          }
        }
      }

      // Gentle lane drift within same carriageway (clear of center divider)
      if (t.speed > 2.5) {
        t.driftPhase += dt * t.driftSpeed;
      }
      const driftOffset = Math.sin(t.driftPhase) * t.driftAmp;
      const minX = t.direction === 1 ? 1.45 : -7.1;
      const maxX = t.direction === 1 ? 7.1 : -1.45;
      const effectiveTargetX = THREE.MathUtils.clamp(t.targetX + driftOffset, minX, maxX);

      const prevX = t.x;
      t.x = THREE.MathUtils.damp(t.x, effectiveTargetX, 5.0, dt);
      t.rig.group.position.set(t.x, 0, t.z);

      // Turn signal state (hazard blink on sudden stop, directional blink during lane change/overtake)
      if (t.suddenStopTimer > 0) {
        t.turnSignalDir = 2;
      } else if (Math.abs(t.targetX - t.x) > 0.24) {
        t.turnSignalDir = ((t.targetX > t.x ? 1 : -1) * t.direction) as -1 | 1;
      } else {
        t.turnSignalDir = 0;
      }

      // Honking bursts at player (wrong-way oncoming, fast car blocked from behind, or ambient horn)
      const hornKind: 'heavy' | 'light' = t.kind === 'bus' || t.kind === 'truck' ? 'heavy' : 'light';
      if (
        !t.honked &&
        t.direction === -1 &&
        t.z > -45 &&
        t.z < -6 &&
        Math.abs(t.x - this.playerX) < 2.6 &&
        this.trafficHornCooldown <= 0
      ) {
        t.honked = true;
        this.trafficHornCooldown = 1.1;
        this.sound.playTrafficHornBurst(hornKind, 2);
      } else if (
        !t.honked &&
        t.direction === 1 &&
        t.z > 2.2 &&
        t.z < 18 &&
        Math.abs(t.x - this.playerX) < 1.85 &&
        t.speed > this.playerSpeed + 2.5 &&
        this.trafficHornCooldown <= 0
      ) {
        t.honked = true;
        this.trafficHornCooldown = 1.25;
        this.sound.playTrafficHornBurst(hornKind, 2);
      } else if (!t.honked && t.z > -32 && t.z < -6 && Math.random() < 0.008 && this.trafficHornCooldown <= 0) {
        t.honked = true;
        this.trafficHornCooldown = 1.6;
        this.sound.playTrafficHornBurst(hornKind, 2);
      }

      // 40m LOD: detailed mirrors, racks, grilles, wheel spokes, hanging passengers visible <= 40m
      const inLod = Math.abs(t.z) <= 40;
      t.rig.detailGroup.visible = inLod;
      for (let wi = 0; wi < t.rig.wheelDetails.length; wi++) {
        t.rig.wheelDetails[wi].visible = inLod;
      }

      // Brake lights, turn signals & emergency beacons
      const isSlowing = desiredSpeed < t.speed - 0.8 || t.speed < 1.8 || t.suddenStopTimer > 0;
      t.rig.setBraking(isSlowing);
      t.rig.setTurnSignal(t.turnSignalDir, blinkOn);
      if ((inLod || t.isVipConvoy) && t.rig.isEmergency && t.rig.setEmergencyPhase) {
        t.rig.setEmergencyPhase(nowSec * 12);
      }

      // Suspension bounce, braking pitch & lateral cornering roll on bodyGroup (wheels stay grounded)
      t.bouncePhase += dt * (4.0 + t.speed * 0.45);
      const roadVib = Math.min(0.045, 0.008 + t.speed * 0.0012);
      const bounceY = Math.sin(t.bouncePhase) * roadVib;
      const accelRate = THREE.MathUtils.clamp((t.speed - t.prevSpeed) / Math.max(dt, 0.008), -25, 25);
      t.prevSpeed = t.speed;
      t.rig.bodyGroup.position.y = bounceY;
      t.rig.bodyGroup.rotation.x = THREE.MathUtils.damp(
        t.rig.bodyGroup.rotation.x,
        THREE.MathUtils.clamp(accelRate * 0.0045, -0.055, 0.055),
        10,
        dt
      );
      const steerLean = -(t.x - prevX) * 2.2 * t.direction;
      t.rig.bodyGroup.rotation.z = THREE.MathUtils.damp(t.rig.bodyGroup.rotation.z, steerLean, 10, dt);

      const wheelSpin = (t.speed * dt) / t.rig.wheelRadius;
      for (const w of t.rig.wheels) {
        w.rotation.x -= wheelSpin;
      }

      // Near miss
      if (
        !t.nearMissed &&
        t.z > 0.8 &&
        t.z < 3.5 &&
        this.playerSpeed > 21 &&
        Math.abs(t.x - this.playerX) < t.rig.halfWidth + playerHalfW + 0.95
      ) {
        t.nearMissed = true;
        this.runTaka += 25;
        this.score += 45;
        this.callbacks.onMissionProgress('near_misses', 1);
      }

      // AABB collision
      const hitX = Math.abs(t.x - this.playerX) < t.rig.halfWidth + playerHalfW - 0.12;
      const hitZ = Math.abs(t.z) < t.rig.halfLength + playerHalfL - 0.18;

      if (hitX && hitZ) {
        if ((t.kind === 'bus' || t.kind === 'truck') && !t.isVipConvoy) {
          this.handleGameOver(t.kind);
          return;
        }
        if (this.invulnTimer <= 0) {
          if (t.isVipConvoy) {
            this.vipYieldAwarded = true;
          }
          const baseMoney =
            t.isVipConvoy
              ? 4800
              : t.kind === 'car'
              ? 3500
              : t.kind === 'cng_ai'
              ? 2200
              : t.kind === 'bike'
              ? 1800
              : t.kind === 'thelagari'
              ? 1200
              : 1500;
          const rawHpLoss = t.isVipConvoy ? 24 : 12;
          const hpLoss = Math.round(rawHpLoss * chassisDmgMult);
          const dmgMoney = Math.round(baseMoney * (this.playerX < -0.55 ? 1.5 : 1.0));
          this.nationalDamage += dmgMoney;
          this.hp -= hpLoss;
          this.wanted = Math.min(5, this.wanted + (t.isVipConvoy ? 2 : 1));
          this.invulnTimer = 0.75;
          this.shakeTimer = 0.38;
          this.shakeTrauma = Math.max(this.shakeTrauma, 0.88);
          this.triggerCrashSlowMo(0.32);
          this.playerSpeed = Math.max(8, this.playerSpeed * 0.55);
          this.playerX = THREE.MathUtils.clamp(
            this.playerX + (this.playerX >= t.x ? 1.4 : -1.4),
            -7.4,
            7.4
          );
          this.spawnDustBurst(this.playerX, 0.3, -0.3, 11);
          this.spawnDebrisBurst(this.playerX, 0.55, -0.3, 14, 1.15);
          this.sound.playCrash(true);
          this.vibrate([45, 25, 50]);
          this.callbacks.onCrashJuice?.('minor');
          this.triggerCrowdReaction(t.x, t.z, 'crash', 1);
          this.callbacks.onToast({
            text: t.isVipConvoy
              ? `🚨 ভিআইপি কনভয়ে ধাক্কা! -${toBn(hpLoss)} HP ও ক্ষতি +৳${toBn(dmgMoney)}!`
              : `ধাক্কা! জাতীয় ক্ষতি +৳${toBn(dmgMoney)}!`,
            tone: 'danger',
          });
          if (this.hp <= 0) {
            this.hp = 0;
            this.handleGameOver('pedestrian');
            return;
          }
        }
      }

      if (t.z > 28 || t.z < -200) {
        this.scene.remove(t.rig.group);
        this.traffic.splice(i, 1);
      }
    }

    // Spawn Pedestrians (maintain busy Chattogram street crowd)
    this.pedSpawnTimer -= dt;
    if (this.pedSpawnTimer <= 0) {
      this.pedSpawnTimer = Math.max(0.45, (1.2 - this.wanted * 0.12) / loopMult);
      this.spawnPedestrian();
    }

    // Enforce strict max 25 detailed visible pedestrians (rest simple LOD)
    this.lodScratch.length = 0;
    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];
      if (p.z < 14 && p.z > -135) {
        const dx = p.x - this.playerX;
        this.lodScratch.push({ rig: p.rig, distSq: dx * dx + p.z * p.z });
      } else {
        p.rig.setDetailed(false);
      }
    }
    for (let i = 0; i < this.waitingPassengers.length; i++) {
      const wp = this.waitingPassengers[i];
      if (wp.z < 14 && wp.z > -135) {
        const dx = wp.x - this.playerX;
        this.lodScratch.push({ rig: wp.rig, distSq: dx * dx + wp.z * wp.z });
      } else {
        wp.rig.setDetailed(false);
      }
    }
    this.lodScratch.sort((a, b) => a.distSq - b.distSq);
    for (let i = 0; i < this.lodScratch.length; i++) {
      this.lodScratch[i].rig.setDetailed(i < MAX_DETAILED_PEDESTRIANS);
    }

    // Update Pedestrians, Animations, Jump-Back, Fall+Dust & Chasing
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      if (p.hitCooldown > 0) p.hitCooldown -= dt;
      if (p.reactTimer > 0) p.reactTimer -= dt;
      if (p.speechTimer > 0) {
        p.speechTimer -= dt;
        if (p.speechTimer <= 0) {
          p.rig.hideSpeech();
        }
      }

      if (p.propGroup) {
        // Move shared bench prop only once when anchored by first sitter
        p.propGroup.position.z += distStep;
      }

      // Close-pass reaction: pedestrians raise arms, jump away, and shout Bangla lines when CNG passes close
      if (
        !p.isChasing &&
        !p.isProtestor &&
        p.basePose !== 'sit_tea_stall' &&
        p.fallTimer <= 0 &&
        p.jumpBackTimer <= 0 &&
        !p.closePassReacted &&
        Math.abs(p.z) < 6.8 &&
        Math.abs(p.x - this.playerX) < 3.4 &&
        this.playerSpeed > 7
      ) {
        p.closePassReacted = true;
        p.jumpBackTimer = 0.58;
        p.walkDir = p.x >= this.playerX ? 1 : -1;
        p.reactYaw = Math.atan2(this.playerX - p.x, 0 - p.z);
        p.reactTimer = 1.4;
        if (p.speechTimer <= 0.05) {
          p.rig.showSpeech('horn');
          p.speechTimer = 1.65;
        }
      }

      let activePose: PedestrianPose = p.basePose;
      let poseAux = 0;

      if (p.fallTimer > 0) {
        p.fallTimer -= dt;
        p.z += distStep;
        activePose = 'fall';
        poseAux = 1 - Math.max(0, p.fallTimer) / 0.9;
      } else if (p.jumpBackTimer > 0) {
        p.jumpBackTimer -= dt;
        p.z += distStep;
        p.x = THREE.MathUtils.clamp(p.x + p.walkDir * 5.2 * dt, -10.2, 10.2);
        p.rig.group.rotation.y = p.reactYaw;
        activePose = 'jump_back';
        poseAux = 1 - Math.max(0, p.jumpBackTimer) / 0.6;
      } else if (p.isChasing) {
        const dx = this.playerX - p.x;
        const dz = 0 - p.z;
        const dist = Math.hypot(dx, dz) || 1;
        const chaseSpeed = 15.5 + this.wanted * 1.4 + (this.loopCount - 1) * 1.5;
        p.x += (dx / dist) * Math.min(9.5, chaseSpeed * 0.55) * dt;
        p.z += (this.playerSpeed - chaseSpeed * 0.9) * dt + (dz / dist) * 4.5 * dt;
        p.rig.group.rotation.y = Math.atan2(dx, dz);
        p.animPhase += dt * 15;
        activePose = 'run';
      } else if (p.isProtestor) {
        p.z += (this.playerSpeed - p.walkSpeed) * dt;
        p.rig.group.rotation.y = Math.PI;
        p.animPhase += dt * 9.0;
        activePose = 'wave';
      } else if (p.basePose === 'sit_tea_stall' || p.basePose === 'argue' || p.basePose === 'wave') {
        p.z += distStep;
        p.animPhase += dt * (p.basePose === 'argue' ? 7.5 : p.basePose === 'wave' ? 6.5 : 3.2);
        if (p.reactTimer > 0 && p.basePose !== 'sit_tea_stall') {
          p.rig.group.rotation.y = p.reactYaw;
          activePose = 'argue';
        }
      } else if (p.walkDir !== 0) {
        p.z += distStep;
        p.x += p.walkDir * p.walkSpeed * dt;
        if (p.x > 9.4 || p.x < -9.4) p.walkDir *= -1;
        p.rig.group.rotation.y = p.walkDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        p.animPhase += dt * (p.basePose === 'cross_unaware' ? 8.5 : 7.0);
        activePose = p.basePose;
      } else {
        // Sidewalk stroller
        p.z += (this.playerSpeed - p.walkSpeed) * dt;
        p.rig.group.rotation.y = p.reactTimer > 0 ? p.reactYaw : Math.PI;
        p.animPhase += dt * 6.0;
        activePose = p.basePose;
      }

      const groundY = Math.abs(p.x) >= 8.65 ? 0.20 : 0;
      p.baseY = THREE.MathUtils.damp(p.baseY, groundY, 16, dt);
      p.rig.group.position.set(p.x, p.baseY, p.z);
      p.rig.applyPose(activePose, p.animPhase, poseAux);

      if (p.isChasing) {
        p.rig.alertBadge.rotation.y += dt * 4;
      }

      const hitPed =
        p.canCollide &&
        Math.abs(p.x - this.playerX) < 1.15 &&
        Math.abs(p.z) < 1.65;
      if (hitPed && p.hitCooldown <= 0) {
        if (!p.isChasing) {
          p.x = THREE.MathUtils.clamp(p.x + (p.x >= this.playerX ? 1.1 : -1.1), -9.6, 9.6);
          p.z += 0.35;
          p.fallTimer = 0.9;
          p.isChasing = true;
          p.rig.alertBadge.visible = true;
          p.hitCooldown = 1.35;
          p.rig.showSpeech('crash');
          p.speechTimer = 2.8;
          this.spawnDustBurst(p.x, 0.22, p.z, 9);

          this.nationalDamage += 800;
          this.wanted = Math.min(5, this.wanted + 1);
          this.shakeTimer = 0.24;
          this.shakeTrauma = Math.max(this.shakeTrauma, 0.52);
          this.vibrate([35, 20, 40]);
          this.callbacks.onCrashJuice?.('minor');
          this.sound.playCrash(false);

          this.triggerCrowdReaction(p.x, p.z, 'crash', 2);

          this.callbacks.onToast({
            text: 'পথচারীকে ধাক্কা! জাতীয় ক্ষতি +৳৮০০ — তারা তাড়া করছে!',
            tone: 'danger',
          });
        } else {
          p.hitCooldown = 1.15;
          p.z += 2.6;
          const pedHpLoss = Math.round(22 * chassisDmgMult);
          this.hp -= pedHpLoss;
          this.shakeTimer = 0.32;
          this.shakeTrauma = Math.max(this.shakeTrauma, 0.74);
          this.triggerCrashSlowMo(0.24);
          this.spawnDustBurst(this.playerX, 0.25, 0, 9);
          this.vibrate([50, 25, 55]);
          this.callbacks.onCrashJuice?.('minor');
          this.sound.playCrash(false);
          this.callbacks.onToast({
            text: `ক্ষুব্ধ পথচারী ধরে ফেলেছে! -${toBn(pedHpLoss)} HP!`,
            tone: 'danger',
          });
          if (this.hp <= 0) {
            this.hp = 0;
            this.handleGameOver('pedestrian');
            return;
          }
        }
      }

      if (p.z > 20 || p.z < -175) {
        this.scene.remove(p.rig.group);
        if (p.propGroup) this.scene.remove(p.propGroup);
        this.pedestrians.splice(i, 1);
      }
    }

    this.updateDustPuffs(dt, distStep);
    this.updateDebrisParticles(dt, distStep);

    // Camera update: lower & closer behind CNG (~3.5m back, ~1.8m up), slight lag, speed FOV, turn roll & bump bounce
    this.hornZoomPulse = THREE.MathUtils.damp(this.hornZoomPulse, 0, 11, realDt);
    this.boostFovKick = THREE.MathUtils.damp(this.boostFovKick, 0, 5.2, realDt);
    const speedNorm = Math.min(1, this.playerSpeed / 48);
    const targetFov =
      62 +
      speedNorm * 14 +
      (boosting ? 5.5 : 0) +
      this.boostFovKick * 6.5 -
      this.hornZoomPulse * 3.5;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 9, realDt);
    this.camera.updateProjectionMatrix();

    const traumaSq = this.shakeTrauma * this.shakeTrauma;
    const boostVibX = boosting ? Math.sin(this.realTime * 57) * 0.014 : 0;
    const boostVibY = boosting ? Math.cos(this.realTime * 69) * 0.012 : 0;
    const roadBumpY =
      Math.sin(this.animTime * 22) * (0.012 + speedNorm * 0.018) +
      Math.cos(this.animTime * 11) * speedNorm * 0.009;
    const shakeX =
      traumaSq * (Math.sin(this.realTime * 43) * 0.24 + Math.sin(this.realTime * 79) * 0.14) +
      boostVibX;
    const shakeY =
      traumaSq * (Math.cos(this.realTime * 49) * 0.18 + Math.sin(this.realTime * 87) * 0.1) +
      boostVibY;
    const rollShake = traumaSq * Math.sin(this.realTime * 37) * 0.045;

    if (this.cameraMode === 'driver') {
      if (!this.isDraggingLook) {
        this.lookYaw = THREE.MathUtils.damp(this.lookYaw, 0, 7, realDt);
        this.lookPitch = THREE.MathUtils.damp(this.lookPitch, 0, 7, realDt);
      }

      const eyeX = this.playerX + shakeX * 0.45;
      const eyeY = 1.48 + roadBumpY * 0.65 + shakeY * 0.35;
      const eyeZ = -0.14;
      this.camera.position.set(eyeX, eyeY, eyeZ);

      if (this.input.lookBack) {
        _camLookAt.set(this.playerX, 1.46, 12.0);
      } else {
        _camLookAt.set(
          eyeX - Math.sin(this.lookYaw) * 14,
          eyeY - 0.85 + Math.sin(this.lookPitch) * 10,
          eyeZ - Math.cos(this.lookYaw) * 14
        );
      }
      this.camera.lookAt(_camLookAt);
      this.camera.rotateZ(-this.playerRoll * 0.38 + rollShake * 0.65);
    } else if (this.input.lookBack) {
      _camTargetPos.set(this.playerX * 0.8 + shakeX, 3.2 + shakeY, -5.8);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-14 * realDt));
      _camLookAt.set(this.playerX * 0.9, 1.35, 12.0);
      this.camera.lookAt(_camLookAt);
      this.camera.rotateZ(rollShake);
    } else {
      const targetCamX = this.playerX * 0.78 + shakeX;
      const targetCamY = 1.80 + roadBumpY + shakeY;
      const targetCamZ = 3.50 - (boosting ? 0.32 : 0) - this.boostFovKick * 0.18;
      this.camera.position.x = THREE.MathUtils.lerp(
        this.camera.position.x,
        targetCamX,
        1 - Math.exp(-8.5 * realDt)
      );
      this.camera.position.y = THREE.MathUtils.lerp(
        this.camera.position.y,
        targetCamY,
        1 - Math.exp(-11.5 * realDt)
      );
      this.camera.position.z = THREE.MathUtils.lerp(
        this.camera.position.z,
        targetCamZ,
        1 - Math.exp(-11.5 * realDt)
      );
      _camLookAt.set(this.playerX * 0.92, 1.12, -8.5);
      this.camera.lookAt(_camLookAt);
      this.camera.rotateZ(rollShake - this.playerRoll * 0.24);
    }

    this.hudEmitTimer += realDt;
    if (this.hudEmitTimer >= 0.065) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }
  }

  private stepShowcase(dt: number): void {
    this.orbitAngle += dt * 0.45;
    if (this.phase === 'garage') {
      const radius = 4.2;
      _camTargetPos.set(
        Math.sin(this.orbitAngle) * radius,
        2.05,
        Math.cos(this.orbitAngle) * radius
      );
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-5 * dt));
      _camLookAt.set(0, 1.05, 0);
      this.camera.lookAt(_camLookAt);
    } else if (this.phase === 'menu') {
      // Frame the CNG parked near the brick sidewalk & striped curb (like Screenshot 4)
      _camTargetPos.set(0.3 + Math.sin(this.orbitAngle * 0.45) * 0.55, 2.35, 3.8);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-4 * dt));
      _camLookAt.set(4.5, 1.4, -3.5);
      this.camera.lookAt(_camLookAt);
    }

    this.updateAtmosphereAndLighting(dt);

    const t = performance.now();
    this.cngRig.group.visible = true;
    this.cngRig.boostFlameLeft.visible = false;
    this.cngRig.boostFlameRight.visible = false;
    this.cngRig.bodyGroup.position.y = Math.sin(t * 0.022) * 0.02 + Math.sin(t * 0.006) * 0.014;
    this.cngRig.bodyGroup.rotation.z = Math.sin(t * 0.004) * 0.022;
    this.cngRig.ornamentPivot.rotation.z = Math.sin(t * 0.0045) * 0.14;
    this.cngRig.ornamentPivot.rotation.x = Math.cos(t * 0.0038) * 0.06;
    this.updateExhaustPuffs(dt, false);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private renderDriverMirrors(): void {
    if (!this.leftMirrorRT || !this.rightMirrorRT) return;
    const active =
      this.cameraMode === 'driver' &&
      (this.phase === 'playing' || this.phase === 'paused') &&
      !this.input.lookBack;
    if (!active) return;

    this.mirrorFrameCounter++;
    const lowCost = this.isSoftwareGl || this.graphicsQuality === 'low';
    const renderLeft = !lowCost || this.mirrorFrameCounter % 2 === 0;
    const renderRight = !lowCost || this.mirrorFrameCounter % 2 === 1;

    const prevShadowAuto = this.renderer.shadowMap.autoUpdate;
    this.renderer.shadowMap.autoUpdate = false;
    this.cockpitRig.group.visible = false;

    if (renderLeft) {
      this.leftMirrorCam.position.set(this.playerX - 0.62, 1.44, -0.35);
      _camLookAt.set(this.playerX - 2.35, 1.15, 32);
      this.leftMirrorCam.lookAt(_camLookAt);
      this.renderer.setRenderTarget(this.leftMirrorRT);
      this.renderer.clear();
      this.renderer.render(this.scene, this.leftMirrorCam);
    }

    if (renderRight) {
      this.rightMirrorCam.position.set(this.playerX + 0.62, 1.44, -0.35);
      _camLookAt.set(this.playerX + 2.35, 1.15, 32);
      this.rightMirrorCam.lookAt(_camLookAt);
      this.renderer.setRenderTarget(this.rightMirrorRT);
      this.renderer.clear();
      this.renderer.render(this.scene, this.rightMirrorCam);
    }

    this.renderer.setRenderTarget(null);
    this.cockpitRig.group.visible = true;
    this.renderer.shadowMap.autoUpdate = prevShadowAuto;
  }

  private stepGameOverImpact(realDt: number): void {
    this.gameoverImpactTimer = Math.max(0, this.gameoverImpactTimer - realDt);
    this.shakeTrauma = Math.max(0, this.shakeTrauma - realDt * 1.9);

    if (this.crashCinematicActive) {
      this.crashCinematicTimer += realDt;
      const inSlowMo = this.crashCinematicTimer < 0.6;
      const simDt = inSlowMo ? realDt * 0.22 : realDt * 0.92;
      const drift = inSlowMo ? this.playerSpeed * 0.18 * simDt : 0;

      this.updateDustPuffs(simDt, drift);
      this.updateDebrisParticles(simDt, drift);
      this.cngRig.bodyGroup.rotation.z = THREE.MathUtils.damp(
        this.cngRig.bodyGroup.rotation.z,
        0.28,
        5,
        realDt
      );

      // Crowd converges around the crashed CNG and shouts/waves
      for (const p of this.pedestrians) {
        if (Math.abs(p.z) > 22) continue;
        if (p.fallTimer > 0) {
          p.fallTimer -= simDt;
          p.rig.applyPose('fall', p.animPhase, 1 - Math.max(0, p.fallTimer) / 0.9);
          continue;
        }
        const dx = this.playerX - p.x;
        const dz = 0 - p.z;
        const dist = Math.hypot(dx, dz) || 1;
        if (dist > 2.2) {
          p.x += (dx / dist) * 4.2 * simDt;
          p.z += (dz / dist) * 4.2 * simDt;
        }
        p.rig.group.position.set(p.x, Math.abs(p.x) >= 8.65 ? 0.20 : 0, p.z);
        p.rig.group.rotation.y = Math.atan2(dx, dz);
        p.animPhase += simDt * 11;
        p.rig.applyPose(dist > 2.6 ? 'run' : 'argue', p.animPhase);
      }

      if (inSlowMo) {
        // 0.6s dramatic slow-mo close impact angle
        const traumaSq = this.shakeTrauma * this.shakeTrauma;
        const shakeX = traumaSq * (Math.sin(this.realTime * 41) * 0.32);
        const shakeY = traumaSq * (Math.cos(this.realTime * 53) * 0.24);
        _camTargetPos.set(this.playerX * 0.8 + shakeX, 2.25 + shakeY, 4.1);
        this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-10 * realDt));
        _camLookAt.set(this.playerX, 0.9, -1.5);
        this.camera.lookAt(_camLookAt);
        this.camera.rotateZ(traumaSq * Math.sin(this.realTime * 35) * 0.06);
      } else {
        // 2.0s top-down orbit around the scene showing the converging crowd
        const orbitT = this.crashCinematicTimer - 0.6;
        const angle = orbitT * 1.5;
        const radius = 7.4;
        _camTargetPos.set(
          this.playerX + Math.sin(angle) * radius,
          11.2,
          Math.cos(angle) * radius
        );
        this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-5.5 * realDt));
        _camLookAt.set(this.playerX, 0.6, 0);
        this.camera.lookAt(_camLookAt);
      }

      if (this.crashCinematicTimer >= 2.6 && this.pendingGameOverSummary) {
        const finalSummary = this.pendingGameOverSummary;
        this.pendingGameOverSummary = null;
        this.crashCinematicActive = false;
        this.callbacks.onGameOver(finalSummary);
      }
      return;
    }

    const slowDt = realDt * 0.28;
    const drift = this.playerSpeed * 0.18 * slowDt;
    this.updateDustPuffs(slowDt, drift);
    this.updateDebrisParticles(slowDt, drift);
    this.cngRig.bodyGroup.rotation.z = THREE.MathUtils.damp(this.cngRig.bodyGroup.rotation.z, 0.22, 5, realDt);

    const traumaSq = this.shakeTrauma * this.shakeTrauma;
    const shakeX = traumaSq * (Math.sin(this.realTime * 41) * 0.32);
    const shakeY = traumaSq * (Math.cos(this.realTime * 53) * 0.24);
    _camTargetPos.set(this.playerX * 0.75 + shakeX, 3.2 + shakeY, 5.2);
    this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-9 * realDt));
    _camLookAt.set(this.playerX * 0.85, 1.1, -3.5);
    this.camera.lookAt(_camLookAt);
    this.camera.rotateZ(traumaSq * Math.sin(this.realTime * 35) * 0.06);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const realDt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.realTime += realDt;

    if (this.phase === 'playing') {
      let timeScale = 1;
      if (this.slowMoTimer > 0) {
        this.slowMoTimer = Math.max(0, this.slowMoTimer - realDt);
        const progress = 1 - this.slowMoTimer / Math.max(0.01, this.slowMoDuration);
        timeScale = 0.26 + 0.74 * (progress * progress);
      }
      const simDt = realDt * timeScale;
      this.animTime += simDt;
      this.stepGameplay(simDt, realDt);
    } else if (
      this.phase === 'gameover' &&
      (this.crashCinematicActive || this.gameoverImpactTimer > 0 || this.shakeTrauma > 0.01)
    ) {
      this.stepGameOverImpact(realDt);
    } else if (this.phase === 'menu' || this.phase === 'garage') {
      this.animTime += realDt;
      this.stepShowcase(realDt);
    }

    this.renderDriverMirrors();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);

    this.sound.dispose();
    this.streetDressing?.dispose();
    this.leftMirrorRT?.dispose();
    this.rightMirrorRT?.dispose();
    disposeVehicleAssetPool();
    disposePedestrianAssetPool();

    this.roadBumpPlain?.dispose();
    this.roadBumpZebra?.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!m) continue;
          const std = m as THREE.MeshStandardMaterial;
          std.map?.dispose();
          std.roughnessMap?.dispose();
          std.bumpMap?.dispose();
          m.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
