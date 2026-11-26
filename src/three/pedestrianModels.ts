import * as THREE from 'three';

export type PedestrianStyle =
  | 'lungi_shirt'
  | 'panjabi'
  | 'saree'
  | 'burqa'
  | 'school_uniform'
  | 'office_wear'
  | 'rickshaw_puller'
  | 'vendor'
  | 'traffic_police'
  | 'kid_backpack';

export type PedestrianPose =
  | 'walk'
  | 'run'
  | 'wave'
  | 'argue'
  | 'carry_bags'
  | 'sit_tea_stall'
  | 'cross_unaware'
  | 'jump_back'
  | 'fall';

export type SpeechCategory = 'crash' | 'horn' | 'violation';

export interface PedestrianCreateOptions {
  style?: PedestrianStyle;
  isWaitingPassenger?: boolean;
  carryBag?: boolean;
  withTeaCup?: boolean;
  maxAnisotropy?: number;
}

export interface PedestrianRig {
  group: THREE.Group;
  detailedGroup: THREE.Group;
  simpleGroup: THREE.Group;
  bodyRoot: THREE.Group;
  torsoPivot: THREE.Group;
  headPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightLegPivot: THREE.Group;
  rightKneePivot: THREE.Group;
  alertBadge: THREE.Mesh;
  speechBubble: THREE.Sprite;
  style: PedestrianStyle;
  setDetailed: (detailed: boolean) => void;
  showSpeech: (category?: SpeechCategory) => void;
  hideSpeech: () => void;
  applyPose: (pose: PedestrianPose, phase: number, aux?: number) => void;
}

const FONT_STACK = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif";

const SPEECH_LINES: Record<SpeechCategory, string[]> = {
  crash: [
    'এই মিয়া দেখে চালা!',
    'অন্ধ নাকি?!',
    'ধর ওরে!',
    'গাড়ি থামা!',
    'রাস্তা কি তোর বাপের?!',
    'হায় আল্লাহ! মইরা গেলাম!',
    'পুলিশ ডাক!',
    'ভাইরে ভাই, লাগলো!',
  ],
  horn: [
    'ওরে বাবা!',
    'হর্ন দেয় ক্যান?!',
    'কান ফেটে গেল!',
    'ধীরে চালা ভাই!',
  ],
  violation: [
    'সিগন্যাল মানস না?!',
    'ডিভাইডার ভাঙলো রে!',
    'উল্টা পথে ক্যান?!',
    'ধর ধর, পালাইতেছে!',
  ],
};

const SKIN_TONES = ['#d2996c', '#c68642', '#b45309', '#9a4b16', '#81441b'];
const SHIRT_COLORS = ['#f97316', '#06b6d4', '#eab308', '#ec4899', '#f8fafc', '#22c55e', '#3b82f6', '#ef4444'];
const PANJABI_COLORS = ['#f8fafc', '#0f766e', '#991b1b', '#1d4ed8', '#d97706', '#334155'];
const SAREE_PALETTES: [string, string][] = [
  ['#dc2626', '#facc15'],
  ['#db2777', '#fef3c7'],
  ['#059669', '#fde047'],
  ['#7c3aed', '#f9a8d4'],
  ['#0284c7', '#fb923c'],
];
const BURQA_COLORS = ['#09090b', '#18181b', '#1e1b4b', '#3f1d2b'];
const BAG_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899'];

interface CachedGeos {
  head: THREE.SphereGeometry;
  hairCap: THREE.SphereGeometry;
  hairBun: THREE.SphereGeometry;
  capCrown: THREE.CylinderGeometry;
  capBrim: THREE.BoxGeometry;
  hijabWrap: THREE.SphereGeometry;
  torso: THREE.BoxGeometry;
  tunicSkirt: THREE.CylinderGeometry;
  longRobe: THREE.CylinderGeometry;
  lungiWrap: THREE.CylinderGeometry;
  sareePallu: THREE.BoxGeometry;
  vest: THREE.BoxGeometry;
  shoulderGamchha: THREE.BoxGeometry;
  backpack: THREE.BoxGeometry;
  backpackPocket: THREE.BoxGeometry;
  vendorTray: THREE.BoxGeometry;
  vendorGoods1: THREE.SphereGeometry;
  vendorGoods2: THREE.SphereGeometry;
  upperArm: THREE.CylinderGeometry;
  forearm: THREE.CylinderGeometry;
  hand: THREE.BoxGeometry;
  upperLeg: THREE.CylinderGeometry;
  lowerLeg: THREE.CylinderGeometry;
  shoe: THREE.BoxGeometry;
  bagHandle: THREE.TorusGeometry;
  bagBody: THREE.BoxGeometry;
  teaCup: THREE.CylinderGeometry;
  alertDiamond: THREE.OctahedronGeometry;
  simpleBody: THREE.CylinderGeometry;
  simpleLegs: THREE.BoxGeometry;
  simpleHead: THREE.SphereGeometry;
  benchTop: THREE.BoxGeometry;
  benchLeg: THREE.BoxGeometry;
}

