import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AREAS,
  CNG_COLORS,
  CNG_STICKERS,
  SATIRE_HEADLINES,
} from '../config/chattogramData';
import type {
  AtmosphereMode,
  CameraMode,
  DeathReason,
  GameEventToast,
  GameOverSummary,
  GamePhase,
  GraphicsQuality,
  HudSnapshot,
  InputState,
  MissionMetric,
  RadarEntity,
  TrafficLightState,
  VehicleKind,
  WeatherCondition,
} from '../types/game';
import { SoundEngine } from '../audio/soundEngine';
import {
  createAreaGantry,
  createBillboardModel,
  createBuildingModel,
  createCngModel,
  createCockpitModel,
  createFlyoverPillar,
  createOverheadRoadSign,
  createPedestrianModel,
  createRoadDivider,
  createRoadsideStall,
  createStreetLight,
  createTrafficLightModel,
  createTreeModel,
  createUtilityPoleCluster,
  createVehicleModel,
  createZonePad,
  type CngRig,
  type CockpitRig,
  type PedestrianRig,
  type TrafficLightRig,
  type TrafficModelRig,
} from './models';
import {
  createLightGlowTexture,
  createMedianCurbTexture,
  createRoadTextureSet,
  createSidewalkTexture,
} from './textures';
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

const LANES = [-6.0, -2.8, 2.8, 6.0];
const RAIN_COUNT = 340;

interface RoadChunk {
  group: THREE.Group;
  sceneryGroup: THREE.Group;
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
  direction: 1 | -1; // 1 = forward (-Z), -1 = oncoming (+Z)
  nearMissed: boolean;
  laneTimer: number;
  honked: boolean;
}

interface PedestrianEntity {
  rig: PedestrianRig;
  x: number;
  z: number;
  walkDir: number;
  walkSpeed: number;
  isChasing: boolean;
  hitCooldown: number;
  animPhase: number;
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
  x: number;
  z: number;
  wavePhase: number;
  pickedUp: boolean;
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
  onGameOver: (summary: GameOverSummary) => void;
  onCrashJuice?: (intensity: 'minor' | 'major') => void;
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
  private isSoftwareGl = false;
  private maxAnisotropy = 1;

  private cngRig!: CngRig;
  private cockpitRig!: CockpitRig;
  private roadChunks: RoadChunk[] = [];
  private traffic: TrafficEntity[] = [];
  private pedestrians: PedestrianEntity[] = [];
  private zones: ZoneEntity[] = [];
  private waitingPassengers: WaitingPassengerEntity[] = [];
  private gantries: GantryEntity[] = [];
  private trafficLights: TrafficLightEntity[] = [];

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
  private playerRoll = 0;
  private steerDir: -1 | 0 | 1 = 0;
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
  private passengerFare = 0;
  private passengerDistLeft = 0;
  private passengerDropoffSpawned = false;
  private distanceSincePassenger = 0;

  // Timers & cooldowns
  private invulnTimer = 0;
  private dividerCooldown = 0;
  private shakeTimer = 0;
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
  private billboardCounter = 0;
  private startAreaIndex = 0;

  private frameId = 0;
  private lastTime = 0;
  private disposed = false;
  private highScoreRef = 0;

  private equippedColorHex = CNG_COLORS[0].hex;
  private equippedSticker = CNG_STICKERS[0];

