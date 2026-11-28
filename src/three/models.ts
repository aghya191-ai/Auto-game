import * as THREE from 'three';
import { BILLBOARD_ADS, WALL_POSTERS } from '../config/chattogramData';
import type { AreaBuildingStyle, TrafficLightState } from '../types/game';
import {
  createAreaSignTexture,
  createAwningStripeTexture,
  createBillboardTexture,
  createBuildingFacadeTexture,
  createLightGlowTexture,
  createMedianCurbTexture,
  createMedianTopTexture,
  createOverheadSignTexture,
  createShopSignTexture,
  createSignalSignTexture,
  createStopLineTexture,
  createWallPosterTexture,
  createZonePadTexture,
} from './textures';

export {
  createCngModel,
  createVehicleModel,
  createVipConvoyVehicle,
  type CngRig,
  type TrafficModelRig,
} from './vehicleModels';

export {
  createPedestrianModel,
  createTeaStallBench,
  disposePedestrianAssetPool,
  pickRandomPedestrianStyle,
  type PedestrianCreateOptions,
  type PedestrianPose,
  type PedestrianRig,
  type PedestrianStyle,
  type SpeechCategory,
} from './pedestrianModels';

let sharedLightGlowTex: THREE.CanvasTexture | null = null;
function getLightGlowTex(): THREE.CanvasTexture {
  if (!sharedLightGlowTex) {
    sharedLightGlowTex = createLightGlowTexture();
  }
  return sharedLightGlowTex;
}

export interface CockpitRig {
  group: THREE.Group;
  handlebarPivot: THREE.Group;
  ornamentPivot: THREE.Group;
  leftMirrorMat: THREE.MeshBasicMaterial;
  rightMirrorMat: THREE.MeshBasicMaterial;
  updateAppearance: (colorHex: string) => void;
  updateMeter: (speedKmh: number, gas: number, boosting: boolean) => void;
}

function createFlippedCircleGeo(radius: number, segments = 24): THREE.CircleGeometry {
  const geo = new THREE.CircleGeometry(radius, segments);
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setX(i, 1 - uv.getX(i));
  }
  uv.needsUpdate = true;
  return geo;
}

