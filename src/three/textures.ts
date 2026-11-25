import * as THREE from 'three';

const FONT_STACK = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif";

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
  pixelated = false,
  isDataMap = false
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (!isDataMap) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = Math.min(8, maxAnisotropy || 1);
  if (pixelated) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
  }
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RoadTextureSet {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

export function createRoadTextureSet(maxAnisotropy: number, withZebra = false): RoadTextureSet {
  const S = 1024;
  const DS = 512;
  const rng = makeRng(withZebra ? 90211 : 48123);

  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = DS;
  roughCanvas.height = DS;
  const rctx = roughCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = DS;
  bumpCanvas.height = DS;
  const bctx = bumpCanvas.getContext('2d')!;

  // 1. Dark worn asphalt base
  ctx.fillStyle = '#2d3138';
  ctx.fillRect(0, 0, S, S);

  // Roughness base (~0.88 dry worn asphalt) & bump neutral mid-grey
  rctx.fillStyle = '#dfdfdf';
  rctx.fillRect(0, 0, DS, DS);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, DS, DS);

  // Broad worn asphalt blotches
  for (let i = 0; i < 42; i++) {
    const bx = rng() * S;
    const by = rng() * S;
    const rx = 45 + rng() * 110;
    const ry = 60 + rng() * 140;
    const tone = rng() > 0.5 ? 'rgba(58, 63, 72, 0.24)' : 'rgba(28, 31, 36, 0.28)';
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.ellipse(bx, by, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine stone aggregate grain
  for (let i = 0; i < 6500; i++) {
    const x = rng() * S;
    const y = rng() * S;
    const v = 34 + Math.floor(rng() * 34);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    const sz = rng() > 0.8 ? 3 : 2;
    ctx.fillRect(x, y, sz, sz);

    if (i % 2 === 0) {
      const bv = 108 + Math.floor(rng() * 44);
      bctx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bctx.fillRect(x * 0.5, y * 0.5, 1.5, 1.5);
    }
  }

  // 2. Longitudinal worn tire marks along all 4 lanes
  const wheelTracks = [110, 190, 326, 406, 616, 698, 834, 914];
  for (const tx of wheelTracks) {
    const grad = ctx.createLinearGradient(tx - 24, 0, tx + 24, 0);
    grad.addColorStop(0, 'rgba(18, 20, 24, 0)');
    grad.addColorStop(0.5, 'rgba(17, 19, 23, 0.42)');
    grad.addColorStop(1, 'rgba(18, 20, 24, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(tx - 24, 0, 48, S);

    // Subtle rubber streaks inside wheel track
    ctx.strokeStyle = 'rgba(12, 14, 18, 0.35)';
    ctx.lineWidth = 4;
    for (let s = 0; s < 5; s++) {
      const sx = tx + (rng() - 0.5) * 14;
      const sy = rng() * S;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rng() - 0.5) * 4, sy + 80 + rng() * 140);
      ctx.stroke();
    }

    // Tire tracks are slightly polished (lower roughness)
    rctx.fillStyle = 'rgba(170, 170, 170, 0.45)';
    rctx.fillRect((tx - 16) * 0.5, 0, 16, DS);
  }

  // 3. Dark bitumen repair patches with sealed tar edges
  const patches = [
    [94, 88, 96, 114],
    [332, 242, 126, 86],
    [668, 164, 108, 134],
    [814, 464, 114, 94],
    [152, 612, 132, 84],
    [594, 708, 96, 112],
    [364, 846, 98, 78],
    [712, 868, 104, 84],
  ];
  for (const [px, py, pw, ph] of patches) {
    ctx.fillStyle = '#1f2329';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#111317';
    ctx.lineWidth = 5;
    ctx.strokeRect(px, py, pw, ph);

    rctx.fillStyle = '#b4b4b4';
    rctx.fillRect(px * 0.5, py * 0.5, pw * 0.5, ph * 0.5);
    bctx.fillStyle = '#9c9c9c';
    bctx.fillRect(px * 0.5, py * 0.5, pw * 0.5, ph * 0.5);
  }

  // 4. Branching asphalt cracks
  const crackSeeds = [
    [140, 355],
    [712, 415],
    [296, 735],
    [836, 840],
    [418, 120],
    [612, 540],
    [190, 910],
  ];
  for (const [sx, sy] of crackSeeds) {
    let cx = sx;
    let cy = sy;
    ctx.strokeStyle = '#111317';
    ctx.lineWidth = 3.2;
    bctx.strokeStyle = '#242424';
    bctx.lineWidth = 2.2;
    ctx.beginPath();
    bctx.beginPath();
    ctx.moveTo(cx, cy);
    bctx.moveTo(cx * 0.5, cy * 0.5);
    for (let step = 0; step < 6; step++) {
      cx += (rng() - 0.5) * 44;
      cy += 18 + rng() * 28;
      ctx.lineTo(cx, cy);
      bctx.lineTo(cx * 0.5, cy * 0.5);
      if (step === 2 || step === 4) {
        const bx = cx + (rng() - 0.5) * 48;
        const by = cy + 16 + rng() * 24;
        ctx.moveTo(cx, cy);
        ctx.lineTo(bx, by);
        ctx.moveTo(cx, cy);
        bctx.moveTo(cx * 0.5, cy * 0.5);
        bctx.lineTo(bx * 0.5, by * 0.5);
        bctx.moveTo(cx * 0.5, cy * 0.5);
      }
    }
    ctx.stroke();
    bctx.stroke();
  }

  // 5. Faded white lane dashes & double yellow center line
  const drawWeatheredRect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    // Scuff asphalt grit back through the paint
    for (let k = 0; k < 22; k++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(42, 46, 54, 0.55)' : 'rgba(25, 28, 33, 0.45)';
      ctx.fillRect(x + rng() * w, y + rng() * h, 3 + rng() * 5, 3 + rng() * 8);
    }
  };

  // Double yellow center line
  for (let y = 0; y < S; y += 64) {
    drawWeatheredRect(492, y, 13, 62, 'rgba(234, 179, 8, 0.86)');
    drawWeatheredRect(519, y, 13, 62, 'rgba(234, 179, 8, 0.86)');
  }

  // Faded white lane dashes
  for (let y = 26; y < S; y += 176) {
    drawWeatheredRect(248, y, 16, 90, 'rgba(226, 232, 240, 0.68)');
    drawWeatheredRect(760, y, 16, 90, 'rgba(226, 232, 240, 0.68)');
  }

  // Bold weathered zebra crossing across intersection chunks
  if (withZebra) {
    for (let x = 42; x < 982; x += 68) {
      if (x > 448 && x < 576) continue;
      drawWeatheredRect(x, 760, 42, 198, 'rgba(241, 245, 249, 0.78)');
    }
  }

  // 6. Cast-iron Manhole Covers
  const manholes = [
    [195, 290, 26],
    [825, 580, 26],
    [640, 210, 24],
  ];
  for (const [mx, my, mr] of manholes) {
    // Dark recessed collar
    ctx.fillStyle = '#15181c';
    ctx.beginPath();
    ctx.arc(mx, my, mr + 5, 0, Math.PI * 2);
    ctx.fill();

    // Rusty iron lid
    ctx.fillStyle = '#3f3b37';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(mx, my, mr - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Grate cross-ribs
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2.5;
    for (let g = -mr + 8; g <= mr - 8; g += 8) {
      ctx.beginPath();
      ctx.moveTo(mx + g, my - mr * 0.58);
      ctx.lineTo(mx + g, my + mr * 0.58);
      ctx.stroke();
    }

    rctx.fillStyle = '#7a7a7a';
    rctx.beginPath();
    rctx.arc(mx * 0.5, my * 0.5, (mr + 3) * 0.5, 0, Math.PI * 2);
    rctx.fill();

    bctx.fillStyle = '#bdbdbd';
    bctx.beginPath();
    bctx.arc(mx * 0.5, my * 0.5, mr * 0.5, 0, Math.PI * 2);
    bctx.fill();
  }

  // 7. Potholes (exposed gravel collar + dark sunken center)
  const potholes = [
    [390, 480, 32, 22],
    [860, 290, 28, 20],
    [130, 740, 34, 24],
    [620, 880, 26, 18],
  ];
  for (const [hx, hy, rx, ry] of potholes) {
    // Cracked gravel halo
    ctx.fillStyle = '#524940';
    ctx.beginPath();
    ctx.ellipse(hx, hy, rx + 7, ry + 6, rng() * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Sunken dark shadow pit
    ctx.fillStyle = '#14161a';
    ctx.beginPath();
    ctx.ellipse(hx, hy, rx, ry, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Exposed pebbles inside pit
    for (let p = 0; p < 16; p++) {
      ctx.fillStyle = rng() > 0.5 ? '#57534e' : '#3f3f46';
      ctx.fillRect(hx + (rng() - 0.5) * rx * 1.4, hy + (rng() - 0.5) * ry * 1.4, 3, 3);
    }

    bctx.fillStyle = '#161616';
    bctx.beginPath();
    bctx.ellipse(hx * 0.5, hy * 0.5, rx * 0.5, ry * 0.5, 0.2, 0, Math.PI * 2);
    bctx.fill();
  }

  // 8. Puddle Patches (glossy smooth roughness so sky/environment reflects!)
  const puddles = [
    [165, 455, 58, 38],
    [685, 360, 64, 44],
    [855, 675, 52, 34],
    [355, 680, 48, 30],
    [760, 125, 44, 28],
  ];
  for (const [wx, wy, rx, ry] of puddles) {
    // Subtle dark wet water tint & rim
    const wgrad = ctx.createRadialGradient(wx, wy, rx * 0.2, wx, wy, Math.max(rx, ry));
    wgrad.addColorStop(0, 'rgba(20, 26, 36, 0.58)');
    wgrad.addColorStop(0.75, 'rgba(28, 34, 44, 0.45)');
    wgrad.addColorStop(1, 'rgba(30, 35, 42, 0)');
    ctx.fillStyle = wgrad;
    ctx.beginPath();
    ctx.ellipse(wx, wy, rx + 8, ry + 6, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Mirror-like low roughness in puddle center for sky reflection!
    const rgrad = rctx.createRadialGradient(wx * 0.5, wy * 0.5, rx * 0.12, wx * 0.5, wy * 0.5, Math.max(rx, ry) * 0.52);
    rgrad.addColorStop(0, 'rgba(12, 12, 12, 1)');
    rgrad.addColorStop(0.7, 'rgba(26, 26, 26, 0.92)');
    rgrad.addColorStop(1, 'rgba(223, 223, 223, 0)');
    rctx.fillStyle = rgrad;
    rctx.beginPath();
    rctx.ellipse(wx * 0.5, wy * 0.5, rx * 0.52, ry * 0.52, 0.35, 0, Math.PI * 2);
    rctx.fill();

    // Smooth flat water surface in bumpMap
    bctx.fillStyle = 'rgba(128, 128, 128, 0.9)';
    bctx.beginPath();
    bctx.ellipse(wx * 0.5, wy * 0.5, rx * 0.46, ry * 0.46, 0.35, 0, Math.PI * 2);
    bctx.fill();
  }

  const repeatY = withZebra ? 1 : 2;
  return {
    map: finalizeTexture(canvas, maxAnisotropy, 1, repeatY, false, false),
    roughnessMap: finalizeTexture(roughCanvas, maxAnisotropy, 1, repeatY, false, true),
    bumpMap: finalizeTexture(bumpCanvas, maxAnisotropy, 1, repeatY, false, true),
  };
}

export function createRoadTexture(maxAnisotropy: number, withZebra = false): THREE.CanvasTexture {
  return createRoadTextureSet(maxAnisotropy, withZebra).map;
}

export function createSidewalkTexture(maxAnisotropy: number, side: -1 | 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const rng = makeRng(side === -1 ? 11337 : 22449);

  // Dark recessed mortar & damp soil bed between footpath bricks
  ctx.fillStyle = '#3b241d';
  ctx.fillRect(0, 0, 512, 512);

  // Red-brown uneven clay brick tile pattern with chipped edges & cracks
  const brickH = 28;
  const brickW = 54;
  for (let row = 0; row < 512 / brickH + 1; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < 512 / brickW + 1; col++) {
      const jitterX = (rng() - 0.5) * 2.5;
      const jitterY = (rng() - 0.5) * 2.5;
      const tone = (rng() - 0.5) * 28;
      const r = Math.max(92, Math.min(168, Math.round(138 + tone)));
      const g = Math.max(42, Math.min(86, Math.round(64 + tone * 0.55)));
      const b = Math.max(30, Math.min(72, Math.round(48 + tone * 0.45)));

      const bx = col * brickW + offset + 3 + jitterX;
      const by = row * brickH + 3 + jitterY;
      const bw = brickW - 5;
      const bh = brickH - 5;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(bx, by, bw, bh);

      // Uneven tile top-left lip highlight & bottom-right shadow
      ctx.fillStyle = 'rgba(255, 220, 195, 0.14)';
      ctx.fillRect(bx, by, bw, 2.5);
      ctx.fillStyle = 'rgba(20, 10, 8, 0.28)';
      ctx.fillRect(bx, by + bh - 3, bw, 3);

      // Occasional cracked or sunken brick
      if (rng() > 0.78) {
        ctx.strokeStyle = 'rgba(32, 18, 14, 0.6)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.25, by);
        ctx.lineTo(bx + bw * 0.48, by + bh * 0.55);
        ctx.lineTo(bx + bw * 0.65, by + bh);
        ctx.stroke();
      }
    }
  }

  // Moss/dirt grime near road-facing edge & outer wall edge
  const edgeX = side === -1 ? 450 : 0;
  const grimeGrad = ctx.createLinearGradient(side === -1 ? 410 : 102, 0, side === -1 ? 512 : 0, 0);
  grimeGrad.addColorStop(0, 'rgba(30, 26, 22, 0)');
  grimeGrad.addColorStop(1, 'rgba(28, 25, 22, 0.42)');
  ctx.fillStyle = grimeGrad;
  ctx.fillRect(side === -1 ? 410 : 0, 0, 102, 512);

  // Weeds sprouting in tile gaps and along the curb joint
  const drawWeedTuft = (wx: number, wy: number, scale = 1) => {
    const blades = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < blades; i++) {
      const ang = -Math.PI * 0.85 + (i / Math.max(1, blades - 1)) * Math.PI * 0.7;
      const len = (7 + rng() * 9) * scale;
      ctx.strokeStyle = rng() > 0.4 ? '#4d7c0f' : '#65a30d';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(ang) * len, wy + Math.sin(ang) * len);
      ctx.stroke();
    }
  };

  for (let i = 0; i < 36; i++) {
    const row = Math.floor(rng() * 18);
    const wy = row * brickH + 1;
    const wx = 32 + rng() * 448;
    drawWeedTuft(wx, wy, 0.9 + rng() * 0.45);
  }

  // Dense tufts along curb gutter seam
  for (let y = 18; y < 512; y += 38) {
    if (rng() > 0.35) {
      drawWeedTuft(side === -1 ? 464 : 46, y + rng() * 12, 1.15);
    }
  }

  // Subtle black & yellow curb border accent strip on road edge
  const curbStripX = side === -1 ? 476 : 0;
  for (let y = 0; y < 512; y += 32) {
    ctx.fillStyle = (y / 32) % 2 === 0 ? '#eab308' : '#18181b';
    ctx.fillRect(curbStripX, y, 36, 32);
  }
  ctx.fillStyle = 'rgba(20, 20, 20, 0.5)';
  ctx.fillRect(side === -1 ? 472 : 36, 0, 4, 512);
  // keep edgeX used
  void edgeX;

  return finalizeTexture(canvas, maxAnisotropy, 1, 3, false);
}

export function createMedianCurbTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const rng = makeRng(7723);

  for (let y = 0; y < 512; y += 32) {
    ctx.fillStyle = (y / 32) % 2 === 0 ? '#eab308' : '#18181b';
    ctx.fillRect(0, y, 64, 32);
  }
  // Road dirt & tire scuff weathering at curb base
  const dirt = ctx.createLinearGradient(0, 0, 64, 0);
  dirt.addColorStop(0, 'rgba(28, 25, 23, 0.12)');
  dirt.addColorStop(1, 'rgba(28, 25, 23, 0.35)');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 0, 64, 512);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = 'rgba(24, 24, 27, 0.35)';
    ctx.fillRect(rng() * 64, rng() * 512, 3, 2);
  }
  return finalizeTexture(canvas, maxAnisotropy, 1, 4, true);
}