  constructor(
    container: HTMLElement,
    callbacks: EngineCallbacks,
    initialColorId: string,
    initialStickerId: string,
    initialHighScore: number
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.sound = new SoundEngine();
    this.highScoreRef = initialHighScore;

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

      // Center median divider with intersection gap at zebra crossings so player can weave two-way!
      const hasDivider = !hasZebra;
      if (hasDivider) {
        const divider = createRoadDivider(36, this.maxAnisotropy);
        divider.position.set(0, 0, -2);
        chunkGroup.add(divider);
      } else {
        // Shorter divider segment leaving wide zebra intersection gap
        const divider = createRoadDivider(20, this.maxAnisotropy);
        divider.position.set(0, 0, 10);
        chunkGroup.add(divider);
      }

      // Utility poles (খাম্বা) & tangled overhead black electric cables
      const polesAndWires = createUtilityPoleCluster(i % 2 === 0);
      chunkGroup.add(polesAndWires);

      // Street lights on both sidewalks with shared bloom-like glow & ground pool
      const lightL = createStreetLight(-1, this.streetBulbMat, this.streetGlowMat, this.streetPoolMat);
      lightL.position.set(-9.4, 0, -14);
      const lightR = createStreetLight(1, this.streetBulbMat, this.streetGlowMat, this.streetPoolMat);
      lightR.position.set(9.4, 0, 14);
      chunkGroup.add(lightL, lightR);

      // Dynamic area-themed buildings, stalls & overhead road signs container
      const sceneryGroup = new THREE.Group();
      chunkGroup.add(sceneryGroup);

      const flyoverPillar = createFlyoverPillar();
      flyoverPillar.visible = Boolean(startArea.hasFlyover) && i % 2 === 0;
      chunkGroup.add(flyoverPillar);

      const chunk: RoadChunk = {
        group: chunkGroup,
        sceneryGroup,
        flyoverPillar,
        hasDivider,
        builtAreaIndex: -1,
        z: 30 - i * CHUNK_LEN,
      };
      this.rebuildChunkScenery(chunk, i, CHUNK_LEN);

      chunkGroup.position.z = chunk.z;
      this.scene.add(chunkGroup);
      this.roadChunks.push(chunk);
    }

    this.cngRig = createCngModel(
      this.equippedColorHex,
      this.equippedSticker,
      this.maxAnisotropy
    );
    this.cockpitRig = createCockpitModel(this.equippedColorHex);
    this.cngRig.group.add(this.cockpitRig.group);
    this.cngRig.group.position.set(2.8, 0, 0);
    this.scene.add(this.cngRig.group);
    this.syncCameraVisibility();

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