export function createCockpitModel(colorHex: string): CockpitRig {
  const group = new THREE.Group();
  group.visible = false;

  const paintMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.36,
    metalness: 0.22,
  });
  const frameRustMat = new THREE.MeshStandardMaterial({
    color: '#7c3f23',
    roughness: 0.8,
    metalness: 0.12,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.88,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.42,
    metalness: 0.72,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#e4e4e7',
    roughness: 0.2,
    metalness: 0.9,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: '#27272a',
    roughness: 0.9,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: '#9a4b16',
    roughness: 0.74,
  });
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: '#0f766e',
    roughness: 0.85,
  });

  // Low front hood & subtle lower corner body rails (leaving upper 75% road & sky completely unobstructed!)
  const noseCowl = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.58), paintMat);
  noseCowl.position.set(0, 0.82, -1.24);
  group.add(noseCowl);

  // Lower-left & lower-right cockpit cowl posts framing bottom edges like the reference view
  [-1, 1].forEach((side) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.26, 0.36), frameRustMat);
    post.position.set(side * 0.215, 1.03, -0.90);
    post.rotation.z = -side * 0.14;
    const outerWing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.45), paintMat);
    outerWing.position.set(side * 0.38, 0.94, -0.92);
    group.add(post, outerWing);
  });

  // Rear Cabin Frame & Seat (positioned behind camera so forward view is clear, visible on Look Back)
  const rearRoof = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.08, 0.95), roofMat);
  rearRoof.position.set(0, 1.94, 0.88);
  const rearUpper = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.25, 0.08), roofMat);
  rearUpper.position.set(0, 1.82, 1.32);
  const rearBench = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.35, 0.48),
    new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.8 })
  );
  rearBench.position.set(0, 0.72, 0.98);
  group.add(rearRoof, rearUpper, rearBench);

  // Dummy ornamentPivot kept for engine animation compatibility (no windshield obstruction)
  const ornamentPivot = new THREE.Group();
  ornamentPivot.visible = false;
  group.add(ornamentPivot);

  // CNG Steering Handlebar Assembly positioned cleanly in lower-center of Driver View
  const handlebarPivot = new THREE.Group();
  handlebarPivot.position.set(0, 1.11, -0.96);
  handlebarPivot.rotation.x = 0.18;

  // Colorful striped tape rings down the steering column (Bangladeshi street style)
  const bandColors = ['#e2e8f0', '#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ec4899', '#e2e8f0'];
  const bandGeo = new THREE.CylinderGeometry(0.020, 0.021, 0.032, 10);
  bandColors.forEach((hex, idx) => {
    const band = new THREE.Mesh(
      bandGeo,
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5 })
    );
    band.position.y = -0.02 - idx * 0.032;
    handlebarPivot.add(band);
  });

  // Center clamp + live 3D Speedometer / Gas Gauge Pod
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.036, 0.055), chromeMat);
  clamp.position.y = 0.008;
  handlebarPivot.add(clamp);

  const meterHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.042, 0.042, 14),
    darkMetalMat
  );
  meterHousing.rotation.x = Math.PI / 2 - 0.32;
  meterHousing.position.set(0, 0.048, 0.01);
  handlebarPivot.add(meterHousing);

  const meterCanvas = document.createElement('canvas');
  meterCanvas.width = 128;
  meterCanvas.height = 128;
  const meterCtx = meterCanvas.getContext('2d')!;
  const meterTex = new THREE.CanvasTexture(meterCanvas);
  meterTex.colorSpace = THREE.SRGBColorSpace;
  const meterFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.033, 16),
    new THREE.MeshBasicMaterial({ map: meterTex })
  );
  meterFace.position.set(0, 0.055, 0.032);
  meterFace.rotation.x = -0.32;
  handlebarPivot.add(meterFace);

  let lastMeterSpeed = -1;
  let lastMeterGas = -1;
  let lastMeterBoost = false;
  const updateMeter = (speedKmh: number, gas: number, boosting: boolean) => {
    const sRounded = Math.round(speedKmh);
    const gRounded = Math.round(gas);
    if (sRounded === lastMeterSpeed && gRounded === lastMeterGas && boosting === lastMeterBoost) return;
    lastMeterSpeed = sRounded;
    lastMeterGas = gRounded;
    lastMeterBoost = boosting;

    meterCtx.fillStyle = '#09090b';
    meterCtx.beginPath();
    meterCtx.arc(64, 64, 62, 0, Math.PI * 2);
    meterCtx.fill();

    // Outer green/amber ring
    meterCtx.strokeStyle = boosting ? '#f97316' : '#22c55e';
    meterCtx.lineWidth = 8;
    meterCtx.beginPath();
    meterCtx.arc(64, 64, 54, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, sRounded / 120));
    meterCtx.stroke();

    // Digital speed readout
    meterCtx.fillStyle = boosting ? '#fde047' : '#4ade80';
    meterCtx.font = '900 42px sans-serif';
    meterCtx.textAlign = 'center';
    meterCtx.textBaseline = 'middle';
    meterCtx.fillText(String(sRounded), 64, 56);

    // Mini gas bar at bottom of dial
    meterCtx.fillStyle = '#27272a';
    meterCtx.fillRect(30, 86, 68, 12);
    meterCtx.fillStyle = gRounded < 25 ? '#ef4444' : '#facc15';
    meterCtx.fillRect(32, 88, Math.max(4, Math.round(64 * (gRounded / 100))), 8);

    meterTex.needsUpdate = true;
  };
  updateMeter(0, 100, false);

  // Horizontal Handlebar + Grips
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.34, 8), chromeMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.015, 0.015);
  handlebarPivot.add(bar);

  const gripGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.085, 8);
  const leftGrip = new THREE.Mesh(gripGeo, gripMat);
  leftGrip.rotation.z = Math.PI / 2;
  leftGrip.position.set(-0.155, 0.015, 0.02);
  const rightGrip = leftGrip.clone();
  rightGrip.position.x = 0.155;
  handlebarPivot.add(leftGrip, rightGrip);

  // Decorative Yellow/Orange/Red Bead Garland (মালা) draped under the handlebar
  const beadGeo = new THREE.BoxGeometry(0.014, 0.014, 0.014);
  const beadColors = ['#facc15', '#fb923c', '#ef4444', '#fef08a'];
  const beadMats = beadColors.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 })
  );
  for (let i = -6; i <= 6; i++) {
    const t = i / 6;
    const bx = t * 0.115;
    const by = -0.036 + t * t * 0.036;
    const bead = new THREE.Mesh(beadGeo, beadMats[Math.abs(i) % beadMats.length]);
    bead.position.set(bx, by, 0.026);
    bead.rotation.z = Math.PI * 0.25;
    handlebarPivot.add(bead);
  }

  // Left & Right Round Looking Glasses (Side Rear-View Mirrors with live WebGLRenderTarget glass!)
  const leftMirrorMat = new THREE.MeshBasicMaterial({ color: '#bae6fd' });
  const rightMirrorMat = new THREE.MeshBasicMaterial({ color: '#bae6fd' });
  const mirrorGlassGeo = createFlippedCircleGeo(0.046, 22);
  const mirrorBackGeo = new THREE.CylinderGeometry(0.052, 0.048, 0.018, 20);
  const stalkGeo = new THREE.CylinderGeometry(0.0055, 0.0065, 0.135, 6);

  const buildLookingGlass = (side: -1 | 1, glassMat: THREE.MeshBasicMaterial) => {
    const stalk = new THREE.Mesh(stalkGeo, darkMetalMat);
    stalk.position.set(side * 0.112, 0.082, 0.015);
    stalk.rotation.z = -side * 0.24;

    const head = new THREE.Group();
    head.position.set(side * 0.132, 0.155, 0.012);
    head.rotation.y = -side * 0.18;
    head.rotation.x = -0.10;

    const rim = new THREE.Mesh(mirrorBackGeo, darkMetalMat);
    rim.rotation.x = Math.PI / 2;

    const glass = new THREE.Mesh(mirrorGlassGeo, glassMat);
    glass.position.z = 0.011;

    head.add(rim, glass);
    handlebarPivot.add(stalk, head);
  };

  buildLookingGlass(-1, leftMirrorMat);
  buildLookingGlass(1, rightMirrorMat);

  // Driver Forearms & Hands gripping the handlebar
  const makeArmAndHand = (side: -1 | 1) => {
    const armGroup = new THREE.Group();
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.034, 0.048), skinMat);
    hand.position.set(side * 0.155, 0.022, 0.022);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.024, 0.19, 8), skinMat);
    forearm.position.set(side * 0.175, -0.025, 0.11);
    forearm.rotation.x = Math.PI / 2 - 0.35;
    forearm.rotation.z = side * 0.18;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.14, 8), sleeveMat);
    sleeve.position.set(side * 0.195, -0.06, 0.21);
    sleeve.rotation.x = Math.PI / 2 - 0.35;
    sleeve.rotation.z = side * 0.18;
    armGroup.add(hand, forearm, sleeve);
    return armGroup;
  };

  handlebarPivot.add(makeArmAndHand(-1), makeArmAndHand(1));
  group.add(handlebarPivot);

  const updateAppearance = (newColorHex: string) => {
    paintMat.color.set(newColorHex);
  };

  return {
    group,
    handlebarPivot,
    ornamentPivot,
    leftMirrorMat,
    rightMirrorMat,
    updateAppearance,
    updateMeter,
  };
}





