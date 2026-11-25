import * as THREE from 'three';

const FONT_STACK = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif";

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
  pixelated = false
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
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

export function createRoadTexture(maxAnisotropy: number, withZebra = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Weathered light-medium grey Bangladeshi urban asphalt (matching reference screenshot)
  ctx.fillStyle = '#a4aab2';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle aggregate speckles
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 148 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Dark grey rectangular bitumen repair patches (like reference screenshot)
  const patches = [
    [46, 42, 48, 56],
    [164, 124, 62, 44],
    [338, 82, 52, 66],
    [408, 232, 56, 48],
    [76, 306, 64, 42],
    [296, 354, 48, 56],
    [184, 424, 46, 38],
    [354, 434, 50, 42],
  ];
  for (const [px, py, pw, ph] of patches) {
    ctx.fillStyle = '#6c737d';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#525861';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);
  }

  // Thin jagged dark asphalt cracks
  ctx.strokeStyle = '#424750';
  ctx.lineWidth = 2.2;
  const cracks = [
    [[64, 180], [78, 198], [72, 218], [90, 232]],
    [[356, 210], [372, 224], [364, 244], [380, 260]],
    [[146, 365], [160, 378], [154, 396]],
    [[416, 420], [430, 434], [426, 456]],
    [[210, 56], [224, 74], [216, 94]],
  ];
  for (const line of cracks) {
    ctx.beginPath();
    ctx.moveTo(line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) {
      ctx.lineTo(line[i][0], line[i][1]);
    }
    ctx.stroke();
  }

  // Dashed white lane dividers (2 lanes left, 2 lanes right)
  ctx.fillStyle = '#f8fafc';
  for (let y = 16; y < 512; y += 88) {
    ctx.fillRect(126, y, 9, 46);
    ctx.fillRect(377, y, 9, 46);
  }

  // Bold white zebra crossing across intersection chunks
  if (withZebra) {
    ctx.fillStyle = '#f8fafc';
    for (let x = 22; x < 490; x += 34) {
      if (x > 228 && x < 284) continue;
      ctx.fillRect(x, 382, 21, 98);
    }
  }

  return finalizeTexture(canvas, maxAnisotropy, 1, withZebra ? 1 : 2);
}

export function createSidewalkTexture(maxAnisotropy: number, side: -1 | 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Terracotta interlocking brick sidewalk base with crisp mortar
  ctx.fillStyle = '#8b4d3f';
  ctx.fillRect(0, 0, 256, 512);

  // Brick tile pattern
  const brickH = 22;
  const brickW = 38;
  for (let row = 0; row < 512 / brickH + 1; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < 256 / brickW + 1; col++) {
      const shade = ((row * 7 + col * 13) % 5) - 2;
      const r = 184 + shade * 7;
      const g = 112 + shade * 5;
      const b = 96 + shade * 4;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * brickW + offset + 2, row * brickH + 2, brickW - 3, brickH - 3);
    }
  }

  // Black & Yellow striped concrete curb on the road-facing edge
  const curbX = side === -1 ? 222 : 0;
  for (let y = 0; y < 512; y += 32) {
    ctx.fillStyle = (y / 32) % 2 === 0 ? '#facc15' : '#18181b';
    ctx.fillRect(curbX, y, 34, 32);
  }
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(side === -1 ? 218 : 34, 0, 4, 512);

  return finalizeTexture(canvas, maxAnisotropy, 1, 3, true);
}

export function createMedianCurbTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < 512; y += 32) {
    ctx.fillStyle = (y / 32) % 2 === 0 ? '#facc15' : '#18181b';
    ctx.fillRect(0, y, 64, 32);
  }
  return finalizeTexture(canvas, maxAnisotropy, 1, 4, true);
}

export function createMedianTopTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Concrete / soil median center bed
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(0, 0, 128, 512);
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 3;
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(108, y);
    ctx.stroke();
  }

  // Crisp yellow-and-black curb border teeth along both edges of median top (matching screenshot!)
  for (let y = 0; y < 512; y += 32) {
    const col = (y / 32) % 2 === 0 ? '#facc15' : '#18181b';
    ctx.fillStyle = col;
    ctx.fillRect(0, y, 22, 32);
    ctx.fillRect(106, y, 22, 32);
  }
  return finalizeTexture(canvas, maxAnisotropy, 1, 4, true);
}

export function createBuildingFacadeTexture(
  baseHex: string,
  style: 'brick' | 'concrete' | 'louver' | 'modern',
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 512);

  if (style === 'brick') {
    ctx.fillStyle = 'rgba(120, 40, 25, 0.18)';
    for (let y = 0; y < 440; y += 14) {
      ctx.fillRect(0, y, 256, 2);
      const off = ((y / 14) % 2) * 16;
      for (let x = off; x < 256; x += 32) {
        ctx.fillRect(x, y, 2, 14);
      }
    }
  } else if (style === 'louver') {
    // Iconic vertical green/white louver slats seen on right side of reference screenshot
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, 256, 440);
    ctx.fillStyle = '#16a34a';
    for (let x = 6; x < 256; x += 16) {
      ctx.fillRect(x, 0, 9, 430);
    }
  }

  // Upper floor windows grid
  for (let row = 0; row < 5; row++) {
    const wy = 44 + row * 78;
    for (let col = 0; col < 4; col++) {
      const wx = 20 + col * 58;
      // Window frame
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(wx - 2, wy - 2, 40, 46);
      // Glass pane (mix of dark interior & subtle lit reflection)
      const lit = (row * 3 + col) % 5 === 0;
      ctx.fillStyle = lit ? '#bae6fd' : style === 'modern' ? '#0f172a' : '#1e293b';
      ctx.fillRect(wx, wy, 36, 42);
      // Window cross-bar
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(wx + 17, wy, 2, 42);
      ctx.fillRect(wx, wy + 20, 36, 2);
    }
  }

  // Ground-floor rolling shop shutters
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 428, 256, 84);
  for (let s = 0; s < 3; s++) {
    const sx = 12 + s * 80;
    ctx.fillStyle = s === 1 ? '#1e293b' : '#94a3b8';
    ctx.fillRect(sx, 438, 68, 74);
    ctx.fillStyle = '#64748b';
    for (let ly = 444; ly < 510; ly += 8) {
      ctx.fillRect(sx + 2, ly, 64, 2);
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
  maxAnisotropy: number
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

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 40px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shopName, 256, 66);

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
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = fgHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 148);

  ctx.fillStyle = fgHex;
  ctx.font = `700 24px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 82);

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