export function createMedianTopTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Concrete / soil median center bed
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(0, 0, 128, 512);
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 3;
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(108, y);
    ctx.stroke();
  }

  // Yellow-and-black curb border teeth along both edges of median top
  for (let y = 0; y < 512; y += 32) {
    const col = (y / 32) % 2 === 0 ? '#eab308' : '#18181b';
    ctx.fillStyle = col;
    ctx.fillRect(0, y, 22, 32);
    ctx.fillRect(106, y, 22, 32);
  }
  return finalizeTexture(canvas, maxAnisotropy, 1, 4, true);
}

export function createLightGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.22, 'rgba(255, 236, 179, 0.72)');
  grad.addColorStop(0.52, 'rgba(251, 191, 36, 0.24)');
  grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createBuildingFacadeTexture(
  baseHex: string,
  style: 'brick' | 'concrete' | 'louver' | 'modern',
  maxAnisotropy: number,
  floors = 6,
  seed = 1
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const rng = makeRng(seed * 4099 + floors * 131);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 512);

  if (style === 'brick') {
    ctx.fillStyle = 'rgba(115, 38, 22, 0.24)';
    for (let y = 0; y < 434; y += 12) {
      ctx.fillRect(0, y, 256, 2);
      const off = ((y / 12) % 2) * 16;
      for (let x = off; x < 256; x += 32) {
        ctx.fillRect(x, y, 2, 12);
      }
    }
  } else if (style === 'louver') {
    ctx.fillStyle = '#dce4ec';
    ctx.fillRect(0, 0, 256, 434);
    ctx.fillStyle = seed % 2 === 0 ? '#15803d' : '#0369a1';
    for (let x = 6; x < 256; x += 15) {
      ctx.fillRect(x, 0, 8, 430);
    }
  } else if (style === 'modern') {
    // Subtle vertical concrete/glass bands
    ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
    for (let x = 16; x < 256; x += 62) {
      ctx.fillRect(x, 0, 44, 432);
    }
  }

  // Monsoon water stains & damp streaks dripping down from parapet & ledges
  for (let i = 0; i < 16; i++) {
    const sx = rng() * 246;
    const sy = rng() < 0.45 ? 0 : 30 + rng() * 280;
    const sw = 8 + rng() * 22;
    const sh = 42 + rng() * 140;
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    grad.addColorStop(0, 'rgba(34, 30, 24, 0.42)');
    grad.addColorStop(0.55, 'rgba(48, 44, 34, 0.22)');
    grad.addColorStop(1, 'rgba(48, 44, 34, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, sw, sh);
  }

  // Peeling paint & spalling plaster patches showing raw brick/concrete beneath
  const peelCount = style === 'modern' ? 3 : 8;
  for (let i = 0; i < peelCount; i++) {
    const px = 14 + rng() * 210;
    const py = 18 + rng() * 380;
    const pw = 16 + rng() * 32;
    const ph = 14 + rng() * 28;
    // Curled pale paint lip
    ctx.fillStyle = 'rgba(255, 250, 235, 0.55)';
    ctx.beginPath();
    ctx.ellipse(px + 2, py + 2, pw * 0.56, ph * 0.56, rng() * 0.8, 0, Math.PI * 2);
    ctx.fill();
    // Exposed grey plaster or brick core
    ctx.fillStyle = style === 'brick' || rng() > 0.45 ? '#6b3e30' : '#52525b';
    ctx.beginPath();
    ctx.ellipse(px, py, pw * 0.46, ph * 0.46, rng() * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4-9 upper floors windows grid
  const clampedFloors = Math.max(4, Math.min(9, floors));
  const upperFloors = clampedFloors - 1;
  const upperBandH = 418;
  const floorH = upperBandH / upperFloors;
  const winH = Math.min(40, Math.max(20, floorH * 0.58));
  const cols = 4;

  for (let row = 0; row < upperFloors; row++) {
    const wy = 14 + row * floorH + (floorH - winH) * 0.4;
    // Floor cornice / ledge line
    ctx.fillStyle = 'rgba(30, 41, 59, 0.22)';
    ctx.fillRect(0, 12 + row * floorH, 256, 3);

    for (let col = 0; col < cols; col++) {
      const wx = 18 + col * 58;
      // Rainwater drip smudge directly beneath window sill
      const dripGrad = ctx.createLinearGradient(wx, wy + winH, wx, wy + winH + 18);
      dripGrad.addColorStop(0, 'rgba(30, 27, 24, 0.34)');
      dripGrad.addColorStop(1, 'rgba(30, 27, 24, 0)');
      ctx.fillStyle = dripGrad;
      ctx.fillRect(wx + 2, wy + winH, 32, 18);

      // Frame
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(wx - 2, wy - 2, 38, winH + 4);
      // Glass pane
      const lit = (row * 3 + col + seed) % 5 === 0;
      ctx.fillStyle = lit ? '#bae6fd' : style === 'modern' ? '#0f172a' : '#1e293b';
      ctx.fillRect(wx, wy, 34, winH);
      // Crossbar / grille
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(wx + 16, wy, 2, winH);
      ctx.fillRect(wx, wy + winH * 0.48, 34, 2);
    }
  }

  // Ground-floor rolling shop shutters & dark shop interior band
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 428, 256, 84);
  for (let s = 0; s < 3; s++) {
    const sx = 12 + s * 80;
    const isHalfOpen = (s + seed) % 3 === 1;
    const shutterH = isHalfOpen ? 36 : 74;
    ctx.fillStyle = isHalfOpen ? '#94a3b8' : '#64748b';
    ctx.fillRect(sx, 436, 68, shutterH);
    ctx.fillStyle = '#334155';
    for (let ly = 442; ly < 436 + shutterH; ly += 7) {
      ctx.fillRect(sx + 2, ly, 64, 2);
    }
    if (isHalfOpen) {
      // Warm lit interior glimpse beneath half-raised shutter
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(sx + 4, 474, 60, 34);
    }
  }

  return finalizeTexture(canvas, maxAnisotropy, 1, 1, true);
}

export function createAwningStripeTexture(
  stripeColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  for (let x = 0; x < 256; x += 32) {
    ctx.fillStyle = (x / 32) % 2 === 0 ? stripeColor : '#f8fafc';
    ctx.fillRect(x, 0, 32, 128);
  }
  return finalizeTexture(canvas, maxAnisotropy, 1, 1, true);
}

export function createOverheadSignTexture(
  text: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 512, 140);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 124);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 50px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 72);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.6)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.26)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStickerTexture(
  text: string,
  bgHex: string,
  textHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = textHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 140);

  ctx.fillStyle = textHex;
  ctx.font = `700 54px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 84);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createNumberPlateTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 84);

  ctx.fillStyle = '#fef08a';
  ctx.font = `700 28px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('চট্ট-থ ১১-৪০২৯', 128, 50);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createAreaSignTexture(
  areaName: string,
  tagline: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 12;
  ctx.strokeRect(12, 12, 1000, 232);

  ctx.fillStyle = accentHex;
  ctx.fillRect(24, 24, 976, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('চট্টগ্রাম সিটি কর্পোরেশন • স্বাগতম', 512, 43);

  ctx.fillStyle = '#fef08a';
  ctx.font = `800 78px ${FONT_STACK}`;
  ctx.fillText(areaName, 512, 130);

  ctx.fillStyle = '#ecfdf5';
  ctx.font = `600 30px ${FONT_STACK}`;
  ctx.fillText(tagline, 512, 204);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createShopSignTexture(
  shopName: string,
  bgHex: string,
  maxAnisotropy: number,
  categoryBadge?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  if (categoryBadge) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(14, 14, 118, 28);
    ctx.fillStyle = '#1c1917';
    ctx.font = `800 18px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(categoryBadge, 73, 29);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 36px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shopName, 256, categoryBadge ? 74 : 66);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBillboardTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  fgHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 768, 320);

  ctx.strokeStyle = fgHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 744, 296);

  ctx.fillStyle = fgHex;
  ctx.font = `800 54px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 384, 122);

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 30px ${FONT_STACK}`;
  ctx.fillText(subtitle, 384, 214);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createWallPosterTexture(
  text: string,
  bgHex: string,
  fgHex: string,
  maxAnisotropy: number,
  sub?: string,
  badge?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 192);
  ctx.strokeStyle = fgHex;
  ctx.lineWidth = 7;
  ctx.strokeRect(7, 7, 242, 178);

  if (badge) {
    ctx.fillStyle = fgHex;
    ctx.fillRect(16, 16, 74, 28);
    ctx.fillStyle = bgHex;
    ctx.font = `800 18px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, 53, 31);
  }

  ctx.fillStyle = fgHex;
  ctx.font = `800 28px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, sub ? 88 : 96);

  if (sub) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 15px ${FONT_STACK}`;
    ctx.fillText(sub, 128, 136);
  }

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createHangingBannerTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  fgHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = fgHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);

  // Decorative corner accents
  ctx.fillStyle = fgHex;
  ctx.fillRect(16, 16, 14, 14);
  ctx.fillRect(482, 16, 14, 14);
  ctx.fillRect(16, 130, 14, 14);
  ctx.fillRect(482, 130, 14, 14);

  ctx.fillStyle = fgHex;
  ctx.font = `800 38px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 62);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 21px ${FONT_STACK}`;
  ctx.fillText(subtitle, 256, 114);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createTinRoofTexture(
  baseHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const rng = makeRng(8813);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Corrugated tin ribs
  for (let x = 0; x < 256; x += 14) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x, 0, 5, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x + 7, 0, 5, 256);
  }
  // Rust streaks
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = 'rgba(124, 45, 18, 0.35)';
    ctx.fillRect(rng() * 240, rng() * 220, 10 + rng() * 22, 18 + rng() * 44);
  }
  return finalizeTexture(canvas, maxAnisotropy, 1, 1, true);
}