export function createRoadDivider(
  length: number,
  maxAnisotropy = 1,
  includeFoliage = true
): THREE.Group {
  const group = new THREE.Group();
  const curbSideMat = new THREE.MeshStandardMaterial({
    map: createMedianCurbTexture(maxAnisotropy),
    roughness: 0.7,
  });
  const topTileMat = new THREE.MeshStandardMaterial({
    map: createMedianTopTexture(maxAnisotropy),
    roughness: 0.78,
  });

  // Black-and-yellow striped concrete median curb with tiled top & curb borders
  const curbBody = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.28, length), [
    curbSideMat,
    curbSideMat,
    topTileMat,
    curbSideMat,
    curbSideMat,
    curbSideMat,
  ]);
  curbBody.position.y = 0.14;
  curbBody.receiveShadow = true;
  curbBody.castShadow = true;
  group.add(curbBody);

  if (includeFoliage) {
    const shrubMat = new THREE.MeshStandardMaterial({ color: '#1b6d20', roughness: 0.85, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#2b7a22', roughness: 0.76, flatShading: true });

    const spacing = 2.4;
    const count = Math.floor(length / spacing);
    for (let i = 0; i < count; i++) {
      const z = -length / 2 + 1.3 + i * spacing;
      if (i % 4 === 1) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.45, 6), trunkMat);
        trunk.position.set(0, 1.4, z);
        trunk.castShadow = true;
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), leafMat);
        crown.position.set(0, 3.05, z);
        crown.scale.set(1.06, 0.94, 1.06);
        crown.castShadow = true;
        group.add(trunk, crown);
      } else {
        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), shrubMat);
        bush.position.set(0, 0.42, z);
        bush.scale.set(1.15, 0.75, 1.15);
        group.add(bush);
      }
    }
  }

  return group;
}

export function createUtilityPoleCluster(withCrossStreetWires: boolean): THREE.Group {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.55, metalness: 0.4 });
  const wireMat = new THREE.LineBasicMaterial({ color: '#111827' });

  [-9.3, 9.3].forEach((px) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 7.6, 7), poleMat);
    pole.position.set(px, 3.8, 0);
    pole.castShadow = true;

    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), poleMat);
    arm1.position.set(px, 7.1, 0);
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), poleMat);
    arm2.position.set(px, 6.2, 0);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.28), poleMat);
    box.position.set(px + (px > 0 ? -0.18 : 0.18), 4.6, 0);

    group.add(pole, arm1, arm2, box);

    // Longitudinal sagging power wires along each sidewalk
    for (let w = 0; w < 4; w++) {
      const wx = px + (w - 1.5) * 0.28;
      const wy = 6.2 + (w % 2) * 0.75;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(wx, wy, -22.5),
        new THREE.Vector3(wx + (Math.random() - 0.5) * 0.18, wy - 0.58 - w * 0.12, 0),
        new THREE.Vector3(wx, wy, 22.5),
      ]);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(8));
      group.add(new THREE.Line(lineGeo, wireMat));
    }
  });

  // Tangled overhead wires crossing across the road (iconic Dhaka/Chattogram visual!)
  if (withCrossStreetWires) {
    for (let i = 0; i < 9; i++) {
      const zOff = (i - 4) * 2.4;
      const yStart = 5.75 + (i % 4) * 0.42;
      const sag = 0.72 + (i % 3) * 0.36;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-9.3, yStart, zOff),
        new THREE.Vector3(-3.0, yStart - sag * 0.85, zOff + (i % 2 === 0 ? 0.6 : -0.5)),
        new THREE.Vector3(3.0, yStart - sag, zOff - (i % 2 === 0 ? 0.5 : 0.6)),
        new THREE.Vector3(9.3, yStart + 0.15, zOff + (i % 3 === 0 ? 0.8 : -0.4)),
      ]);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
      group.add(new THREE.Line(lineGeo, wireMat));
    }
  }

  return group;
}