  private rebuildChunkScenery(chunk: RoadChunk, seedIdx: number, chunkLen: number): void {
    this.disposeGroupChildren(chunk.sceneryGroup);
    const area = AREAS[this.areaIndex];
    chunk.builtAreaIndex = this.areaIndex;
    chunk.flyoverPillar.visible = Boolean(area.hasFlyover) && seedIdx % 2 === 0;

    const signColors = ['#065f46', '#991b1b', '#1e40af', '#92400e', '#6b21a8'];

    [-1, 1].forEach((side) => {
      for (let slot = 0; slot < 2; slot++) {
        const zOff = (slot - 0.5) * (chunkLen * 0.5);
        const w = 6.5 + slot * 1.2;
        const h = 8.4 + ((seedIdx + slot + (side > 0 ? 1 : 0)) % 4) * 3.0;
        const d = 15.0;
        const color = area.buildingPalette[(seedIdx + slot) % area.buildingPalette.length];
        const shop = area.shopNames[(seedIdx + slot + (side > 0 ? 1 : 0)) % area.shopNames.length];
        const signCol = signColors[(seedIdx + slot) % signColors.length];

        const bldg = createBuildingModel(
          color,
          w,
          h,
          d,
          shop,
          signCol,
          this.maxAnisotropy,
          side === -1 ? 1 : -1,
          area.buildingStyle,
          seedIdx + slot + (side > 0 ? 2 : 0)
        );
        bldg.position.set(side * (15.4 + w / 2 - 2.2), 0, zOff);
        chunk.sceneryGroup.add(bldg);
      }

      // Roadside vendor stall / fruit table with umbrella on sidewalk
      if ((seedIdx + (side > 0 ? 1 : 0)) % 2 === 0) {
        const stall = createRoadsideStall(seedIdx + (side > 0 ? 1 : 0), this.maxAnisotropy);
        stall.position.set(side * 10.6, 0.16, (seedIdx % 2 === 0 ? -1 : 1) * 7.5);
        if (side === -1) stall.rotation.y = Math.PI;
        chunk.sceneryGroup.add(stall);
      }

      const tree = createTreeModel();
      tree.position.set(side * 11.4, 0.16, (seedIdx % 2 === 0 ? 1 : -1) * 11);
      chunk.sceneryGroup.add(tree);
    });

    // Overhead green directional road sign + signal on odd chunks (like Screenshot 1 & 3)
    if (seedIdx % 2 === 1) {
      const sign = createOverheadRoadSign(area.name, this.maxAnisotropy);
      sign.position.set(0, 0, -10);
      chunk.sceneryGroup.add(sign);
    }

    // Highway Billboard every 2nd chunk
    if (seedIdx % 2 === 0) {
      const side: -1 | 1 = this.billboardCounter % 2 === 0 ? 1 : -1;
      const bb = createBillboardModel(this.billboardCounter++, this.maxAnisotropy, side);
      bb.position.set(side * 11.4, 0, -2);
      chunk.sceneryGroup.add(bb);
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

    // Startle nearby non-chasing pedestrians and nudge blocking cars ahead
    for (const ped of this.pedestrians) {
      if (!ped.isChasing && Math.abs(ped.z) < 28 && Math.abs(ped.x - this.playerX) < 5.5) {
        ped.walkDir = ped.x >= this.playerX ? 1 : -1;
        ped.walkSpeed = 6.5;
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
    this.shakeTimer = 0.22;
    this.hornZoomPulse = 1.5;
    this.vibrate([30, 20, 45]);
    this.sound.playHorn();
    this.sound.playTrafficHorn('heavy');
    this.callbacks.onMissionProgress('horns', 2);

    // Clear agile cars out of player lane & scatter nearby pedestrians
    for (const ped of this.pedestrians) {
      if (Math.abs(ped.z) < 35) {
        ped.isChasing = false;
        ped.rig.alertBadge.visible = false;
        ped.walkDir = ped.x >= this.playerX ? 1 : -1;
        ped.walkSpeed = 8.5;
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
        this.rebuildChunkScenery(chunk, i, 45);
      });
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
    this.playerRoll = 0;
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
    this.passengerFare = 0;
    this.passengerDistLeft = 0;
    this.passengerDropoffSpawned = false;
    this.distanceSincePassenger = 35;

    this.invulnTimer = 0;
    this.dividerCooldown = 0;
    this.shakeTimer = 0;
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

    const firstArea = AREAS[this.areaIndex];
    this.roadChunks.forEach((chunk, idx) => {
      this.rebuildChunkScenery(chunk, idx, 45);
    });

    this.spawnAreaGantry(firstArea.name, firstArea.tagline, firstArea.accentColor, -75);
    this.callbacks.onAreaEnter(firstArea.name, firstArea.tagline, 1);

    this.setPhase('playing');
    this.emitHud();
  }

  private clearDynamicEntities(): void {
    for (const t of this.traffic) this.scene.remove(t.rig.group);
    this.traffic = [];
    for (const p of this.pedestrians) this.scene.remove(p.rig.group);
    this.pedestrians = [];
    for (const z of this.zones) this.scene.remove(z.group);
    this.zones = [];
    for (const wp of this.waitingPassengers) {
      this.scene.remove(wp.rig.group);
      this.scene.remove(wp.pad);
    }
    this.waitingPassengers = [];
    for (const g of this.gantries) this.scene.remove(g.group);
    this.gantries = [];
    for (const tl of this.trafficLights) this.scene.remove(tl.rig.group);
    this.trafficLights = [];
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
      direction,
      nearMissed: false,
      laneTimer: 1.5 + Math.random() * 3.0,
      honked: false,
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

  private spawnPedestrian(): void {
    const shirts = ['#f97316', '#06b6d4', '#eab308', '#ec4899', '#f8fafc', '#22c55e'];
    const rig = createPedestrianModel(shirts[Math.floor(Math.random() * shirts.length)], false);
    const fromLeft = Math.random() < 0.5;
    const jaywalks = Math.random() < 0.62 + this.wanted * 0.06;
    const startX = jaywalks ? (fromLeft ? -9.2 : 9.2) : fromLeft ? -9.8 : 9.8;
    const startZ = -136 - Math.random() * 20;

    rig.group.position.set(startX, 0, startZ);
    this.scene.add(rig.group);

    this.pedestrians.push({
      rig,
      x: startX,
      z: startZ,
      walkDir: jaywalks ? (fromLeft ? 1 : -1) : 0,
      walkSpeed: jaywalks ? 2.5 + Math.random() * 1.9 : 1.4,
      isChasing: false,
      hitCooldown: 0,
      animPhase: Math.random() * Math.PI * 2,
    });
  }

  private spawnWaitingPassenger(): void {
    const side: -1 | 1 = Math.random() < 0.5 ? 1 : -1;
    const x = side * 7.6;
    const z = -142;

    const rig = createPedestrianModel('#10b981', true);
    rig.group.position.set(side * 9.3, 0, z);
    rig.group.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;

    const pad = createZonePad('pickup', this.maxAnisotropy);
    pad.position.set(x, 0, z);

    this.scene.add(rig.group);
    this.scene.add(pad);

    this.waitingPassengers.push({
      rig,
      pad,
      x,
      z,
      wavePhase: 0,
      pickedUp: false,
    });
  }

  private spawnZone(type: 'gas' | 'bribe' | 'dropoff'): void {
    const laneX = type === 'dropoff' ? (Math.random() < 0.5 ? 6.2 : -6.2) : Math.random() < 0.5 ? 4.4 : -4.4;
    const pad = createZonePad(type, this.maxAnisotropy);
    if (laneX < 0 && pad.children[1] && type !== 'dropoff') {
      pad.children[1].position.x = -4.6;
    }
    pad.position.set(laneX, 0, -145);
    this.scene.add(pad);
    this.zones.push({ group: pad, type, x: laneX, z: -145, triggered: false });
  }

  private handleGameOver(reason: DeathReason): void {
    this.phase = 'gameover';
    this.isDraggingLook = false;
    this.input.lookBack = false;
    this.cngRig.group.visible = true;
    this.syncCameraVisibility();
    this.sound.stopEngine();
    this.sound.playCrash(true);
    this.vibrate([80, 35, 110]);
    this.callbacks.onCrashJuice?.('major');

    const pool = SATIRE_HEADLINES[reason];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const finalScore = Math.round(this.score);
    const isNewRecord = finalScore > this.highScoreRef;
    if (isNewRecord) this.highScoreRef = finalScore;

    this.emitHud();
    this.callbacks.onGameOver({
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
    });
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

    // Nearest blocking heavy vehicle ahead in player's path
    let aheadHazard: { label: string; sub: string; dist: number } | null = null;
    for (const t of this.traffic) {
      if (t.z < -4 && t.z > -65 && Math.abs(t.x - this.playerX) < 2.2) {
        const d = Math.round(Math.abs(t.z));
        if (!aheadHazard || d < aheadHazard.dist) {
          aheadHazard = {
            label: t.direction === -1 ? 'মুখোমুখি!' : 'অবরোধ',
            sub: t.kind === 'bus' || t.kind === 'truck' ? 'বড় গাড়ি সামনে!' : 'ওভারটেক করুন!',
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
    for (const t of this.traffic) {
      if (t.z > -90 && t.z < 40) {
        radarEntities.push({
          dx: t.x - this.playerX,
          dz: t.z,
          kind: t.kind === 'bus' ? 'bus' : t.kind === 'truck' ? 'truck' : t.kind === 'car' ? 'car' : 'other',
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
      passengerFare: this.passengerFare,
      passengerDistLeft: Math.max(0, Math.round(this.passengerDistLeft)),
      passengerNearPickup: nearPickup,
      cameraMode: this.cameraMode,
      steerDir: this.steerDir,
      wrongWay: this.playerX < -0.55,
      nearestGasDist,
      nearestGasAhead,
      aheadHazard,
      aheadTrafficLight,
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

  private stepGameplay(dt: number): void {
    const area = AREAS[this.areaIndex];
    const loopMult = 1 + (this.loopCount - 1) * 0.22;

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.dividerCooldown > 0) this.dividerCooldown -= dt;
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.hornCooldown > 0) this.hornCooldown -= dt;
    if (this.soundBombCooldown > 0) this.soundBombCooldown = Math.max(0, this.soundBombCooldown - dt);
    if (this.trafficHornCooldown > 0) this.trafficHornCooldown -= dt;
    if (this.gasZoneSoundCooldown > 0) this.gasZoneSoundCooldown -= dt;

    // Random weather cycling during gameplay
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      const candidates: WeatherCondition[] = (['sunny', 'rainy', 'foggy'] as WeatherCondition[]).filter(
        (w) => w !== this.weather
      );
      const nextWeather = candidates[Math.floor(Math.random() * candidates.length)];
      this.applyWeather(nextWeather, true);
    }

    // Speed & Boost physics (Weather impacts traction, braking distance & top speed)
    const boosting = this.input.boost && this.gas > 2;
    const weatherSpeedMult = this.weather === 'foggy' ? 0.92 : 1.0;
    const maxSpeed =
      (boosting ? 50 : 35) *
      Math.min(1.35, 1 + (this.loopCount - 1) * 0.08) *
      weatherSpeedMult;
    let targetSpeed = 14 * weatherSpeedMult;
    if (this.input.up || boosting) targetSpeed = maxSpeed;
    else if (this.input.down) targetSpeed = 0;

    const brakeDamp = this.weather === 'rainy' ? 4.3 : this.weather === 'foggy' ? 6.8 : 9.2;
    const accelDamp = this.weather === 'rainy' ? 2.4 : 3.4;

    this.playerSpeed = THREE.MathUtils.damp(
      this.playerSpeed,
      targetSpeed,
      this.input.down ? brakeDamp : accelDamp,
      dt
    );
    if (this.input.down && this.playerSpeed < 0.3) {
      this.playerSpeed = 0;
    }

    this.cngRig.boostFlameLeft.visible = boosting;
    this.cngRig.boostFlameRight.visible = boosting;
    if (boosting) {
      const flicker = 0.8 + Math.random() * 0.5;
      this.cngRig.boostFlameLeft.scale.set(1, flicker, 1);
      this.cngRig.boostFlameRight.scale.set(1, flicker, 1);
      this.boostMissionAccum += dt;
      if (this.boostMissionAccum >= 1) {
        const whole = Math.floor(this.boostMissionAccum);
        this.boostMissionAccum -= whole;
        this.callbacks.onMissionProgress('boost_time', whole);
      }
    }

    // Steering, Wet Hydroplane Drift & Cockpit Handlebar / Ornament Animation
    const steerInput = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    this.steerDir = steerInput as -1 | 0 | 1;
    const baseSteerSpeed = 12.0 * (0.65 + 0.35 * (this.playerSpeed / 35));
    const steerMult = this.weather === 'foggy' ? 0.88 : this.weather === 'rainy' ? 1.06 : 1.0;
    let targetLatVel = steerInput * baseSteerSpeed * steerMult;
    if (this.weather === 'rainy' && this.playerSpeed > 28) {
      targetLatVel += Math.sin(performance.now() * 0.008) * 1.45;
    }
    const latDamp = this.weather === 'rainy' ? 5.0 : this.weather === 'foggy' ? 12.5 : 18.0;
    this.lateralVel = THREE.MathUtils.damp(this.lateralVel, targetLatVel, latDamp, dt);

    const unclampedX = this.playerX + this.lateralVel * dt;
    this.playerX = THREE.MathUtils.clamp(unclampedX, -7.4, 7.4);
    if (this.playerX !== unclampedX) {
      this.lateralVel = 0;
    }
    this.playerRoll = THREE.MathUtils.damp(
      this.playerRoll,
      -THREE.MathUtils.clamp(this.lateralVel / 12, -1.2, 1.2) * 0.14,
      10,
      dt
    );

    this.cngRig.group.position.x = this.playerX;
    this.cngRig.bodyGroup.rotation.z = this.playerRoll;
    this.cngRig.bodyGroup.position.y = Math.sin(performance.now() * 0.04) * 0.015;

    this.handlebarAngle = THREE.MathUtils.damp(this.handlebarAngle, -steerInput * 0.42, 12, dt);
    this.cockpitRig.handlebarPivot.rotation.y = this.handlebarAngle;

    this.ornamentPhase += dt * (4.5 + this.playerSpeed * 0.22);
    const targetOrnZ = -steerInput * 0.28 + Math.sin(this.ornamentPhase) * (0.08 + (boosting ? 0.09 : 0));
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

    const wheelSpin = (this.playerSpeed * dt) / 0.32;
    for (const w of this.cngRig.wheels) {
      w.rotation.x -= wheelSpin;
    }

    if (this.invulnTimer > 0) {
      this.cngRig.group.visible = Math.floor(this.invulnTimer * 16) % 2 === 0;
    } else {
      this.cngRig.group.visible = true;
    }

    this.sound.updateEngine(Math.min(1, this.playerSpeed / 40), boosting, true);

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
      this.playerSpeed < 1.0
        ? 0.35
        : (boosting ? 4.6 : 1.95) * (1 + (this.loopCount - 1) * 0.12);
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
          this.rebuildChunkScenery(chunk, idx + Math.floor(this.distanceMeters / 45), 45);
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
          this.shakeTimer = 0.16;
          this.vibrate([30, 20, 30]);
          this.callbacks.onCrashJuice?.('minor');
          this.playerSpeed = Math.max(8, this.playerSpeed * 0.72);
          this.playerX = this.playerX >= 0 ? 1.28 : -1.28;
          this.sound.playCrash(false);
          this.callbacks.onToast({
            text: 'ডিভাইডারে ঘষা! জাতীয় ক্ষতি +৳২০০',
            tone: 'danger',
          });
        }
      }
    }

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

    // Passenger Pickup & Drop-off
    if (!this.passengerActive && this.distanceSincePassenger > 85 && this.waitingPassengers.length === 0) {
      this.distanceSincePassenger = 0;
      this.spawnWaitingPassenger();
    }

    for (let i = this.waitingPassengers.length - 1; i >= 0; i--) {
      const wp = this.waitingPassengers[i];
      wp.z += distStep;
      wp.wavePhase += dt * 10;
      wp.rig.group.position.z = wp.z;
      wp.pad.position.z = wp.z;
      wp.rig.rightArm.rotation.z = -2.2 + Math.sin(wp.wavePhase) * 0.45;
      wp.rig.alertBadge.rotation.y += dt * 3;

      const nearSide = Math.abs(wp.x - this.playerX) < 3.4 && Math.abs(wp.z) < 5.0;
      if (!wp.pickedUp && nearSide && this.playerSpeed < 17) {
        wp.pickedUp = true;
        this.passengerActive = true;
        this.passengerDistLeft = 150 + Math.random() * 110;
        this.passengerFare = 130 + Math.round(this.passengerDistLeft * 0.65);
        this.passengerDropoffSpawned = false;
        this.sound.playPickup();
        this.callbacks.onToast({
          text: `যাত্রী উঠেছে! সামনে নামিয়ে দিলে ভাড়া ৳${toBn(this.passengerFare)}`,
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

    if (this.passengerActive) {
      this.passengerDistLeft -= distStep;
      if (this.passengerDistLeft <= 125 && !this.passengerDropoffSpawned) {
        this.passengerDropoffSpawned = true;
        this.spawnZone('dropoff');
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
          this.gas = Math.min(100, this.gas + 48 * dt);
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
          this.passengerActive = false;
          this.runTaka += this.passengerFare;
          this.score += 320;
          this.vibrate(25);
          this.sound.playFare();
          this.callbacks.onToast({
            text: `যাত্রী নেমেছে! ভাড়া +৳${toBn(this.passengerFare)} পকেটে 💵`,
            tone: 'success',
          });
          this.callbacks.onMissionProgress('passengers', 1);
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
        this.hp -= 14;
        this.wanted = Math.min(5, this.wanted + 1);
        this.shakeTimer = 0.28;
        this.vibrate([45, 25, 50]);
        this.callbacks.onCrashJuice?.('minor');
        this.sound.playRedLightPenalty();
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

    // Update Traffic, Red-Light Stopping, Lane Changing, Horns & Collisions
    const playerHalfW = 0.72;
    const playerHalfL = 1.38;
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const t = this.traffic[i];

      // Determine desired speed based on upcoming red/yellow traffic light & vehicle ahead
      let desiredSpeed = t.baseSpeed;
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

      // Queue behind slower/stopped vehicles in the same lane
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
      }

      t.speed = THREE.MathUtils.damp(t.speed, desiredSpeed, desiredSpeed === 0 ? 6.5 : 3.2, dt);
      if (desiredSpeed === 0 && t.speed < 0.25) t.speed = 0;

      const relZ =
        t.direction === 1
          ? (this.playerSpeed - t.speed) * dt
          : (this.playerSpeed + t.speed) * dt;
      t.z += relZ;

      // Occasional lane changes for agile vehicles on their own side (only when moving)
      t.laneTimer -= dt;
      if (
        t.speed > 4 &&
        t.laneTimer <= 0 &&
        (t.kind === 'car' || t.kind === 'bike' || t.kind === 'cng_ai')
      ) {
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
            this.sound.playTrafficHorn('light');
          }
        }
      }

      const prevX = t.x;
      t.x = THREE.MathUtils.damp(t.x, t.targetX, 5.0, dt);
      t.rig.group.position.set(t.x, 0, t.z);
      t.rig.group.rotation.z = -(t.x - prevX) * 2.2;

      // Urgent horn if player is driving wrong-way directly toward this oncoming vehicle
      if (
        !t.honked &&
        t.direction === -1 &&
        t.z > -45 &&
        t.z < -8 &&
        Math.abs(t.x - this.playerX) < 2.6 &&
        this.trafficHornCooldown <= 0
      ) {
        t.honked = true;
        this.trafficHornCooldown = 1.1;
        this.sound.playTrafficHorn(t.kind === 'bus' || t.kind === 'truck' ? 'heavy' : 'light');
      } else if (!t.honked && t.z > -32 && t.z < -6 && Math.random() < 0.008 && this.trafficHornCooldown <= 0) {
        t.honked = true;
        this.trafficHornCooldown = 1.6;
        this.sound.playTrafficHorn(t.kind === 'bus' || t.kind === 'truck' ? 'heavy' : 'light');
      }

      for (const w of t.rig.wheels) {
        w.rotation.x -= (t.speed * dt) / 0.4;
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
        if (t.kind === 'bus' || t.kind === 'truck') {
          this.handleGameOver(t.kind);
          return;
        }
        if (this.invulnTimer <= 0) {
          const baseMoney =
            t.kind === 'car'
              ? 3500
              : t.kind === 'cng_ai'
              ? 2200
              : t.kind === 'bike'
              ? 1800
              : t.kind === 'thelagari'
              ? 1200
              : 1500;
          const dmgMoney = Math.round(baseMoney * (this.playerX < -0.55 ? 1.5 : 1.0));
          this.nationalDamage += dmgMoney;
          this.hp -= 12;
          this.wanted = Math.min(5, this.wanted + 1);
          this.invulnTimer = 0.75;
          this.shakeTimer = 0.35;
          this.playerSpeed = Math.max(8, this.playerSpeed * 0.55);
          this.playerX = THREE.MathUtils.clamp(
            this.playerX + (this.playerX >= t.x ? 1.4 : -1.4),
            -7.4,
            7.4
          );
          this.sound.playCrash(false);
          this.vibrate([45, 25, 50]);
          this.callbacks.onCrashJuice?.('minor');
          this.callbacks.onToast({
            text: `ধাক্কা! জাতীয় ক্ষতি +৳${toBn(dmgMoney)}!`,
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

    // Spawn Pedestrians
    this.pedSpawnTimer -= dt;
    if (this.pedSpawnTimer <= 0) {
      this.pedSpawnTimer = Math.max(0.65, (1.65 - this.wanted * 0.16) / loopMult);
      this.spawnPedestrian();
    }

    // Update Pedestrians & Chasing
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      if (p.hitCooldown > 0) p.hitCooldown -= dt;

      if (p.isChasing) {
        const dx = this.playerX - p.x;
        const dz = 0 - p.z;
        const dist = Math.hypot(dx, dz) || 1;
        const chaseSpeed = 15.5 + this.wanted * 1.4 + (this.loopCount - 1) * 1.5;
        p.x += (dx / dist) * Math.min(9.5, chaseSpeed * 0.55) * dt;
        p.z += (this.playerSpeed - chaseSpeed * 0.9) * dt + (dz / dist) * 4.5 * dt;

        p.rig.group.rotation.y = Math.atan2(dx, dz);
        p.animPhase += dt * 16;
      } else if (p.walkDir !== 0) {
        p.z += distStep;
        p.x += p.walkDir * p.walkSpeed * dt;
        if (p.x > 9.8 || p.x < -9.8) p.walkDir *= -1;
        p.rig.group.rotation.y = p.walkDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        p.animPhase += dt * 8;
      } else {
        // Sidewalk stroller
        p.z += (this.playerSpeed - p.walkSpeed) * dt;
        p.rig.group.rotation.y = Math.PI;
        p.animPhase += dt * 6;
      }

      p.rig.group.position.set(p.x, 0, p.z);

      const swing = Math.sin(p.animPhase) * (p.isChasing ? 0.75 : 0.45);
      p.rig.leftLeg.rotation.x = swing;
      p.rig.rightLeg.rotation.x = -swing;
      p.rig.leftArm.rotation.x = p.isChasing ? -2.2 + swing * 0.6 : -swing;
      p.rig.rightArm.rotation.x = p.isChasing ? -2.2 - swing * 0.6 : swing;
      if (p.isChasing) {
        p.rig.alertBadge.rotation.y += dt * 4;
      }

      const hitPed = Math.abs(p.x - this.playerX) < 1.15 && Math.abs(p.z) < 1.65;
      if (hitPed && p.hitCooldown <= 0) {
        if (!p.isChasing) {
          p.isChasing = true;
          p.rig.alertBadge.visible = true;
          p.hitCooldown = 0.9;
          p.z += 1.8;
          this.nationalDamage += 800;
          this.wanted = Math.min(5, this.wanted + 1);
          this.shakeTimer = 0.22;
          this.vibrate([35, 20, 40]);
          this.callbacks.onCrashJuice?.('minor');
          this.sound.playCrash(false);

          for (const other of this.pedestrians) {
            if (!other.isChasing && Math.abs(other.z - p.z) < 12 && Math.abs(other.x - p.x) < 7) {
              other.isChasing = true;
              other.rig.alertBadge.visible = true;
            }
          }

          this.callbacks.onToast({
            text: 'পথচারীকে ধাক্কা! জাতীয় ক্ষতি +৳৮০০ — তারা তাড়া করছে!',
            tone: 'danger',
          });
        } else {
          p.hitCooldown = 1.15;
          p.z += 2.6;
          this.hp -= 22;
          this.shakeTimer = 0.3;
          this.vibrate([50, 25, 55]);
          this.callbacks.onCrashJuice?.('minor');
          this.sound.playCrash(false);
          this.callbacks.onToast({
            text: 'ক্ষুব্ধ পথচারী ধরে ফেলেছে! -২২ HP!',
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
        this.pedestrians.splice(i, 1);
      }
    }

    // Camera update (External chase cam vs Driver 1st-person cockpit cam)
    this.hornZoomPulse = THREE.MathUtils.damp(this.hornZoomPulse, 0, 11, dt);
    const speedNorm = Math.min(1, this.playerSpeed / 48);
    const targetFov = 58 + speedNorm * 12 + (boosting ? 4 : 0) - this.hornZoomPulse * 3.8;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, dt);
    this.camera.updateProjectionMatrix();

    const boostVibX = boosting ? (Math.random() - 0.5) * 0.028 : 0;
    const boostVibY = boosting ? (Math.random() - 0.5) * 0.024 : 0;
    const shakeX = (this.shakeTimer > 0 ? (Math.random() - 0.5) * 0.48 : 0) + boostVibX;
    const shakeY = (this.shakeTimer > 0 ? (Math.random() - 0.5) * 0.36 : 0) + boostVibY;

    if (this.cameraMode === 'driver') {
      if (!this.isDraggingLook) {
        this.lookYaw = THREE.MathUtils.damp(this.lookYaw, 0, 7, dt);
        this.lookPitch = THREE.MathUtils.damp(this.lookPitch, 0, 7, dt);
      }

      const eyeX = this.playerX + shakeX * 0.45;
      const eyeY = 1.48 + shakeY * 0.35;
      const eyeZ = -0.14;
      this.camera.position.set(eyeX, eyeY, eyeZ);

      if (this.input.lookBack) {
        _camLookAt.set(this.playerX, 1.46, 12.0);
      } else {
        _camLookAt.set(
          eyeX - Math.sin(this.lookYaw) * 14,
          eyeY - 0.16 + Math.sin(this.lookPitch) * 10,
          eyeZ - Math.cos(this.lookYaw) * 14
        );
      }
      this.camera.lookAt(_camLookAt);
      this.camera.rotateZ(-this.playerRoll * 0.35);
    } else if (this.input.lookBack) {
      _camTargetPos.set(this.playerX * 0.8 + shakeX, 3.6 + shakeY, -6.2);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-14 * dt));
      _camLookAt.set(this.playerX * 0.9, 1.35, 12.0);
      this.camera.lookAt(_camLookAt);
    } else {
      _camTargetPos.set(
        this.playerX * 0.72 + shakeX,
        4.85 + shakeY,
        8.2 - (boosting ? 0.5 : 0)
      );
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-10 * dt));
      _camLookAt.set(this.playerX * 0.85, 1.35, -8.0);
      this.camera.lookAt(_camLookAt);
    }

    this.hudEmitTimer += dt;
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

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (this.phase === 'playing') {
      this.stepGameplay(dt);
    } else if (this.phase === 'menu' || this.phase === 'garage') {
      this.stepShowcase(dt);
    }

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