export function createFootbridgeSignTexture(
  text: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, 768, 140);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 752, 124);

  ctx.fillStyle = '#fef08a';
  ctx.font = `800 44px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 384, 72);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createBusSignTexture(
  maxAnisotropy: number,
  routeText = 'মায়ের দোয়া'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 88);
  ctx.fillStyle = '#fef08a';
  ctx.font = `800 40px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(routeText, 256, 50);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createZonePadTexture(
  type: 'gas' | 'bribe' | 'dropoff' | 'pickup',
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (type === 'gas' || type === 'bribe') {
    const isGas = type === 'gas';
    ctx.clearRect(0, 0, 512, 512);

    // Glowing ring + dashed square outline on asphalt like Screenshot 5
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 235);
    grad.addColorStop(0, isGas ? 'rgba(250, 204, 21, 0.75)' : 'rgba(236, 72, 153, 0.75)');
    grad.addColorStop(0.6, isGas ? 'rgba(250, 204, 21, 0.35)' : 'rgba(236, 72, 153, 0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 256, 195, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = isGas ? '#facc15' : '#f472b6';
    ctx.lineWidth = 8;
    ctx.setLineDash([28, 16]);
    ctx.beginPath();
    ctx.arc(256, 256, 158, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = isGas ? '#1c1917' : '#ffffff';
    ctx.font = `800 54px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isGas ? '⚡ গ্যাস/চার্জ' : '☕ চা-পানি', 256, 224);

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 36px ${FONT_STACK}`;
    ctx.fillText(isGas ? 'দাগে থামেন' : 'ওয়ান্টেড কমান', 256, 300);
  } else if (type === 'dropoff') {
    ctx.fillStyle = 'rgba(6, 182, 212, 0.82)';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#ecfeff';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, 480, 480);

    ctx.fillStyle = '#083344';
    ctx.font = `800 56px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('নামার জায়গা', 256, 200);
    ctx.font = `700 36px ${FONT_STACK}`;
    ctx.fillText('ধীরে থামুন 💵', 256, 295);
  } else {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.82)';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#ecfdf5';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, 480, 480);

    ctx.fillStyle = '#022c22';
    ctx.font = `800 54px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('যাত্রী অপেক্ষায়!', 256, 205);
    ctx.font = `700 34px ${FONT_STACK}`;
    ctx.fillText('কাছে গিয়ে থামুন 👋', 256, 295);
  }

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createStopLineTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 192);

  // Thick white stop bar at the front edge (closer to intersection)
  ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.fillRect(10, 14, 492, 34);

  // Subtle dashed red-amber warning strip behind the bar
  for (let x = 14; x < 496; x += 48) {
    ctx.fillStyle = (x / 48) % 2 === 0 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(250, 204, 21, 0.85)';
    ctx.fillRect(x, 56, 36, 12);
  }

  // Bold Bengali road paint label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `800 44px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('থামুন · STOP', 256, 126);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createSignalSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(0, 0, 384, 128);
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 372, 116);

  ctx.fillStyle = '#991b1b';
  ctx.font = `800 38px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('সিগন্যাল · লাল বাতিতে থামুন', 192, 66);

  return finalizeTexture(canvas, maxAnisotropy);
}

export function createRickshawArtTexture(
  label: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Vibrant rickshaw-art backdrop (pink, gold, emerald floral border)
  ctx.fillStyle = '#fde047';
  ctx.fillRect(0, 0, 384, 160);

  ctx.fillStyle = '#ec4899';
  ctx.fillRect(0, 0, 384, 24);
  ctx.fillRect(0, 136, 384, 24);

  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 364, 140);

  // Decorative rosette flowers on left & right corners
  [44, 340].forEach((cx) => {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, 80, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, 80, 9, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#7f1d1d';
  ctx.font = `800 34px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 192, 82);

  return finalizeTexture(canvas, maxAnisotropy);
}