export function createOverheadRoadSign(areaText: string, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45, metalness: 0.65 });

  // Right sidewalk cantilever gantry arm (matching Screenshot 1 'সায়েন্স ল্যাব' & Screenshot 3)
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.2, 8), poleMat);
  post.position.set(9.1, 3.1, 0);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 0.18), poleMat);
  beam.position.set(5.8, 5.9, 0);

  const signBack = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 1.28, 0.16),
    new THREE.MeshStandardMaterial({ color: '#064e3b', roughness: 0.55 })
  );
  signBack.position.set(4.5, 5.4, 0);

  const tex = createOverheadSignTexture(areaText, maxAnisotropy);
  const signFront = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.15),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  signFront.position.set(4.5, 5.4, 0.09);

  // Traffic signal box on the pole
  const sigBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.3), poleMat);
  sigBox.position.set(8.6, 4.1, 0.12);
  const redLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: '#ef4444' })
  );
  redLamp.position.set(8.6, 4.35, 0.28);
  const greenLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: '#22c55e' })
  );
  greenLamp.position.set(8.6, 3.9, 0.28);

  group.add(post, beam, signBack, signFront, sigBox, redLamp, greenLamp);
  return group;
}

export function createRoadsideStall(variant: number, maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const stripeColors = ['#dc2626', '#2563eb', '#16a34a', '#ea580c'];
  const stripeCol = stripeColors[variant % stripeColors.length];

  const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.88 });
  const awningMat = new THREE.MeshStandardMaterial({
    map: createAwningStripeTexture(stripeCol, maxAnisotropy),
    roughness: 0.72,
    side: THREE.DoubleSide,
  });

  // Stall counter / table
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 2.2), woodMat);
  counter.position.y = 0.425;
  counter.castShadow = true;

  // Colorful fruit/snack crates on counter
  const crateColors = ['#facc15', '#ef4444', '#22c55e'];
  for (let i = 0; i < 3; i++) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.24, 0.55),
      new THREE.MeshStandardMaterial({ color: crateColors[i], roughness: 0.8 })
    );
    crate.position.set(-0.2, 0.96, -0.6 + i * 0.6);
    group.add(crate);
  }

  // Striped canopy overhead
  const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6), woodMat);
  pole1.position.set(-0.55, 1.15, -0.95);
  const pole2 = pole1.clone();
  pole2.position.z = 0.95;

  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 2.4), awningMat);
  awning.position.set(-0.15, 2.25, 0);
  awning.rotation.z = 0.16;

  // Street hawker umbrella nearby (red/yellow like Screenshot 1 & 5)
  const umbPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 2.0, 6),
    new THREE.MeshStandardMaterial({ color: '#334155' })
  );
  umbPole.position.set(-0.2, 1.0, 1.75);
  const umbTop = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 0.48, 8),
    new THREE.MeshStandardMaterial({
      color: variant % 2 === 0 ? '#dc2626' : '#eab308',
      roughness: 0.7,
      side: THREE.DoubleSide,
    })
  );
  umbTop.position.set(-0.2, 2.05, 1.75);

  group.add(counter, pole1, pole2, awning, umbPole, umbTop);
  return group;
}

export function createStreetLight(
  side: -1 | 1,
  sharedBulbMat?: THREE.MeshStandardMaterial,
  sharedGlowMat?: THREE.SpriteMaterial,
  sharedPoolMat?: THREE.MeshBasicMaterial
): THREE.Group {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.45, metalness: 0.7 });
  const bulbMat =
    sharedBulbMat ??
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#fbbf24',
      emissiveIntensity: 0.4,
    });
  const glowMat =
    sharedGlowMat ??
    new THREE.SpriteMaterial({
      map: getLightGlowTex(),
      color: '#fbbf24',
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  const poolMat =
    sharedPoolMat ??
    new THREE.MeshBasicMaterial({
      map: getLightGlowTex(),
      color: '#f59e0b',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6.2, 8), poleMat);
  pole.position.y = 3.1;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.1), poleMat);
  arm.position.set(-side * 0.8, 6.05, 0);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), bulbMat);
  lamp.position.set(-side * 1.5, 5.95, 0);

  const glowSprite = new THREE.Sprite(glowMat);
  glowSprite.position.set(-side * 1.5, 5.82, 0);
  glowSprite.scale.set(2.9, 2.5, 1);

  const groundPool = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 5.8), poolMat);
  groundPool.rotation.x = -Math.PI / 2;
  groundPool.position.set(-side * 1.65, 0.025, 0);

  group.add(pole, arm, lamp, glowSprite, groundPool);
  return group;
}

export function createBillboardModel(adIndex: number, maxAnisotropy: number, side: -1 | 1): THREE.Group {
  const group = new THREE.Group();
  const ad = BILLBOARD_ADS[adIndex % BILLBOARD_ADS.length];
  const steelMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45, metalness: 0.7 });

  const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 6.2, 8), steelMat);
  post1.position.set(0, 3.1, -1.9);
  const post2 = post1.clone();
  post2.position.z = 1.9;

  const boardBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.8, 6.2), steelMat);
  boardBack.position.set(0, 6.4, 0);

  const tex = createBillboardTexture(ad.title, ad.subtitle, ad.bg, ad.fg, maxAnisotropy);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(5.9, 2.55),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  face.position.set(-side * 0.14, 6.4, 0);
  face.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;

  group.rotation.y = side === 1 ? 0.24 : -0.24;
  group.add(post1, post2, boardBack, face);
  return group;
}