interface AssetPool {
  geos: CachedGeos;
  stdMats: Map<string, THREE.MeshStandardMaterial>;
  basicMats: Map<string, THREE.MeshBasicMaterial>;
  textures: THREE.Texture[];
  speechMats: Record<SpeechCategory, THREE.SpriteMaterial[]>;
}

let cachedPool: AssetPool | null = null;

function makeTexturedPattern(
  kind: 'lungi' | 'gamchha' | 'saree',
  c1: string,
  c2: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, 128, 128);

  if (kind === 'lungi') {
    ctx.fillStyle = c2;
    for (let i = 0; i < 128; i += 16) {
      ctx.fillRect(i, 0, 5, 128);
      ctx.fillRect(0, i, 128, 4);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let i = 8; i < 128; i += 32) {
      ctx.fillRect(i, 0, 2, 128);
      ctx.fillRect(0, i, 128, 2);
    }
  } else if (kind === 'gamchha') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 128; i += 16) {
      ctx.fillRect(i, 0, 7, 128);
      ctx.fillRect(0, i, 128, 7);
    }
    ctx.fillStyle = c2;
    for (let i = 3; i < 128; i += 16) {
      ctx.fillRect(i, 0, 2, 128);
      ctx.fillRect(0, i, 128, 2);
    }
  } else {
    // Saree woven border + gold motifs
    ctx.fillStyle = c2;
    ctx.fillRect(0, 96, 128, 32);
    ctx.fillStyle = '#fef08a';
    for (let x = 8; x < 128; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 102);
      ctx.lineTo(x + 6, 112);
      ctx.lineTo(x, 122);
      ctx.lineTo(x - 6, 112);
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(4, maxAnisotropy || 1);
  tex.needsUpdate = true;
  return tex;
}

