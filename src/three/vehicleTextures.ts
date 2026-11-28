import * as THREE from 'three';

const FONT_STACK = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif";

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finalizeTex(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = Math.min(8, maxAnisotropy || 1);
  tex.needsUpdate = true;
  return tex;
}

function createDirtPaintCanvas(
  baseHex: string,
  seed: number,
  options?: {
    stripeHex?: string;
    stripeY?: number;
    stripeH?: number;
    dents?: boolean;
    fade?: boolean;
    routeText?: string;
  }
): HTMLCanvasElement {
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const rng = makeRng(seed);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);

  // Subtle sun-faded chalky blotches
  if (options?.fade) {
    for (let i = 0; i < 18; i++) {
      const fx = rng() * W;
      const fy = rng() * (H * 0.72);
      const r = 24 + rng() * 58;
      const g = ctx.createRadialGradient(fx, fy, 4, fx, fy, r);
      g.addColorStop(0, 'rgba(255, 250, 235, 0.24)');
      g.addColorStop(1, 'rgba(255, 250, 235, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(fx - r, fy - r, r * 2, r * 2);
    }
  }

  // Optional livery stripe
  if (options?.stripeHex) {
    const sy = options.stripeY ?? 116;
    const sh = options.stripeH ?? 28;
    ctx.fillStyle = options.stripeHex;
    ctx.fillRect(0, sy, W, sh);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(0, sy - 4, W, 3);
  }

  // Dents, scrapes & chipped primer patches (for dented local buses & work trucks)
  if (options?.dents) {
    for (let i = 0; i < 14; i++) {
      const dx = 18 + rng() * (W - 36);
      const dy = 40 + rng() * (H - 72);
      const rx = 14 + rng() * 28;
      const ry = 7 + rng() * 14;
      // Dark dent crease + metallic highlight lip
      ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
      ctx.beginPath();
      ctx.ellipse(dx, dy + 2, rx, ry, (rng() - 0.5) * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.beginPath();
      ctx.ellipse(dx, dy - 2, rx * 0.85, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Horizontal side-swipe scratches & rust primer scuffs
    for (let i = 0; i < 12; i++) {
      const sx = rng() * (W - 90);
      const sy = 55 + rng() * 145;
      const len = 30 + rng() * 85;
      ctx.strokeStyle = rng() > 0.45 ? 'rgba(120, 53, 15, 0.48)' : 'rgba(51, 65, 85, 0.45)';
      ctx.lineWidth = 2 + rng() * 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + len, sy + (rng() - 0.5) * 6);
      ctx.stroke();
    }

    // Rivet panel seams
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.lineWidth = 2;
    for (let x = 64; x < W; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
  }

  // Lower rocker mud & road grime gradient + splatters
  const mudGrad = ctx.createLinearGradient(0, H * 0.62, 0, H);
  mudGrad.addColorStop(0, 'rgba(66, 48, 34, 0)');
  mudGrad.addColorStop(0.65, 'rgba(66, 48, 34, 0.26)');
  mudGrad.addColorStop(1, 'rgba(48, 35, 24, 0.58)');
  ctx.fillStyle = mudGrad;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);

  for (let i = 0; i < 95; i++) {
    const mx = rng() * W;
    const my = H * 0.66 + rng() * (H * 0.34);
    const mr = 1.5 + rng() * 4.5;
    ctx.fillStyle = rng() > 0.4 ? 'rgba(68, 49, 32, 0.48)' : 'rgba(39, 34, 30, 0.42)';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  if (options?.routeText) {
    ctx.fillStyle = 'rgba(127, 29, 29, 0.85)';
    ctx.fillRect(110, 74, 292, 34);
    ctx.fillStyle = '#fef08a';
    ctx.font = `800 22px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.routeText, 256, 92);
  }

  return canvas;
}

function createTruckArtTexture(
  bgHex: string,
  accentHex: string,
  slogan: string,
  seed: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const rng = makeRng(seed);

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, W, H);

  // Scalloped truck-art frame border
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 5;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  // Painted geometric triangles / zigzag ribbon top & bottom
  for (let x = 24; x < W - 24; x += 28) {
    ctx.fillStyle = (x / 28) % 2 === 0 ? '#facc15' : '#22c55e';
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x + 14, 42);
    ctx.lineTo(x + 28, 22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = (x / 28) % 2 === 0 ? '#38bdf8' : '#ec4899';
    ctx.beginPath();
    ctx.moveTo(x, H - 22);
    ctx.lineTo(x + 14, H - 42);
    ctx.lineTo(x + 28, H - 22);
    ctx.closePath();
    ctx.fill();
  }

  // Stylized marigold/lotus rosettes on left & right
  [76, W - 76].forEach((cx) => {
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      ctx.fillStyle = p % 2 === 0 ? '#facc15' : '#fb7185';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 20, 128 + Math.sin(a) * 20, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(cx, 128, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, 128, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Bold Bangla truck slogan in center banner
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(128, 86, 256, 84);
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4;
  ctx.strokeRect(132, 90, 248, 76);

  ctx.fillStyle = '#fef08a';
  ctx.font = `800 36px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slogan, 256, 130);

  // Subtle road dirt splatters along bottom edge
  const dirt = ctx.createLinearGradient(0, H * 0.72, 0, H);
  dirt.addColorStop(0, 'rgba(41, 30, 20, 0)');
  dirt.addColorStop(1, 'rgba(41, 30, 20, 0.56)');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, H * 0.72, W, H * 0.28);
  for (let i = 0; i < 45; i++) {
    ctx.fillStyle = 'rgba(54, 38, 26, 0.45)';
    ctx.fillRect(rng() * W, H * 0.78 + rng() * 55, 3, 3);
  }

  return finalizeTex(canvas, maxAnisotropy);
}

function createAmbulanceSideTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, W, H);

  // Crimson & reflective yellow medical rescue bands
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 128, W, 38);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 166, W, 8);

  // Red Cross emblem
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(68, 52, 22, 60);
  ctx.fillRect(49, 71, 60, 22);

  // Bangla Ambulance text
  ctx.fillStyle = '#991b1b';
  ctx.font = `800 38px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('অ্যাম্বুলেন্স · ৯৯৯', 306, 84);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText('জরুরি চিকিৎসাসেবা · চট্টগ্রাম', 256, 148);

  // Subtle lower road grime
  const dirt = ctx.createLinearGradient(0, 205, 0, H);
  dirt.addColorStop(0, 'rgba(50, 42, 34, 0)');
  dirt.addColorStop(1, 'rgba(50, 42, 34, 0.34)');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 205, W, 51);

  return finalizeTex(canvas, maxAnisotropy);
}

function createBanglaPlateTexture(
  plateText: string,
  commercial: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = commercial ? '#14532d' : '#f8fafc';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = commercial ? '#facc15' : '#18181b';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 246, 86);

  ctx.fillStyle = commercial ? '#fef08a' : '#0f172a';
  ctx.font = `800 25px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(plateText, 128, 50);

  return finalizeTex(canvas, maxAnisotropy);
}