export function createAreaGantry(
  areaName: string,
  tagline: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.4, metalness: 0.7 });

  const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 7.2, 10), steelMat);
  leftPillar.position.set(-9.4, 3.6, 0);
  leftPillar.castShadow = true;

  const rightPillar = leftPillar.clone();
  rightPillar.position.set(9.4, 3.6, 0);

  const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.36, 0.42), steelMat);
  crossBeam.position.set(0, 6.8, 0);

  const signBacking = new THREE.Mesh(
    new THREE.BoxGeometry(13.0, 2.9, 0.26),
    new THREE.MeshStandardMaterial({ color: '#064e3b', roughness: 0.5 })
  );
  signBacking.position.set(0, 5.7, 0);

  const signTex = createAreaSignTexture(areaName, tagline, accentHex, maxAnisotropy);
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(12.6, 2.68),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signFace.position.set(0, 5.7, 0.15);

  group.add(leftPillar, rightPillar, crossBeam, signBacking, signFace);
  return group;
}

export function createZonePad(
  type: 'gas' | 'bribe' | 'dropoff' | 'pickup',
  maxAnisotropy: number,
  label?: string
): THREE.Group {
  const group = new THREE.Group();
  const padTex = createZonePadTexture(type, maxAnisotropy, label);
  const w = type === 'dropoff' || type === 'pickup' ? 4.4 : 4.8;
  const l = type === 'dropoff' || type === 'pickup' ? 8.5 : 8.8;

  const padMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, l),
    new THREE.MeshBasicMaterial({
      map: padTex,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  padMesh.rotation.x = -Math.PI / 2;
  padMesh.position.y = 0.03;
  group.add(padMesh);

  if (type === 'gas' || type === 'bribe') {
    const isGas = type === 'gas';
    // Translucent glowing vertical light beam/stripe marker so player spots pink bribe / yellow charge zone easily
    const beamMat = new THREE.MeshBasicMaterial({
      color: isGas ? '#facc15' : '#ec4899',
      transparent: true,
      opacity: isGas ? 0.16 : 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(isGas ? 2.1 : 2.2, isGas ? 2.25 : 2.35, 6.2, 18, 1, true),
      beamMat
    );
    beam.position.y = 3.1;
    group.add(beam);

    // Glowing transverse stripe across the lane for instant visibility
    const stripeMat = new THREE.MeshBasicMaterial({
      color: isGas ? '#fde047' : '#f472b6',
      transparent: true,
      opacity: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const stripeFront = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.55), stripeMat);
    stripeFront.rotation.x = -Math.PI / 2;
    stripeFront.position.set(0, 0.04, 3.8);
    const stripeBack = stripeFront.clone();
    stripeBack.position.z = -3.8;
    group.add(stripeFront, stripeBack);

    const kioskGroup = new THREE.Group();
    const kioskMat = new THREE.MeshStandardMaterial({
      color: isGas ? '#eab308' : '#ec4899',
      roughness: 0.45,
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.9, 1.7), kioskMat);
    base.position.y = 0.95;
    base.castShadow = true;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, 2.3), roofMat);
    canopy.position.y = 2.25;
    kioskGroup.add(base, canopy);
    kioskGroup.position.set(4.1, 0, 0);
    group.add(kioskGroup);
  } else if (type === 'dropoff') {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: '#06b6d4', roughness: 0.4 })
    );
    post.position.set(2.3, 1.6, 0);
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshBasicMaterial({ color: '#22d3ee' })
    );
    beacon.position.set(2.3, 3.4, 0);
    group.add(post, beacon);
  }

  return group;
}