function makeSpeechBubbleMaterial(text: string, category: SpeechCategory, maxAnisotropy: number): THREE.SpriteMaterial {
  const W = 320;
  const H = 104;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const accent =
    category === 'crash' ? '#dc2626' : category === 'violation' ? '#ea580c' : '#eab308';

  // Comic speech bubble with tail
  ctx.fillStyle = '#fffbeb';
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 6;

  ctx.beginPath();
  ctx.roundRect(10, 8, W - 20, H - 30, 20);
  ctx.fill();
  ctx.stroke();

  // Accent header bar inside left edge
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(18, 16, 10, H - 46, 5);
  ctx.fill();

  // Bubble pointer tail
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.moveTo(W * 0.44, H - 24);
  ctx.lineTo(W * 0.50, H - 3);
  ctx.lineTo(W * 0.57, H - 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cover inner stroke seam
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(W * 0.43, H - 27, W * 0.15, 6);

  ctx.fillStyle = '#18181b';
  ctx.font = `800 26px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2 + 4, (H - 22) / 2 + 4, W - 46);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy || 1);
  tex.needsUpdate = true;

  return new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
}

function getPool(maxAnisotropy = 1): AssetPool {
  if (cachedPool) return cachedPool;

  const geos: CachedGeos = {
    head: new THREE.SphereGeometry(0.165, 10, 8),
    hairCap: new THREE.SphereGeometry(0.174, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairBun: new THREE.SphereGeometry(0.085, 7, 6),
    capCrown: new THREE.CylinderGeometry(0.168, 0.174, 0.11, 10),
    capBrim: new THREE.BoxGeometry(0.24, 0.025, 0.14),
    hijabWrap: new THREE.SphereGeometry(0.185, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.72),
    torso: new THREE.BoxGeometry(0.42, 0.54, 0.24),
    tunicSkirt: new THREE.CylinderGeometry(0.22, 0.27, 0.42, 10),
    longRobe: new THREE.CylinderGeometry(0.21, 0.34, 0.84, 10),
    lungiWrap: new THREE.CylinderGeometry(0.20, 0.22, 0.66, 10),
    sareePallu: new THREE.BoxGeometry(0.44, 0.56, 0.255),
    vest: new THREE.BoxGeometry(0.44, 0.46, 0.255),
    shoulderGamchha: new THREE.BoxGeometry(0.12, 0.46, 0.265),
    backpack: new THREE.BoxGeometry(0.32, 0.38, 0.18),
    backpackPocket: new THREE.BoxGeometry(0.24, 0.18, 0.06),
    vendorTray: new THREE.BoxGeometry(0.44, 0.10, 0.32),
    vendorGoods1: new THREE.SphereGeometry(0.065, 6, 5),
    vendorGoods2: new THREE.SphereGeometry(0.055, 6, 5),
    upperArm: new THREE.CylinderGeometry(0.058, 0.050, 0.27, 7),
    forearm: new THREE.CylinderGeometry(0.048, 0.040, 0.25, 7),
    hand: new THREE.BoxGeometry(0.075, 0.088, 0.075),
    upperLeg: new THREE.CylinderGeometry(0.082, 0.068, 0.36, 7),
    lowerLeg: new THREE.CylinderGeometry(0.065, 0.052, 0.35, 7),
    shoe: new THREE.BoxGeometry(0.125, 0.085, 0.225),
    bagHandle: new THREE.TorusGeometry(0.08, 0.015, 5, 8, Math.PI),
    bagBody: new THREE.BoxGeometry(0.24, 0.28, 0.12),
    teaCup: new THREE.CylinderGeometry(0.045, 0.035, 0.075, 7),
    alertDiamond: new THREE.OctahedronGeometry(0.21, 0),
    simpleBody: new THREE.CylinderGeometry(0.20, 0.23, 0.88, 7),
    simpleLegs: new THREE.BoxGeometry(0.30, 0.66, 0.18),
    simpleHead: new THREE.SphereGeometry(0.16, 7, 6),
    benchTop: new THREE.BoxGeometry(0.55, 0.08, 1.8),
    benchLeg: new THREE.BoxGeometry(0.08, 0.42, 0.08),
  };

  const textures: THREE.Texture[] = [];
  const stdMats = new Map<string, THREE.MeshStandardMaterial>();
  const basicMats = new Map<string, THREE.MeshBasicMaterial>();

  const speechMats: Record<SpeechCategory, THREE.SpriteMaterial[]> = {
    crash: SPEECH_LINES.crash.map((t) => {
      const m = makeSpeechBubbleMaterial(t, 'crash', maxAnisotropy);
      if (m.map) textures.push(m.map);
      return m;
    }),
    horn: SPEECH_LINES.horn.map((t) => {
      const m = makeSpeechBubbleMaterial(t, 'horn', maxAnisotropy);
      if (m.map) textures.push(m.map);
      return m;
    }),
    violation: SPEECH_LINES.violation.map((t) => {
      const m = makeSpeechBubbleMaterial(t, 'violation', maxAnisotropy);
      if (m.map) textures.push(m.map);
      return m;
    }),
  };

  cachedPool = { geos, stdMats, basicMats, textures, speechMats };
  return cachedPool;
}

function getStdMat(
  pool: AssetPool,
  key: string,
  factory: () => THREE.MeshStandardMaterial
): THREE.MeshStandardMaterial {
  let mat = pool.stdMats.get(key);
  if (!mat) {
    mat = factory();
    pool.stdMats.set(key, mat);
    if (mat.map) pool.textures.push(mat.map);
  }
  return mat;
}

function getBasicMat(
  pool: AssetPool,
  key: string,
  color: string
): THREE.MeshBasicMaterial {
  let mat = pool.basicMats.get(key);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color });
    pool.basicMats.set(key, mat);
  }
  return mat;
}

export function disposePedestrianAssetPool(): void {
  if (!cachedPool) return;
  for (const g of Object.values(cachedPool.geos)) {
    g.dispose();
  }
  for (const m of cachedPool.stdMats.values()) {
    m.dispose();
  }
  for (const m of cachedPool.basicMats.values()) {
    m.dispose();
  }
  for (const cat of Object.values(cachedPool.speechMats)) {
    for (const sm of cat) {
      sm.dispose();
    }
  }
  for (const t of cachedPool.textures) {
    t.dispose();
  }
  cachedPool = null;
}

export function createTeaStallBench(maxAnisotropy = 1): THREE.Group {
  const pool = getPool(maxAnisotropy);
  const woodMat = getStdMat(pool, 'bench:wood', () =>
    new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.88 })
  );
  const darkWoodMat = getStdMat(pool, 'bench:legs', () =>
    new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.92 })
  );
  const g = new THREE.Group();
  const top = new THREE.Mesh(pool.geos.benchTop, woodMat);
  top.position.y = 0.43;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  const offsets: [number, number][] = [
    [-0.2, -0.75],
    [0.2, -0.75],
    [-0.2, 0.75],
    [0.2, 0.75],
  ];
  for (const [lx, lz] of offsets) {
    const leg = new THREE.Mesh(pool.geos.benchLeg, darkWoodMat);
    leg.position.set(lx, 0.21, lz);
    g.add(leg);
  }
  return g;
}

const ALL_STYLES: PedestrianStyle[] = [
  'lungi_shirt',
  'panjabi',
  'saree',
  'burqa',
  'school_uniform',
  'office_wear',
  'rickshaw_puller',
  'vendor',
  'traffic_police',
  'kid_backpack',
];

export function pickRandomPedestrianStyle(): PedestrianStyle {
  const r = Math.random();
  if (r < 0.16) return 'lungi_shirt';
  if (r < 0.29) return 'panjabi';
  if (r < 0.42) return 'saree';
  if (r < 0.53) return 'burqa';
  if (r < 0.65) return 'office_wear';
  if (r < 0.76) return 'rickshaw_puller';
  if (r < 0.85) return 'school_uniform';
  if (r < 0.93) return 'vendor';
  if (r < 0.98) return 'kid_backpack';
  return ALL_STYLES[Math.floor(Math.random() * ALL_STYLES.length)];
}

export function createPedestrianModel(
  shirtHexOrOptions?: string | PedestrianCreateOptions,
  isWaitingPassenger = false,
  extraOptions?: PedestrianCreateOptions
): PedestrianRig {
  const opts: PedestrianCreateOptions =
    typeof shirtHexOrOptions === 'object'
      ? shirtHexOrOptions
      : { ...extraOptions, isWaitingPassenger };
  const preferredShirt = typeof shirtHexOrOptions === 'string' ? shirtHexOrOptions : undefined;
  const waiting = opts.isWaitingPassenger ?? isWaitingPassenger;
  const style: PedestrianStyle = opts.style ?? pickRandomPedestrianStyle();
  const maxAnisotropy = opts.maxAnisotropy ?? 1;

  const pool = getPool(maxAnisotropy);
  const { geos } = pool;

  const skinHex = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
  const hairHex = Math.random() < 0.85 ? '#18181b' : '#3f3f46';
  const skinMat = getStdMat(pool, `skin:${skinHex}`, () => new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.74 }));
  const hairMat = getStdMat(pool, `hair:${hairHex}`, () => new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.88 }));
  const shoeMat = getStdMat(pool, 'shoe:dark', () => new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.8 }));

  // Determine height, build and outfit colors
  const isChild = style === 'kid_backpack';
  const heightScale = isChild ? 0.74 + Math.random() * 0.06 : 0.94 + Math.random() * 0.13;
  const buildX = isChild ? 0.88 : 0.90 + Math.random() * 0.24;
  const buildZ = isChild ? 0.88 : 0.90 + Math.random() * 0.22;

  let topHex = preferredShirt ?? SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
  let bottomHex = '#1e293b';
  let topMat: THREE.MeshStandardMaterial;
  let bottomMat: THREE.MeshStandardMaterial;
  let sleeveMat: THREE.MeshStandardMaterial;

  if (style === 'panjabi') {
    topHex = PANJABI_COLORS[Math.floor(Math.random() * PANJABI_COLORS.length)];
    bottomHex = '#f8fafc';
  } else if (style === 'saree') {
    const pair = SAREE_PALETTES[Math.floor(Math.random() * SAREE_PALETTES.length)];
    topHex = pair[0];
    bottomHex = pair[1];
  } else if (style === 'burqa') {
    topHex = BURQA_COLORS[Math.floor(Math.random() * BURQA_COLORS.length)];
    bottomHex = topHex;
  } else if (style === 'school_uniform') {
    topHex = '#f8fafc';
    bottomHex = Math.random() < 0.5 ? '#1e3a8a' : '#14532d';
  } else if (style === 'office_wear') {
    const officeShirts = ['#e0f2fe', '#f8fafc', '#ede9fe', '#fce7f3', '#cbd5e1'];
    topHex = officeShirts[Math.floor(Math.random() * officeShirts.length)];
    bottomHex = Math.random() < 0.5 ? '#0f172a' : '#334155';
  } else if (style === 'rickshaw_puller') {
    const pullerTops = ['#f8fafc', '#0284c7', '#64748b', '#ca8a04'];
    topHex = pullerTops[Math.floor(Math.random() * pullerTops.length)];
    bottomHex = '#0f766e';
  } else if (style === 'traffic_police') {
    topHex = '#7dd3fc';
    bottomHex = '#0f172a';
  }

  topMat = getStdMat(pool, `cloth:${topHex}`, () => new THREE.MeshStandardMaterial({ color: topHex, roughness: 0.78 }));
  sleeveMat = style === 'rickshaw_puller' ? skinMat : topMat;

  if (style === 'lungi_shirt' || style === 'rickshaw_puller') {
    const lungiIdx = Math.floor(Math.random() * 4);
    const lungiPalettes: [string, string][] = [
      ['#1d4ed8', '#93c5fd'],
      ['#047857', '#6ee7b7'],
      ['#b91c1c', '#fca5a5'],
      ['#4338ca', '#e2e8f0'],
    ];
    const [lc1, lc2] = lungiPalettes[lungiIdx];
    bottomHex = lc1;
    bottomMat = getStdMat(pool, `lungi:${lc1}`, () => {
      const tex = makeTexturedPattern('lungi', lc1, lc2, maxAnisotropy);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    });
  } else if (style === 'saree') {
    bottomMat = getStdMat(pool, `saree:${topHex}:${bottomHex}`, () => {
      const tex = makeTexturedPattern('saree', topHex, bottomHex, maxAnisotropy);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.68 });
    });
  } else {
    bottomMat = getStdMat(pool, `cloth:${bottomHex}`, () => new THREE.MeshStandardMaterial({ color: bottomHex, roughness: 0.84 }));
  }

  const group = new THREE.Group();
  const detailedGroup = new THREE.Group();
  const simpleGroup = new THREE.Group();
  const bodyRoot = new THREE.Group();
  bodyRoot.scale.set(buildX * heightScale, heightScale, buildZ * heightScale);
  detailedGroup.add(bodyRoot);

  // Dimensions in unscaled human space (total height ~1.72m)
  const hipY = 0.74;
  const shoulderY = 0.48; // relative to torsoPivot at hipY
  const shoulderX = 0.255;
  const hipX = 0.115;

  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, hipY, 0);
  bodyRoot.add(torsoPivot);

  const torsoMesh = new THREE.Mesh(geos.torso, topMat);
  torsoMesh.position.y = 0.28;
  torsoMesh.castShadow = true;
  torsoPivot.add(torsoMesh);

  // Clothing-specific torso/skirt embellishments
  if (style === 'panjabi') {
    const skirt = new THREE.Mesh(geos.tunicSkirt, topMat);
    skirt.position.y = -0.06;
    torsoPivot.add(skirt);
  } else if (style === 'burqa') {
    const robe = new THREE.Mesh(geos.longRobe, topMat);
    robe.position.y = -0.25;
    robe.castShadow = true;
    torsoPivot.add(robe);
  } else if (style === 'saree') {
    const pallu = new THREE.Mesh(geos.sareePallu, bottomMat);
    pallu.position.y = 0.28;
    pallu.rotation.z = 0.16;
    torsoPivot.add(pallu);

    const wrap = new THREE.Mesh(geos.lungiWrap, bottomMat);
    wrap.position.y = -0.34;
    torsoPivot.add(wrap);
  } else if (style === 'lungi_shirt' || style === 'rickshaw_puller') {
    const lungi = new THREE.Mesh(geos.lungiWrap, bottomMat);
    lungi.position.y = -0.33;
    torsoPivot.add(lungi);
  }

  if (style === 'rickshaw_puller') {
    const gamchhaMat = getStdMat(pool, 'gamchha', () => {
      const tex = makeTexturedPattern('gamchha', '#dc2626', '#991b1b', maxAnisotropy);
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 });
    });
    const gamchha = new THREE.Mesh(geos.shoulderGamchha, gamchhaMat);
    gamchha.position.set(-0.14, 0.34, 0.01);
    torsoPivot.add(gamchha);
  }

  if (style === 'traffic_police') {
    const vestMat = getStdMat(pool, 'police:vest', () =>
      new THREE.MeshStandardMaterial({
        color: '#a3e635',
        emissive: '#65a30d',
        emissiveIntensity: 0.25,
        roughness: 0.48,
      })
    );
    const vest = new THREE.Mesh(geos.vest, vestMat);
    vest.position.y = 0.29;
    torsoPivot.add(vest);
  }

  if (style === 'kid_backpack' || (style === 'school_uniform' && Math.random() < 0.75)) {
    const bpColor = BAG_COLORS[Math.floor(Math.random() * BAG_COLORS.length)];
    const bpMat = getStdMat(pool, `bag:${bpColor}`, () => new THREE.MeshStandardMaterial({ color: bpColor, roughness: 0.65 }));
    const pack = new THREE.Mesh(geos.backpack, bpMat);
    pack.position.set(0, 0.29, -0.19);
    const pocket = new THREE.Mesh(geos.backpackPocket, shoeMat);
    pocket.position.set(0, 0.22, -0.28);
    torsoPivot.add(pack, pocket);
  }

  if (style === 'vendor') {
    const trayMat = getStdMat(pool, 'vendor:tray', () => new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 }));
    const tray = new THREE.Mesh(geos.vendorTray, trayMat);
    tray.position.set(0, 0.14, 0.26);
    const g1Mat = getStdMat(pool, 'vendor:g1', () => new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.55 }));
    const g2Mat = getStdMat(pool, 'vendor:g2', () => new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.55 }));
    for (let k = -1; k <= 1; k++) {
      const m1 = new THREE.Mesh(geos.vendorGoods1, g1Mat);
      m1.position.set(k * 0.12, 0.22, 0.23);
      const m2 = new THREE.Mesh(geos.vendorGoods2, g2Mat);
      m2.position.set(k * 0.11, 0.21, 0.32);
      torsoPivot.add(m1, m2);
    }
    torsoPivot.add(tray);
  }

  // Head & Hair/Headwear
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.68, 0);
  torsoPivot.add(headPivot);

  const headMesh = new THREE.Mesh(geos.head, skinMat);
  headMesh.castShadow = true;
  headPivot.add(headMesh);

  if (style === 'burqa') {
    const hijab = new THREE.Mesh(geos.hijabWrap, topMat);
    hijab.position.y = 0.01;
    headPivot.add(hijab);
  } else if (style === 'traffic_police') {
    const whiteCapMat = getStdMat(pool, 'police:cap', () => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.45 }));
    const cap = new THREE.Mesh(geos.capCrown, whiteCapMat);
    cap.position.y = 0.12;
    const brim = new THREE.Mesh(geos.capBrim, shoeMat);
    brim.position.set(0, 0.075, 0.11);
    headPivot.add(cap, brim);
  } else if (style === 'saree') {
    const hair = new THREE.Mesh(geos.hairCap, hairMat);
    hair.position.y = 0.02;
    const bun = new THREE.Mesh(geos.hairBun, hairMat);
    bun.position.set(0, 0.01, -0.17);
    headPivot.add(hair, bun);
  } else {
    const hair = new THREE.Mesh(geos.hairCap, hairMat);
    hair.position.y = 0.02;
    headPivot.add(hair);
    if (style === 'panjabi' && Math.random() < 0.55) {
      const tupiMat = getStdMat(pool, 'tupi', () => new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8 }));
      const tupi = new THREE.Mesh(geos.capCrown, tupiMat);
      tupi.scale.set(0.95, 0.72, 0.95);
      tupi.position.y = 0.12;
      headPivot.add(tupi);
    } else if ((style === 'lungi_shirt' || style === 'rickshaw_puller') && Math.random() < 0.35) {
      const capColor = Math.random() < 0.5 ? '#dc2626' : '#0284c7';
      const capMat = getStdMat(pool, `cap:${capColor}`, () => new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.75 }));
      const cap = new THREE.Mesh(geos.capCrown, capMat);
      cap.position.y = 0.11;
      const brim = new THREE.Mesh(geos.capBrim, capMat);
      brim.position.set(0, 0.07, 0.10);
      headPivot.add(cap, brim);
    }
  }

  // Articulated Arms (Shoulder -> Upper Arm -> Elbow -> Forearm -> Hand)
  const buildArm = (side: -1 | 1, withBag: boolean, withTea: boolean) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * shoulderX, shoulderY, 0);

    const upper = new THREE.Mesh(geos.upperArm, sleeveMat);
    upper.position.y = -0.135;
    armPivot.add(upper);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.27, 0);
    armPivot.add(elbowPivot);

    const forearm = new THREE.Mesh(geos.forearm, skinMat);
    forearm.position.y = -0.125;
    const hand = new THREE.Mesh(geos.hand, skinMat);
    hand.position.y = -0.265;
    elbowPivot.add(forearm, hand);

    if (withBag) {
      const bagColor = BAG_COLORS[Math.floor(Math.random() * BAG_COLORS.length)];
      const bagMat = getStdMat(pool, `bag:${bagColor}`, () => new THREE.MeshStandardMaterial({ color: bagColor, roughness: 0.6 }));
      const handle = new THREE.Mesh(geos.bagHandle, shoeMat);
      handle.position.set(0, -0.32, 0);
      const bag = new THREE.Mesh(geos.bagBody, bagMat);
      bag.position.set(0, -0.46, 0);
      elbowPivot.add(handle, bag);
    }

    if (withTea) {
      const cupMat = getStdMat(pool, 'teacup', () => new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.45 }));
      const cup = new THREE.Mesh(geos.teaCup, cupMat);
      cup.position.set(0, -0.27, 0.06);
      elbowPivot.add(cup);
    }

    torsoPivot.add(armPivot);
    return { armPivot, elbowPivot };
  };

  const leftArm = buildArm(-1, false, false);
  const rightArm = buildArm(1, Boolean(opts.carryBag), Boolean(opts.withTeaCup));

  // Articulated Legs (Hip -> Thigh -> Knee -> Shin -> Shoe)
  const buildLeg = (side: -1 | 1) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * hipX, hipY, 0);

    const thigh = new THREE.Mesh(geos.upperLeg, bottomMat);
    thigh.position.y = -0.18;
    legPivot.add(thigh);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.36, 0);
    legPivot.add(kneePivot);

    const shinMat = style === 'lungi_shirt' || style === 'rickshaw_puller' ? skinMat : bottomMat;
    const shin = new THREE.Mesh(geos.lowerLeg, shinMat);
    shin.position.y = -0.175;

    const shoe = new THREE.Mesh(geos.shoe, shoeMat);
    shoe.position.set(0, -0.345, 0.035);
    kneePivot.add(shin, shoe);

    bodyRoot.add(legPivot);
    return { legPivot, kneePivot };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // Simple low-poly LOD silhouette (used for >25th farthest pedestrian)
  const simpleRoot = new THREE.Group();
  simpleRoot.scale.set(buildX * heightScale, heightScale, buildZ * heightScale);
  const sLegs = new THREE.Mesh(geos.simpleLegs, bottomMat);
  sLegs.position.y = 0.33;
  const sTorso = new THREE.Mesh(geos.simpleBody, topMat);
  sTorso.position.y = 0.94;
  const sHead = new THREE.Mesh(geos.simpleHead, skinMat);
  sHead.position.y = 1.50;
  simpleRoot.add(sLegs, sTorso, sHead);
  simpleGroup.add(simpleRoot);
  simpleGroup.visible = false;

  // Floating alert diamond (for waiting passengers & chasing crowd)
  const alertMat = getBasicMat(pool, waiting ? 'alert:green' : 'alert:red', waiting ? '#10b981' : '#ef4444');
  const alertBadge = new THREE.Mesh(geos.alertDiamond, alertMat);
  alertBadge.position.set(0, 2.08 * heightScale, 0);
  alertBadge.visible = waiting;

  // Speech bubble sprite (hidden by default)
  const speechBubble = new THREE.Sprite(pool.speechMats.crash[0]);
  speechBubble.position.set(0, 2.38 * heightScale, 0);
  speechBubble.scale.set(2.35, 0.78, 1);
  speechBubble.visible = false;

  group.add(detailedGroup, simpleGroup, alertBadge, speechBubble);

  const setDetailed = (detailed: boolean) => {
    if (detailedGroup.visible === detailed) return;
    detailedGroup.visible = detailed;
    simpleGroup.visible = !detailed;
  };

  const showSpeech = (category: SpeechCategory = 'crash') => {
    const list = pool.speechMats[category];
    speechBubble.material = list[Math.floor(Math.random() * list.length)];
    speechBubble.visible = true;
  };

  const hideSpeech = () => {
    speechBubble.visible = false;
  };

  const applyPose = (pose: PedestrianPose, phase: number, aux = 0) => {
    if (!detailedGroup.visible) {
      simpleRoot.position.y = pose === 'sit_tea_stall' ? -0.25 : pose === 'fall' ? -0.35 : Math.abs(Math.sin(phase)) * 0.05;
      simpleRoot.rotation.x = pose === 'fall' ? -1.35 : 0;
      return;
    }

    // Reset root transforms
    bodyRoot.position.y = 0;
    bodyRoot.rotation.set(0, 0, 0);
    torsoPivot.rotation.set(0, 0, 0);
    headPivot.rotation.set(0, 0, 0);
    leftArm.armPivot.rotation.set(0, 0, 0);
    rightArm.armPivot.rotation.set(0, 0, 0);
    leftArm.elbowPivot.rotation.set(0, 0, 0);
    rightArm.elbowPivot.rotation.set(0, 0, 0);
    leftLeg.legPivot.rotation.set(0, 0, 0);
    rightLeg.legPivot.rotation.set(0, 0, 0);
    leftLeg.kneePivot.rotation.set(0, 0, 0);
    rightLeg.kneePivot.rotation.set(0, 0, 0);

    if (pose === 'walk' || pose === 'carry_bags' || pose === 'cross_unaware') {
      const s = Math.sin(phase);
      const stride = pose === 'cross_unaware' ? 0.56 : 0.46;
      leftLeg.legPivot.rotation.x = s * stride;
      rightLeg.legPivot.rotation.x = -s * stride;
      leftLeg.kneePivot.rotation.x = Math.max(0.05, s * 0.52);
      rightLeg.kneePivot.rotation.x = Math.max(0.05, -s * 0.52);

      bodyRoot.position.y = Math.abs(Math.cos(phase)) * 0.038;
      torsoPivot.rotation.y = s * 0.07;

      if (pose === 'carry_bags') {
        leftArm.armPivot.rotation.x = -s * 0.42;
        leftArm.elbowPivot.rotation.x = -0.28;
        rightArm.armPivot.rotation.x = 0.08;
        rightArm.armPivot.rotation.z = 0.14;
        rightArm.elbowPivot.rotation.x = -0.22;
      } else if (pose === 'cross_unaware') {
        // Distracted / looking down at phone or straight ahead
        leftArm.armPivot.rotation.x = -s * 0.38;
        leftArm.elbowPivot.rotation.x = -0.25;
        rightArm.armPivot.rotation.x = -0.58;
        rightArm.elbowPivot.rotation.x = -0.95;
        headPivot.rotation.x = 0.24;
      } else {
        leftArm.armPivot.rotation.x = -s * 0.45;
        rightArm.armPivot.rotation.x = s * 0.45;
        leftArm.elbowPivot.rotation.x = -0.25 - Math.max(0, -s) * 0.25;
        rightArm.elbowPivot.rotation.x = -0.25 - Math.max(0, s) * 0.25;
      }
      return;
    }

    if (pose === 'run') {
      const s = Math.sin(phase);
      torsoPivot.rotation.x = 0.22;
      bodyRoot.position.y = Math.abs(Math.cos(phase)) * 0.085;

      leftLeg.legPivot.rotation.x = s * 0.88;
      rightLeg.legPivot.rotation.x = -s * 0.88;
      leftLeg.kneePivot.rotation.x = Math.max(0.15, s * 0.95 + 0.35);
      rightLeg.kneePivot.rotation.x = Math.max(0.15, -s * 0.95 + 0.35);

      // Chasing anger: raised shaking arms + sprint pump
      leftArm.armPivot.rotation.x = -1.65 + s * 0.45;
      rightArm.armPivot.rotation.x = -1.85 - s * 0.45;
      leftArm.elbowPivot.rotation.x = -0.95;
      rightArm.elbowPivot.rotation.x = -1.05;
      return;
    }

    if (pose === 'wave') {
      bodyRoot.position.y = Math.abs(Math.sin(phase * 0.5)) * 0.03;
      leftArm.armPivot.rotation.z = -0.14;
      leftArm.elbowPivot.rotation.x = -0.2;
      rightArm.armPivot.rotation.x = -2.35;
      rightArm.armPivot.rotation.z = 0.35 + Math.sin(phase) * 0.28;
      rightArm.elbowPivot.rotation.x = -0.45 + Math.cos(phase) * 0.32;
      headPivot.rotation.y = Math.sin(phase * 0.4) * 0.18;
      return;
    }

    if (pose === 'argue') {
      const g = Math.sin(phase);
      const g2 = Math.cos(phase * 1.35);
      torsoPivot.rotation.x = 0.14 + g * 0.06;
      headPivot.rotation.y = g2 * 0.24;
      headPivot.rotation.x = Math.abs(g) * 0.12;
      leftArm.armPivot.rotation.x = -0.85 + g * 0.35;
      leftArm.armPivot.rotation.z = -0.22;
      leftArm.elbowPivot.rotation.x = -1.05 + g2 * 0.35;
      rightArm.armPivot.rotation.x = -0.95 - g * 0.42;
      rightArm.armPivot.rotation.z = 0.24;
      rightArm.elbowPivot.rotation.x = -1.12 - g * 0.35;
      return;
    }

    if (pose === 'sit_tea_stall') {
      // Lower body so hips rest cleanly on sidewalk bench (~0.42m high)
      bodyRoot.position.y = -0.32 * heightScale;
      leftLeg.legPivot.rotation.x = -1.48;
      rightLeg.legPivot.rotation.x = -1.48;
      leftLeg.kneePivot.rotation.x = 1.48;
      rightLeg.kneePivot.rotation.x = 1.48;
      torsoPivot.rotation.x = 0.10;
      leftArm.armPivot.rotation.x = -0.45;
      leftArm.elbowPivot.rotation.x = -0.75;
      // Periodic tea-sipping motion on right arm
      const sip = Math.max(0, Math.sin(phase * 0.45));
      rightArm.armPivot.rotation.x = -0.55 - sip * 0.55;
      rightArm.elbowPivot.rotation.x = -1.05 - sip * 0.65;
      headPivot.rotation.y = Math.sin(phase * 0.3) * 0.15;
      return;
    }

    if (pose === 'jump_back') {
      const arc = Math.sin(Math.min(1, aux) * Math.PI);
      bodyRoot.position.y = arc * 0.48;
      torsoPivot.rotation.x = -0.24;
      leftLeg.legPivot.rotation.x = -0.45 * arc;
      rightLeg.legPivot.rotation.x = -0.35 * arc;
      leftLeg.kneePivot.rotation.x = 0.72 * arc;
      rightLeg.kneePivot.rotation.x = 0.65 * arc;
      leftArm.armPivot.rotation.x = -1.95;
      rightArm.armPivot.rotation.x = -1.95;
      leftArm.armPivot.rotation.z = -0.45;
      rightArm.armPivot.rotation.z = 0.45;
      leftArm.elbowPivot.rotation.x = -0.65;
      rightArm.elbowPivot.rotation.x = -0.65;
      return;
    }

    // 'fall' — stumble and sprawl onto the ground (aux 0..1 progress)
    const p = THREE.MathUtils.clamp(aux, 0, 1);
    const drop = Math.min(1, p * 2.2);
    bodyRoot.position.y = (0.14 - drop * 0.62) * heightScale;
    bodyRoot.rotation.x = -drop * 1.45;
    bodyRoot.rotation.z = Math.sin(p * 6) * 0.18;
    leftArm.armPivot.rotation.x = -1.2;
    leftArm.armPivot.rotation.z = -0.55;
    rightArm.armPivot.rotation.x = -0.8;
    rightArm.armPivot.rotation.z = 0.65;
    leftLeg.kneePivot.rotation.x = 0.5;
    rightLeg.kneePivot.rotation.x = 0.85;
  };

  return {
    group,
    detailedGroup,
    simpleGroup,
    bodyRoot,
    torsoPivot,
    headPivot,
    leftArmPivot: leftArm.armPivot,
    leftElbowPivot: leftArm.elbowPivot,
    rightArmPivot: rightArm.armPivot,
    rightElbowPivot: rightArm.elbowPivot,
    leftLegPivot: leftLeg.legPivot,
    leftKneePivot: leftLeg.kneePivot,
    rightLegPivot: rightLeg.legPivot,
    rightKneePivot: rightLeg.kneePivot,
    alertBadge,
    speechBubble,
    style,
    setDetailed,
    showSpeech,
    hideSpeech,
    applyPose,
  };
}