function createRickshawBackArtTexture(
  label: string,
  bgHex: string,
  borderHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 384, 160);

  ctx.fillStyle = borderHex;
  ctx.fillRect(0, 0, 384, 22);
  ctx.fillRect(0, 138, 384, 22);

  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 7;
  ctx.strokeRect(10, 10, 364, 140);

  [46, 338].forEach((cx) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#f97316';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 14, 80 + Math.sin(a) * 14, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, 80, 9, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#7f1d1d';
  ctx.font = `800 32px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 192, 82);

  return finalizeTex(canvas, maxAnisotropy);
}

function createDirtMaskOverlayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const rng = makeRng(44921);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);

  // Lower-edge grime & fine weathered dust specks baked into albedo multiplier
  const g = ctx.createLinearGradient(0, S * 0.55, 0, S);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(110,92,76,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, S * 0.55, S, S * 0.45);

  for (let i = 0; i < 240; i++) {
    const x = rng() * S;
    const y = S * 0.45 + rng() * (S * 0.55);
    const r = 1 + rng() * 3.2;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(135, 118, 102, 0.28)' : 'rgba(220, 214, 204, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTex(canvas, maxAnisotropy);
}

export interface VehicleAssetPool {
  maxAnisotropy: number;
  dirtMap: THREE.CanvasTexture;
  tintedGlassMat: THREE.MeshStandardMaterial;
  tireMat: THREE.MeshStandardMaterial;
  alloyRimMat: THREE.MeshStandardMaterial;
  steelRimMat: THREE.MeshStandardMaterial;
  chromeMat: THREE.MeshStandardMaterial;
  bumperDarkMat: THREE.MeshStandardMaterial;
  mirrorGlassMat: THREE.MeshStandardMaterial;
  cngRoofCanvasMat: THREE.MeshStandardMaterial;
  headlightLensMat: THREE.MeshStandardMaterial;
  commercialPlateMats: THREE.MeshBasicMaterial[];
  privatePlateMats: THREE.MeshBasicMaterial[];
  localBusBodyMats: THREE.MeshStandardMaterial[];
  doubleDeckerBodyMat: THREE.MeshStandardMaterial;
  truckArtMats: THREE.MeshStandardMaterial[];
  tempoArtMats: THREE.MeshStandardMaterial[];
  ambulanceSideMat: THREE.MeshStandardMaterial;
  rickshawArtMats: THREE.MeshBasicMaterial[];
}

let cachedPool: VehicleAssetPool | null = null;

export function getVehicleAssetPool(maxAnisotropy: number): VehicleAssetPool {
  if (cachedPool) return cachedPool;

  const dirtMap = createDirtMaskOverlayTexture(maxAnisotropy);

  const tintedGlassMat = new THREE.MeshStandardMaterial({
    color: '#0a1220',
    roughness: 0.08,
    metalness: 0.42,
    envMapIntensity: 1.5,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#17171a',
    roughness: 0.9,
    metalness: 0.04,
  });
  const alloyRimMat = new THREE.MeshStandardMaterial({
    color: '#e4e4e7',
    roughness: 0.22,
    metalness: 0.88,
  });
  const steelRimMat = new THREE.MeshStandardMaterial({
    color: '#9ca3af',
    roughness: 0.42,
    metalness: 0.72,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#f4f4f5',
    roughness: 0.16,
    metalness: 0.92,
  });
  const bumperDarkMat = new THREE.MeshStandardMaterial({
    color: '#1f2937',
    map: dirtMap,
    roughness: 0.72,
    metalness: 0.18,
  });
  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.06,
    metalness: 0.95,
  });
  const cngRoofCanvasMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    map: dirtMap,
    roughness: 0.92,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const headlightLensMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#fde047',
    emissiveIntensity: 1.15,
    roughness: 0.15,
  });

  const commPlates = [
    'চট্ট-থ ১১-৪০২৯',
    'চট্ট-ব ১১-৭৮৫৪',
    'চট্ট-জ ১১-৩২০৬',
    'চট্ট-দ ১১-৯১২৫',
    'চট্ট-ম ১১-৬৪১৮',
    'চট্ট-ট ১১-৫৩৭২',
  ];
  const privPlates = [
    'চট্ট মেট্রো-গ ১৭-৪৮২১',
    'চট্ট মেট্রো-চ ১৩-৬০৯৫',
    'চট্ট মেট্রো-ঘ ১৫-২৩৮৪',
    'চট্ট মেট্রো-হ ১২-৮৭৪৩',
    'চট্ট মেট্রো-ক ১১-৯৫০২',
  ];

  const commercialPlateMats = commPlates.map(
    (txt) => new THREE.MeshBasicMaterial({ map: createBanglaPlateTexture(txt, true, maxAnisotropy) })
  );
  const privatePlateMats = privPlates.map(
    (txt) => new THREE.MeshBasicMaterial({ map: createBanglaPlateTexture(txt, false, maxAnisotropy) })
  );

  const busConfigs = [
    { bg: '#eab308', stripe: '#b91c1c', route: 'মায়ের দোয়া · লোকাল' },
    { bg: '#facc15', stripe: '#dc2626', route: 'আগ্রাবাদ — বহদ্দারহাট' },
    { bg: '#16a34a', stripe: '#facc15', route: 'নিউমার্কেট — কালুরঘাট' },
    { bg: '#0284c7', stripe: '#f59e0b', route: 'সদরঘাট — অলংকার' },
  ];
  const localBusBodyMats = busConfigs.map((cfg, idx) => {
    const tex = finalizeTex(
      createDirtPaintCanvas(cfg.bg, 1001 + idx * 97, {
        stripeHex: cfg.stripe,
        stripeY: 122,
        stripeH: 26,
        dents: true,
        fade: true,
        routeText: cfg.route,
      }),
      maxAnisotropy
    );
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.62,
      metalness: 0.14,
    });
  });

  const doubleDeckerBodyMat = new THREE.MeshStandardMaterial({
    map: finalizeTex(
      createDirtPaintCanvas('#dc2626', 8841, {
        stripeHex: '#f8fafc',
        stripeY: 112,
        stripeH: 24,
        dents: true,
        fade: true,
      }),
      maxAnisotropy
    ),
    roughness: 0.56,
    metalness: 0.18,
  });

  const truckConfigs = [
    { bg: '#ea580c', accent: '#22c55e', slogan: 'মায়ের দোয়া' },
    { bg: '#15803d', accent: '#f97316', slogan: 'আল্লাহ ভরসা' },
    { bg: '#b91c1c', accent: '#38bdf8', slogan: 'নিরাপদ যাত্রা' },
  ];
  const truckArtMats = truckConfigs.map(
    (cfg, idx) =>
      new THREE.MeshStandardMaterial({
        map: createTruckArtTexture(cfg.bg, cfg.accent, cfg.slogan, 5501 + idx * 71, maxAnisotropy),
        roughness: 0.66,
        metalness: 0.12,
      })
  );

  const tempoConfigs = [
    { bg: '#0d9488', stripe: '#facc15', route: 'আগ্রাবাদ — নিউমার্কেট' },
    { bg: '#dc2626', stripe: '#fef08a', route: 'বহদ্দারহাট — জিইসি' },
    { bg: '#2563eb', stripe: '#fb923c', route: 'চকবাজার — পতেঙ্গা' },
    { bg: '#15803d', stripe: '#fde047', route: 'অলংকার — মুরাদপুর' },
  ];
  const tempoArtMats = tempoConfigs.map((cfg, idx) => {
    const tex = finalizeTex(
      createDirtPaintCanvas(cfg.bg, 7301 + idx * 59, {
        stripeHex: cfg.stripe,
        stripeY: 118,
        stripeH: 26,
        dents: true,
        fade: true,
        routeText: cfg.route,
      }),
      maxAnisotropy
    );
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.56,
      metalness: 0.16,
    });
  });

  const ambulanceSideMat = new THREE.MeshStandardMaterial({
    map: createAmbulanceSideTexture(maxAnisotropy),
    roughness: 0.34,
    metalness: 0.22,
  });

  const rickshawSpecs = [
    { label: 'সুপারহিট!', bg: '#fde047', border: '#ec4899' },
    { label: 'হৃদয়ে চট্টগ্রাম', bg: '#67e8f9', border: '#e11d48' },
    { label: 'মায়ের আশীর্বাদ', bg: '#fed7aa', border: '#16a34a' },
    { label: 'রঙিন বাংলা', bg: '#f9a8d4', border: '#1d4ed8' },
    { label: 'স্বপ্নযাত্রা', bg: '#fef08a', border: '#7c3aed' },
  ];
  const rickshawArtMats = rickshawSpecs.map(
    (r) =>
      new THREE.MeshBasicMaterial({
        map: createRickshawBackArtTexture(r.label, r.bg, r.border, maxAnisotropy),
      })
  );

  cachedPool = {
    maxAnisotropy,
    dirtMap,
    tintedGlassMat,
    tireMat,
    alloyRimMat,
    steelRimMat,
    chromeMat,
    bumperDarkMat,
    mirrorGlassMat,
    cngRoofCanvasMat,
    headlightLensMat,
    commercialPlateMats,
    privatePlateMats,
    localBusBodyMats,
    doubleDeckerBodyMat,
    truckArtMats,
    tempoArtMats,
    ambulanceSideMat,
    rickshawArtMats,
  };
  return cachedPool;
}

export function disposeVehicleAssetPool(): void {
  if (!cachedPool) return;
  const p = cachedPool;
  p.dirtMap.dispose();
  p.tintedGlassMat.dispose();
  p.tireMat.dispose();
  p.alloyRimMat.dispose();
  p.steelRimMat.dispose();
  p.chromeMat.dispose();
  p.bumperDarkMat.dispose();
  p.mirrorGlassMat.dispose();
  p.cngRoofCanvasMat.dispose();
  p.headlightLensMat.dispose();

  for (const m of p.commercialPlateMats) {
    m.map?.dispose();
    m.dispose();
  }
  for (const m of p.privatePlateMats) {
    m.map?.dispose();
    m.dispose();
  }
  for (const m of p.localBusBodyMats) {
    m.map?.dispose();
    m.dispose();
  }
  p.doubleDeckerBodyMat.map?.dispose();
  p.doubleDeckerBodyMat.dispose();
  for (const m of p.truckArtMats) {
    m.map?.dispose();
    m.dispose();
  }
  for (const m of p.tempoArtMats) {
    m.map?.dispose();
    m.dispose();
  }
  p.ambulanceSideMat.map?.dispose();
  p.ambulanceSideMat.dispose();
  for (const m of p.rickshawArtMats) {
    m.map?.dispose();
    m.dispose();
  }
  cachedPool = null;
}