export function createBuildingModel(
  colorHex: string,
  width: number,
  height: number,
  depth: number,
  shopName: string,
  signBgHex: string,
  maxAnisotropy: number,
  facingSide: -1 | 1,
  style: AreaBuildingStyle = 'market',
  posterIdx = 0
): THREE.Group {
  const group = new THREE.Group();
  const facadeKind: 'brick' | 'concrete' | 'louver' | 'modern' =
    (facingSide === -1 && posterIdx % 2 === 0) || (style === 'modern' && posterIdx % 2 === 0)
      ? 'louver'
      : style === 'oldtown' || posterIdx % 4 === 1
      ? 'brick'
      : style === 'modern'
      ? 'modern'
      : 'concrete';

  const facadeTex = createBuildingFacadeTexture(colorHex, facadeKind, maxAnisotropy);
  const sideMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.85 });
  const frontMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.78 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.65 });

  const effectiveH =
    style === 'port'
      ? Math.min(height, 7.2)
      : style === 'modern'
      ? height + 4.0
      : height + 1.4;

  // Box materials: [+X, -X, +Y, -Y, +Z, -Z]
  const materials = [
    facingSide === 1 ? frontMat : sideMat,
    facingSide === -1 ? frontMat : sideMat,
    trimMat,
    sideMat,
    sideMat,
    sideMat,
  ];
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, effectiveH, depth), materials);
  body.position.y = effectiveH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Rooftop details: parapet + water tank (very authentic!)
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + 0.28, 0.45, depth + 0.28), trimMat);
  parapet.position.y = effectiveH + 0.22;
  group.add(parapet);

  if (posterIdx % 2 === 0) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 1.35, 10),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5 })
    );
    tank.position.set(-facingSide * (width * 0.2), effectiveH + 1.05, -depth * 0.2);
    group.add(tank);
  }

  // Projecting concrete balconies on upper floors
  if (style === 'oldtown' || style === 'market') {
    const balcMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.78 });
    for (let f = 0; f < 2; f++) {
      const balc = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, depth * 0.55), balcMat);
      balc.position.set(facingSide * (width / 2 + 0.34), 4.9 + f * 2.9, 0);
      group.add(balc);
    }
  }

  // Shop awning + Bengali shop signboard
  const faceX = facingSide * (width / 2 + 0.08);
  const awningColor = posterIdx % 2 === 0 ? '#dc2626' : '#0284c7';
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.16, depth * 0.84),
    new THREE.MeshStandardMaterial({ map: createAwningStripeTexture(awningColor, maxAnisotropy), roughness: 0.7 })
  );
  awning.position.set(facingSide * (width / 2 + 0.52), 2.95, 0);
  group.add(awning);

  const signTex = createShopSignTexture(shopName, signBgHex, maxAnisotropy);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(depth * 0.72, 1.1),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  sign.position.set(faceX, 3.7, 0);
  sign.rotation.y = facingSide === 1 ? Math.PI / 2 : -Math.PI / 2;
  group.add(sign);

  // Wall poster at eye level
  const poster = WALL_POSTERS[posterIdx % WALL_POSTERS.length];
  const posterTex = createWallPosterTexture(poster.text, poster.bg, poster.fg, maxAnisotropy);
  const posterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.25),
    new THREE.MeshBasicMaterial({ map: posterTex })
  );
  posterMesh.position.set(faceX, 1.45, depth * 0.28);
  posterMesh.rotation.y = facingSide === 1 ? Math.PI / 2 : -Math.PI / 2;
  group.add(posterMesh);

  return group;
}

export function createTreeModel(): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#2f7a24', roughness: 0.78, flatShading: true });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 3.0, 6), trunkMat);
  trunk.position.y = 1.5;
  trunk.castShadow = true;

  const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 0), leafMat);
  crown.position.y = 3.55;
  crown.castShadow = true;

  group.add(trunk, crown);
  return group;
}

export function createFlyoverPillar(): THREE.Group {
  const group = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.85 });

  const colLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 8.2, 10), concreteMat);
  colLeft.position.set(-9.1, 4.1, 0);
  const colRight = colLeft.clone();
  colRight.position.set(9.1, 4.1, 0);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(19.4, 1.2, 4.2), concreteMat);
  deck.position.set(0, 8.4, 0);

  group.add(colLeft, colRight, deck);
  return group;
}

export interface TrafficLightRig {
  group: THREE.Group;
  setState: (state: TrafficLightState) => void;
}

export function createTrafficLightModel(maxAnisotropy: number): TrafficLightRig {
  const group = new THREE.Group();

  const poleMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.42,
    metalness: 0.72,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.85,
    metalness: 0.05,
  });
  const housingMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.52,
    metalness: 0.45,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: '#09090b',
    roughness: 0.72,
    metalness: 0.25,
    side: THREE.DoubleSide,
  });

  // Shared dynamic lamp materials so all signal heads on this intersection update in sync
  const redMat = new THREE.MeshStandardMaterial({
    color: '#450a0a',
    emissive: '#ef4444',
    emissiveIntensity: 0.1,
    roughness: 0.2,
    metalness: 0.1,
  });
  const yellowMat = new THREE.MeshStandardMaterial({
    color: '#451a03',
    emissive: '#f59e0b',
    emissiveIntensity: 0.1,
    roughness: 0.2,
    metalness: 0.1,
  });
  const greenMat = new THREE.MeshStandardMaterial({
    color: '#052e16',
    emissive: '#22c55e',
    emissiveIntensity: 0.1,
    roughness: 0.2,
    metalness: 0.1,
  });

  // Support poles on both sidewalks with concrete plinths (bottom-center grounded)
  [-9.3, 9.3].forEach((px) => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.65), plinthMat);
    plinth.position.set(px, 0.2, 0);
    plinth.castShadow = true;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 5.4, 10), poleMat);
    pole.position.set(px, 2.7, 0);
    pole.castShadow = true;

    group.add(plinth, pole);
  });

  // Overhead cantilever crossbeam spanning the road
  const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(19.0, 0.22, 0.24), poleMat);
  crossBeam.position.set(0, 5.15, 0);
  crossBeam.castShadow = true;
  group.add(crossBeam);

  // Warning signboard on the gantry
  const signTex = createSignalSignTexture(maxAnisotropy);
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.95, 0.12),
    housingMat
  );
  signBoard.position.set(0, 5.15, 0);
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(3.45, 0.82),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signFace.position.set(0, 5.15, 0.07);
  group.add(signBoard, signFace);

  const redGlowMat = new THREE.SpriteMaterial({
    map: getLightGlowTex(),
    color: '#ff4d4d',
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const yellowGlowMat = new THREE.SpriteMaterial({
    map: getLightGlowTex(),
    color: '#fbbf24',
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const greenGlowMat = new THREE.SpriteMaterial({
    map: getLightGlowTex(),
    color: '#4ade80',
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Helper to assemble a multi-part hooded 3-aspect signal head
  const buildSignalHead = (x: number, y: number, z: number, scale = 1) => {
    const head = new THREE.Group();
    head.position.set(x, y, z);
    head.scale.setScalar(scale);

    // Backplate with yellow reflective border look
    const backplate = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.88, 0.08), housingMat);
    backplate.position.z = -0.16;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.68, 0.36), housingMat);
    body.castShadow = true;
    head.add(backplate, body);

    const lampSpecs: { y: number; mat: THREE.MeshStandardMaterial; glowMat: THREE.SpriteMaterial }[] = [
      { y: 0.52, mat: redMat, glowMat: redGlowMat },
      { y: 0.0, mat: yellowMat, glowMat: yellowGlowMat },
      { y: -0.52, mat: greenMat, glowMat: greenGlowMat },
    ];

    for (const spec of lampSpecs) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), spec.mat);
      lens.scale.set(1, 1, 0.45);
      lens.position.set(0, spec.y, 0.16);

      const halo = new THREE.Sprite(spec.glowMat);
      halo.position.set(0, spec.y, 0.28);
      halo.scale.set(0.95, 0.95, 1);

      // Protective top hood/visor over each lens
      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.24, 10, 1, true, -Math.PI * 0.55, Math.PI * 1.1),
        visorMat
      );
      visor.rotation.x = Math.PI / 2;
      visor.position.set(0, spec.y + 0.03, 0.26);

      head.add(lens, halo, visor);
    }

    group.add(head);
  };

  // Primary overhead signal head (right/forward carriageway), secondary over left carriageway, and right pole repeater
  buildSignalHead(4.4, 4.35, 0.1, 1.05);
  buildSignalHead(-4.4, 4.35, 0.1, 0.95);
  buildSignalHead(8.7, 3.0, 0.15, 0.85);

  // Painted Stop Line across both carriageways ahead of the gantry (z = +8.5 so driver can clearly see overhead lights while stopped)
  const stopTex = createStopLineTexture(maxAnisotropy);
  const stopMat = new THREE.MeshBasicMaterial({
    map: stopTex,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const rightStopPad = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.0), stopMat);
  rightStopPad.rotation.x = -Math.PI / 2;
  rightStopPad.position.set(4.5, 0.03, 8.5);

  const leftStopPad = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.0), stopMat);
  leftStopPad.rotation.x = -Math.PI / 2;
  leftStopPad.position.set(-4.5, 0.03, 8.5);

  group.add(rightStopPad, leftStopPad);

  const setState = (state: TrafficLightState) => {
    if (state === 'red') {
      redMat.color.set('#ff3b3b');
      redMat.emissiveIntensity = 2.8;
      redGlowMat.opacity = 0.82;
      yellowMat.color.set('#451a03');
      yellowMat.emissiveIntensity = 0.08;
      yellowGlowMat.opacity = 0.0;
      greenMat.color.set('#052e16');
      greenMat.emissiveIntensity = 0.08;
      greenGlowMat.opacity = 0.0;
    } else if (state === 'yellow') {
      redMat.color.set('#450a0a');
      redMat.emissiveIntensity = 0.08;
      redGlowMat.opacity = 0.0;
      yellowMat.color.set('#fbbf24');
      yellowMat.emissiveIntensity = 2.7;
      yellowGlowMat.opacity = 0.8;
      greenMat.color.set('#052e16');
      greenMat.emissiveIntensity = 0.08;
      greenGlowMat.opacity = 0.0;
    } else {
      redMat.color.set('#450a0a');
      redMat.emissiveIntensity = 0.08;
      redGlowMat.opacity = 0.0;
      yellowMat.color.set('#451a03');
      yellowMat.emissiveIntensity = 0.08;
      yellowGlowMat.opacity = 0.0;
      greenMat.color.set('#22c55e');
      greenMat.emissiveIntensity = 2.7;
      greenGlowMat.opacity = 0.8;
    }
  };

  setState('green');

  return { group, setState };
}

export interface RoadDiggingRig {
  group: THREE.Group;
  lampMat: THREE.MeshStandardMaterial;
  halfWidth: number;
  halfLength: number;
}

export function createRoadDiggingBarrier(maxAnisotropy = 1): RoadDiggingRig {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 });
  const coneMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.45 });
  const stripeWhiteMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 });
  const dirtMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.96, flatShading: true });

  // Striped red/white barricade board on steel legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.55), steelMat);
  legL.position.set(-0.95, 0.45, 0);
  const legR = legL.clone();
  legR.position.x = 0.95;

  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 256;
  boardCanvas.height = 96;
  const ctx = boardCanvas.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#dc2626';
  for (let x = -40; x < 290; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x + 48, 96);
    ctx.lineTo(x + 24, 96);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(28, 25, 23, 0.86)';
  ctx.fillRect(16, 26, 224, 44);
  ctx.fillStyle = '#fef08a';
  ctx.font = "800 24px 'Hind Siliguri', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('রাস্তা খোঁড়া · সাবধান!', 128, 49);

  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  boardTex.anisotropy = Math.min(4, maxAnisotropy);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.64, 0.12),
    new THREE.MeshBasicMaterial({ map: boardTex })
  );
  board.position.set(0, 0.88, 0.12);
  board.castShadow = true;

  // Dirt pile behind the barricade
  const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(0.92, 0), dirtMat);
  mound.scale.set(1.25, 0.52, 1.15);
  mound.position.set(0, 0.22, -0.92);

  // Two orange safety cones in front
  [-0.85, 0.85].forEach((cx) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 8), coneMat);
    cone.position.set(cx, 0.31, 0.75);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.12, 8), stripeWhiteMat);
    band.position.set(cx, 0.38, 0.75);
    group.add(cone, band);
  });

  // Blinking amber hazard lamp on top
  const lampMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    emissive: '#f59e0b',
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), lampMat);
  lamp.position.set(0, 1.32, 0.12);

  group.add(legL, legR, board, mound, lamp);
  return { group, lampMat, halfWidth: 1.15, halfLength: 1.05 };
}

export function createProtestPlacard(
  label: string,
  bgHex: string,
  maxAnisotropy = 1
): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.25, 6),
    new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 })
  );
  pole.position.y = 1.65;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 112);
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 104);
  ctx.fillStyle = '#ffffff';
  ctx.font = "800 34px 'Hind Siliguri', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 56, 224);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  const signMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.44), signMat);
  sign.position.set(0, 2.32, 0.02);

  group.add(pole, sign);
  return group;
}

export interface RoadObstacleRig {
  group: THREE.Group;
  kind: 'billboard' | 'pillar';
  halfWidth: number;
  halfLength: number;
}

export function createHalfRoadBillboard(adIndex: number, maxAnisotropy = 1): RoadObstacleRig {
  const group = new THREE.Group();
  const ad = BILLBOARD_ADS[adIndex % BILLBOARD_ADS.length];
  const steelMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.6 });
  const warnMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.45 });
  const redMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.45 });

  // Two hazard-striped legs spanning ~3.3m (blocks half of the carriageway!)
  [-1.45, 1.45].forEach((lx) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.55), redMat);
    base.position.set(lx, 0.175, 0);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.1, 8), steelMat);
    leg.position.set(lx, 1.55, 0);
    leg.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.38, 8), warnMat);
    band.position.set(lx, 0.95, 0);
    group.add(base, leg, band);
  });

  // Crossbar + wide colorful billboard panel across half the road
  const boardBack = new THREE.Mesh(new THREE.BoxGeometry(3.45, 1.75, 0.18), steelMat);
  boardBack.position.set(0, 2.25, 0);
  boardBack.castShadow = true;

  const tex = createBillboardTexture(ad.title, ad.subtitle, ad.bg, ad.fg, maxAnisotropy);
  const faceFront = new THREE.Mesh(
    new THREE.PlaneGeometry(3.25, 1.56),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  faceFront.position.set(0, 2.25, 0.1);
  const faceBack = faceFront.clone();
  faceBack.position.z = -0.1;
  faceBack.rotation.y = Math.PI;

  // Low barricade rail between legs so player clearly sees it's a physical blockade
  const rail = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.42, 0.14), warnMat);
  rail.position.set(0, 0.72, 0);

  group.add(boardBack, faceFront, faceBack, rail);
  return { group, kind: 'billboard', halfWidth: 1.62, halfLength: 0.55 };
}

export function createLaneFlyoverPillar(posterIdx: number, maxAnisotropy = 1): RoadObstacleRig {
  const group = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.85 });
  const curbYellowMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.6 });
  const curbBlackMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.7 });

  // Heavy concrete plinth at road level with black/yellow hazard collar
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 1.55), curbYellowMat);
  plinth.position.y = 0.225;
  plinth.castShadow = true;
  const collar = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.26, 1.42), curbBlackMat);
  collar.position.y = 0.56;

  // Thick concrete flyover/footbridge support column rising into overhead deck beam
  const column = new THREE.Mesh(new THREE.BoxGeometry(1.22, 7.6, 1.22), concreteMat);
  column.position.y = 4.2;
  column.castShadow = true;

  // Concrete overhead cap beam extending toward the sidewalk
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.6), concreteMat);
  cap.position.y = 8.1;

  // Bengali wall posters plastered onto front/sides of the concrete column (authentic Dhaka/Chattogram flyover look)
  const poster = WALL_POSTERS[posterIdx % WALL_POSTERS.length];
  const posterTex = createWallPosterTexture(poster.text, poster.bg, poster.fg, maxAnisotropy, poster.sub, poster.badge);
  const posterMat = new THREE.MeshBasicMaterial({ map: posterTex });
  const frontPoster = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.86), posterMat);
  frontPoster.position.set(0, 2.05, 0.625);
  const frontPoster2 = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.86), posterMat);
  frontPoster2.position.set(0, 3.15, 0.625);

  group.add(plinth, collar, column, cap, frontPoster, frontPoster2);
  return { group, kind: 'pillar', halfWidth: 0.78, halfLength: 0.78 };
}
