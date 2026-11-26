import * as THREE from 'three';
import type { CngStickerOption, VehicleKind } from '../types/game';
import {
  createLightGlowTexture,
  createNumberPlateTexture,
  createStickerTexture,
} from './textures';
import { getVehicleAssetPool } from './vehicleTextures';

let sharedContactShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowTex(): THREE.CanvasTexture {
  if (!sharedContactShadowTex) {
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
    sharedContactShadowTex = new THREE.CanvasTexture(canvas);
    sharedContactShadowTex.colorSpace = THREE.SRGBColorSpace;
  }
  return sharedContactShadowTex;
}

let sharedLightGlowTex: THREE.CanvasTexture | null = null;
function getLightGlowTex(): THREE.CanvasTexture {
  if (!sharedLightGlowTex) {
    sharedLightGlowTex = createLightGlowTexture();
  }
  return sharedLightGlowTex;
}

/**
 * Helper to create a symmetric vehicle profile extruded along X (width)
 * where profile shape X maps to Z (negative = front, positive = rear)
 * and shape Y maps to world Y.
 */
function makeSideExtrudeGeometry(
  pts: [number, number][],
  width: number,
  bevelSize = 0.06,
  bevelThickness = 0.07
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i][0], pts[i][1]);
  }
  shape.closePath();

  const innerDepth = Math.max(0.1, width - bevelThickness * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: innerDepth,
    bevelEnabled: bevelSize > 0,
    bevelThickness,
    bevelSize,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -innerDepth / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

interface SharedVehicleGeos {
  sedanBody: THREE.ExtrudeGeometry;
  sedanGlass: THREE.ExtrudeGeometry;
  microbusBody: THREE.ExtrudeGeometry;
  microbusGlass: THREE.ExtrudeGeometry;
  ambulanceBody: THREE.ExtrudeGeometry;
  pickupCab: THREE.ExtrudeGeometry;
  truckCab: THREE.ExtrudeGeometry;
  cngNose: THREE.ExtrudeGeometry;
  cngRearTub: THREE.ExtrudeGeometry;
  tireCar: THREE.CylinderGeometry;
  rimCar: THREE.CylinderGeometry;
  tireHeavy: THREE.CylinderGeometry;
  rimHeavy: THREE.CylinderGeometry;
  tireCng: THREE.CylinderGeometry;
  rimCng: THREE.CylinderGeometry;
  tireMoto: THREE.CylinderGeometry;
  rimMoto: THREE.CylinderGeometry;
  spokeBar: THREE.BoxGeometry;
}

let cachedGeos: SharedVehicleGeos | null = null;
function getSharedVehicleGeos(): SharedVehicleGeos {
  if (cachedGeos) return cachedGeos;

  const sedanBody = makeSideExtrudeGeometry(
    [
      [-1.92, 0.34],
      [-1.95, 0.68],
      [-1.78, 0.88],
      [-0.95, 0.96],
      [-0.42, 1.4],
      [0.68, 1.4],
      [1.32, 0.98],
      [1.88, 0.92],
      [1.94, 0.62],
      [1.9, 0.34],
    ],
    1.84,
    0.05,
    0.07
  );

  const sedanGlass = makeSideExtrudeGeometry(
    [
      [-0.9, 0.96],
      [-0.4, 1.36],
      [0.64, 1.36],
      [1.26, 0.98],
    ],
    1.62,
    0.02,
    0.02
  );

  const microbusBody = makeSideExtrudeGeometry(
    [
      [-2.1, 0.34],
      [-2.12, 0.84],
      [-1.78, 1.06],
      [-1.28, 1.78],
      [1.88, 1.78],
      [2.08, 1.44],
      [2.1, 0.34],
    ],
    1.9,
    0.06,
    0.08
  );

  const microbusGlass = makeSideExtrudeGeometry(
    [
      [-1.68, 1.08],
      [-1.24, 1.66],
      [1.82, 1.66],
      [1.98, 1.38],
      [1.98, 1.06],
    ],
    1.94,
    0.01,
    0.02
  );

  const ambulanceBody = makeSideExtrudeGeometry(
    [
      [-2.14, 0.34],
      [-2.14, 0.86],
      [-1.76, 1.12],
      [-1.3, 1.98],
      [2.02, 1.98],
      [2.12, 1.72],
      [2.12, 0.34],
    ],
    1.96,
    0.05,
    0.07
  );

  const pickupCab = makeSideExtrudeGeometry(
    [
      [-2.04, 0.42],
      [-2.04, 0.96],
      [-1.42, 1.14],
      [-0.95, 1.76],
      [0.02, 1.76],
      [0.06, 0.42],
    ],
    1.9,
    0.05,
    0.07
  );

  const truckCab = makeSideExtrudeGeometry(
    [
      [-3.05, 0.5],
      [-3.08, 1.24],
      [-2.42, 1.44],
      [-2.14, 2.28],
      [-0.95, 2.28],
      [-0.92, 0.5],
    ],
    2.32,
    0.06,
    0.08
  );

  // Rounded CNG nose cowl & rear wheel arch tub
  const cngNose = makeSideExtrudeGeometry(
    [
      [-1.32, 0.46],
      [-1.36, 0.88],
      [-1.12, 1.14],
      [-0.58, 1.16],
      [-0.48, 0.44],
    ],
    1.16,
    0.08,
    0.1
  );

  const cngRearTub = makeSideExtrudeGeometry(
    [
      [-0.08, 0.42],
      [-0.08, 1.14],
      [1.18, 1.14],
      [1.36, 0.94],
      [1.36, 0.44],
    ],
    1.54,
    0.07,
    0.09
  );

  const makeTire = (r: number, w: number) => {
    const g = new THREE.CylinderGeometry(r, r, w, 14);
    g.rotateZ(Math.PI / 2);
    return g;
  };
  const makeRim = (r: number, w: number) => {
    const g = new THREE.CylinderGeometry(r * 0.58, r * 0.58, w + 0.02, 12);
    g.rotateZ(Math.PI / 2);
    return g;
  };

  cachedGeos = {
    sedanBody,
    sedanGlass,
    microbusBody,
    microbusGlass,
    ambulanceBody,
    pickupCab,
    truckCab,
    cngNose,
    cngRearTub,
    tireCar: makeTire(0.35, 0.23),
    rimCar: makeRim(0.35, 0.23),
    tireHeavy: makeTire(0.48, 0.28),
    rimHeavy: makeRim(0.48, 0.28),
    tireCng: makeTire(0.3, 0.18),
    rimCng: makeRim(0.3, 0.18),
    tireMoto: makeTire(0.34, 0.11),
    rimMoto: makeRim(0.34, 0.11),
    spokeBar: new THREE.BoxGeometry(0.03, 0.42, 0.055),
  };
  return cachedGeos;
}

export interface CngRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  ornamentPivot: THREE.Group;
  wheels: THREE.Object3D[];
  paintMaterials: THREE.MeshStandardMaterial[];
  stickerMesh: THREE.Mesh;
  boostFlameLeft: THREE.Mesh;
  boostFlameRight: THREE.Mesh;
  updateAppearance: (colorHex: string, sticker: CngStickerOption, maxAnisotropy: number) => void;
  setLightsGlow: (strength: number) => void;
  setSteerAngle: (angleRad: number) => void;
}

export function createCngModel(
  colorHex: string,
  sticker: CngStickerOption,
  maxAnisotropy: number
): CngRig {
  const pool = getVehicleAssetPool(maxAnisotropy);
  const geos = getSharedVehicleGeos();

  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const paintMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    map: pool.dirtMap,
    roughness: 0.34,
    metalness: 0.24,
    envMapIntensity: 1.15,
  });
  const roofMat = pool.cngRoofCanvasMat;
  const cageMat = pool.chromeMat;
  const darkMetalMat = pool.bumperDarkMat;
  const tireMat = pool.tireMat;
  const rimMat = pool.alloyRimMat;
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#93c5fd',
    roughness: 0.08,
    metalness: 0.2,
    transparent: true,
    opacity: 0.42,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: '#7c2d12',
    roughness: 0.82,
    metalness: 0.05,
  });

  // Ground contact shadow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.55, 3.65),
    new THREE.MeshBasicMaterial({
      map: getContactShadowTex(),
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  group.add(shadowPlane);

  const wheels: THREE.Object3D[] = [];
  const makeWheel = (
    x: number,
    y: number,
    z: number,
    scale = 1,
    parent: THREE.Object3D = group
  ) => {
    const wGroup = new THREE.Group();
    const tire = new THREE.Mesh(geos.tireCng, tireMat);
    tire.castShadow = true;
    const hub = new THREE.Mesh(geos.rimCng, rimMat);
    const s1 = new THREE.Mesh(geos.spokeBar, darkMetalMat);
    s1.scale.set(1, 0.72, 1);
    s1.position.x = x >= 0 ? 0.09 : -0.09;
    const s2 = s1.clone();
    s2.rotation.x = Math.PI / 2;
    wGroup.add(tire, hub, s1, s2);
    wGroup.scale.setScalar(scale);
    wGroup.position.set(x, y, z);
    parent.add(wGroup);
    wheels.push(wGroup);
  };

  // Front wheel inside dedicated Y-axis steering pivot so turn angle never clashes with X-axis wheel spin
  const frontWheelPivot = new THREE.Group();
  frontWheelPivot.position.set(0, 0, -1.26);
  group.add(frontWheelPivot);
  makeWheel(0, 0.3, 0, 0.96, frontWheelPivot);

  makeWheel(-0.76, 0.32, 0.82, 1.04);
  makeWheel(0.76, 0.32, 0.82, 1.04);

  // Front fork + curved front mudguard in matching steering pivot inside bodyGroup
  const frontForkPivot = new THREE.Group();
  frontForkPivot.position.set(0, 0, -1.26);
  const frontFork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.74, 10), darkMetalMat);
  frontFork.position.set(0, 0.65, 0.04);
  frontFork.rotation.x = -0.22;
  const frontFender = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, 0.34, 12, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
    paintMat
  );
  frontFender.rotation.z = Math.PI / 2;
  frontFender.position.set(0, 0.34, 0.01);
  frontFender.castShadow = true;
  frontForkPivot.add(frontFork, frontFender);
  bodyGroup.add(frontForkPivot);

  // Chassis floor deck
  const floorDeck = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.12, 2.38), darkMetalMat);
  floorDeck.position.set(0, 0.38, 0.06);
  floorDeck.castShadow = true;
  bodyGroup.add(floorDeck);

  // Rounded green body (beveled extruded nose cowl + rear passenger tub + curved rear fenders)
  const noseBody = new THREE.Mesh(geos.cngNose, paintMat);
  noseBody.castShadow = true;
  const rearBody = new THREE.Mesh(geos.cngRearTub, paintMat);
  rearBody.castShadow = true;

  // Rounded engine cowl bump & rear bumper
  const engineBump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.62, 1.38, 12, 1, false, 0, Math.PI),
    paintMat
  );
  engineBump.rotation.z = Math.PI / 2;
  engineBump.scale.set(0.75, 1, 0.42);
  engineBump.position.set(0, 0.74, 1.32);
  engineBump.castShadow = true;

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.13, 0.15), pool.chromeMat);
  rearBumper.position.set(0, 0.44, 1.48);

  // Rear black mudflaps
  [-0.68, 0.68].forEach((mx) => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.04), darkMetalMat);
    flap.position.set(mx, 0.26, 1.24);
    flap.rotation.x = 0.18;
    bodyGroup.add(flap);
  });

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.52, 8), cageMat);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(-0.45, 0.34, 1.4);
  bodyGroup.add(noseBody, rearBody, engineBump, rearBumper, exhaust);

  // Seats & detailed seated driver (shirt/panjabi, arms reaching handlebar, head + cap)
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.44), seatMat);
  driverSeat.position.set(0, 0.66, -0.35);
  const rearBench = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.26, 0.52), seatMat);
  rearBench.position.set(0, 0.72, 0.75);
  const rearBackrest = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.56, 0.14), seatMat);
  rearBackrest.position.set(0, 1.05, 1.02);

  const skinMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.76 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.85 });
  const driverBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.48, 0.24), shirtMat);
  driverBody.position.set(0, 1.02, -0.34);
  const driverHead = new THREE.Mesh(new THREE.SphereGeometry(0.145, 10, 10), skinMat);
  driverHead.position.set(0, 1.36, -0.34);
  const driverHair = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    tireMat
  );
  driverHair.position.set(0, 1.38, -0.33);
  [-0.22, 0.22].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.42, 6), shirtMat);
    arm.position.set(ax, 1.12, -0.52);
    arm.rotation.x = Math.PI / 2 - 0.22;
    bodyGroup.add(arm);
  });
  bodyGroup.add(driverSeat, rearBench, rearBackrest, driverBody, driverHead, driverHair);

  // Windshield frame + curved glass
  const wsFrameLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.84, 8), darkMetalMat);
  wsFrameLeft.position.set(-0.56, 1.54, -0.74);
  wsFrameLeft.rotation.x = 0.22;
  const wsFrameRight = wsFrameLeft.clone();
  wsFrameRight.position.x = 0.56;
  const wsTopBar = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.08, 0.09), darkMetalMat);
  wsTopBar.position.set(0, 1.9, -0.66);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.72, 0.04), glassMat);
  windshield.position.set(0, 1.52, -0.75);
  windshield.rotation.x = 0.22;
  bodyGroup.add(wsFrameLeft, wsFrameRight, wsTopBar, windshield);

  // Hanging Windshield Charm (ঝুলন্ত তাবিজ/মালা) visible in chase & showcase cams!
  const ornamentPivot = new THREE.Group();
  ornamentPivot.position.set(0, 1.87, -0.69);
  const charmCord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), tireMat);
  charmCord.position.y = -0.08;
  const charmRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.032, 0.009, 6, 12),
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.25, metalness: 0.85 })
  );
  charmRing.position.y = -0.17;
  const charmTassel = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.11, 8),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.65 })
  );
  charmTassel.position.y = -0.25;
  ornamentPivot.add(charmCord, charmRing, charmTassel);
  bodyGroup.add(ornamentPivot);

  // Black Canvas Roof + Curved Crown + Side Rain Flaps (পাশের ক্যানভাস ফ্ল্যাপ)
  const roofMain = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.12, 2.02), roofMat);
  roofMain.position.set(0, 1.94, 0.22);
  roofMain.castShadow = true;
  const roofCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 1.94, 12, 1, false, 0, Math.PI),
    roofMat
  );
  roofCrown.rotation.z = Math.PI / 2;
  roofCrown.rotation.y = Math.PI / 2;
  roofCrown.scale.set(1, 0.26, 1);
  roofCrown.position.set(0, 1.98, 0.22);
  bodyGroup.add(roofMain, roofCrown);

  // Side rain flaps along left & right roofline + rolled canvas edge
  [-1, 1].forEach((side) => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 1.92), roofMat);
    flap.position.set(side * 0.78, 1.77, 0.22);
    flap.rotation.z = side * 0.22;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 1.94), darkMetalMat);
    trim.position.set(side * 0.76, 1.92, 0.22);
    bodyGroup.add(flap, trim);
  });

  // Rear canvas canopy + decorative Bangla art border
  const rearTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.54, 0.1, 0.08),
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.45 })
  );
  rearTrim.position.set(0, 1.88, 1.22);
  const rearCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.44, 0.08), roofMat);
  rearCanopy.position.set(0, 1.66, 1.22);
  bodyGroup.add(rearTrim, rearCanopy);

  const postRL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.84, 8), darkMetalMat);
  postRL.position.set(-0.72, 1.5, 1.18);
  const postRR = postRL.clone();
  postRR.position.x = 0.72;
  const postML = postRL.clone();
  postML.position.set(-0.72, 1.5, -0.05);
  const postMR = postML.clone();
  postMR.position.x = 0.72;
  bodyGroup.add(postRL, postRR, postML, postMR);

  // Wire-Cage Grille Doors (খাঁচা-জালি)
  const buildSideCage = (sideX: number) => {
    const cageGroup = new THREE.Group();
    cageGroup.position.set(sideX, 1.38, 0.56);

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 1.2), cageMat);
    topBar.position.y = 0.42;
    const botBar = topBar.clone();
    botBar.position.y = -0.22;
    cageGroup.add(topBar, botBar);

    for (let z = -0.52; z <= 0.52; z += 0.26) {
      const vBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.64, 6), cageMat);
      vBar.position.set(0, 0.1, z);
      cageGroup.add(vBar);
    }

    for (let y = -0.06; y <= 0.26; y += 0.16) {
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.18, 6), cageMat);
      hBar.rotation.x = Math.PI / 2;
      hBar.position.set(0, y, 0);
      cageGroup.add(hBar);
    }

    const diag1 = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1.15, 6), cageMat);
    diag1.rotation.x = 1.05;
    diag1.position.y = 0.1;
    const diag2 = diag1.clone();
    diag2.rotation.x = -1.05;
    cageGroup.add(diag1, diag2);
    bodyGroup.add(cageGroup);
  };
  buildSideCage(-0.76);
  buildSideCage(0.76);

  // Front Headlights + Glow + Light Beam Cone & Ground Pool
  const headMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#facc15',
    emissiveIntensity: 1.45,
    roughness: 0.2,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  const headGlowMat = new THREE.SpriteMaterial({
    map: getLightGlowTex(),
    color: '#fde68a',
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const tailGlowMat = new THREE.SpriteMaterial({
    map: getLightGlowTex(),
    color: '#ef4444',
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beamMat = new THREE.MeshBasicMaterial({
    map: getLightGlowTex(),
    color: '#fef08a',
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beamConeMat = new THREE.MeshBasicMaterial({
    color: '#fef08a',
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  [-0.36, 0.36].forEach((x) => {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), cageMat);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(x, 0.88, -1.33);
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.09, 12), headMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, 0.88, -1.34);
    const glow = new THREE.Sprite(headGlowMat);
    glow.position.set(x, 0.88, -1.4);
    glow.scale.set(0.76, 0.76, 1);
    bodyGroup.add(bezel, hl, glow);
  });

  // Translucent forward headlight beam cone + road ground projection
  const beamCone = new THREE.Mesh(new THREE.ConeGeometry(1.45, 7.5, 14, 1, true), beamConeMat);
  beamCone.rotation.x = -Math.PI / 2;
  beamCone.position.set(0, 0.65, -5.1);
  bodyGroup.add(beamCone);

  const headBeamPool = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 8.2), beamMat);
  headBeamPool.rotation.x = -Math.PI / 2;
  headBeamPool.position.set(0, 0.03, -5.2);
  group.add(headBeamPool);

  [-0.56, 0.56].forEach((x) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.07), tailMat);
    tl.position.set(x, 0.88, 1.44);
    tl.rotation.z = x < 0 ? -0.22 : 0.22;
    const glow = new THREE.Sprite(tailGlowMat);
    glow.position.set(x, 0.88, 1.52);
    glow.scale.set(0.68, 0.54, 1);
    bodyGroup.add(tl, glow);
  });

  // Side mirrors
  [-0.64, 0.64].forEach((x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.03), darkMetalMat);
    arm.position.set(x, 1.42, -0.78);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.04), darkMetalMat);
    mirror.position.set(x + Math.sign(x) * 0.09, 1.45, -0.78);
    bodyGroup.add(arm, mirror);
  });

  // Bangla digit number plate + Back panel with Bangla art text
  const plateTex = createNumberPlateTexture(maxAnisotropy);
  const plateMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.23),
    new THREE.MeshBasicMaterial({ map: plateTex })
  );
  plateMesh.position.set(0, 0.64, 1.48);
  bodyGroup.add(plateMesh);

  // Decorative rickshaw-art back panel frame around Bangla art sticker
  const artFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.46, 0.06),
    new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.5 })
  );
  artFrame.position.set(0, 1.32, 1.25);
  bodyGroup.add(artFrame);

  const stickerTex = createStickerTexture(sticker.text, sticker.bgHex, sticker.textHex, maxAnisotropy);
  const stickerMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.22, 0.38),
    new THREE.MeshBasicMaterial({ map: stickerTex })
  );
  stickerMesh.position.set(0, 1.32, 1.29);
  bodyGroup.add(stickerMesh);

  const flameMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.9,
  });
  const boostFlameLeft = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.82, 8), flameMat);
  boostFlameLeft.rotation.x = Math.PI / 2;
  boostFlameLeft.position.set(-0.45, 0.36, 1.85);
  boostFlameLeft.visible = false;

  const boostFlameRight = boostFlameLeft.clone();
  boostFlameRight.position.set(0.45, 0.36, 1.85);
  boostFlameRight.visible = false;
  bodyGroup.add(boostFlameLeft, boostFlameRight);

  const updateAppearance = (newColorHex: string, newSticker: CngStickerOption, aniso: number) => {
    paintMat.color.set(newColorHex);
    const mat = stickerMesh.material as THREE.MeshBasicMaterial;
    mat.map?.dispose();
    mat.map = createStickerTexture(newSticker.text, newSticker.bgHex, newSticker.textHex, aniso);
    mat.needsUpdate = true;
  };

  const setLightsGlow = (strength: number) => {
    headMat.emissiveIntensity = 0.9 + strength * 2.3;
    tailMat.emissiveIntensity = 1.0 + strength * 1.4;
    headGlowMat.opacity = 0.18 + strength * 0.64;
    tailGlowMat.opacity = 0.28 + strength * 0.52;
    beamMat.opacity = 0.04 + strength * 0.22;
    beamConeMat.opacity = 0.03 + strength * 0.1;
  };

  const setSteerAngle = (angleRad: number) => {
    frontWheelPivot.rotation.y = angleRad;
    frontForkPivot.rotation.y = angleRad;
  };

  return {
    group,
    bodyGroup,
    ornamentPivot,
    wheels,
    paintMaterials: [paintMat],
    stickerMesh,
    boostFlameLeft,
    boostFlameRight,
    updateAppearance,
    setLightsGlow,
    setSteerAngle,
  };
}

export interface TrafficModelRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  detailGroup: THREE.Group;
  wheelDetails: THREE.Object3D[];
  halfWidth: number;
  halfLength: number;
  wheels: THREE.Object3D[];
  wheelRadius: number;
  isEmergency?: boolean;
  setBraking: (braking: boolean) => void;
  setTurnSignal: (dir: -1 | 0 | 1 | 2, blinkOn: boolean) => void;
  setEmergencyPhase?: (phase: number) => void;
}

export function createVehicleModel(kind: VehicleKind, maxAnisotropy: number): TrafficModelRig {
  const pool = getVehicleAssetPool(maxAnisotropy);
  const geos = getSharedVehicleGeos();

  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const detailGroup = new THREE.Group();
  bodyGroup.add(detailGroup);
  group.add(bodyGroup);

  const wheels: THREE.Object3D[] = [];
  const wheelDetails: THREE.Object3D[] = [];
  let wheelRadius = 0.35;

  // Per-vehicle brake & turn signal emissive materials so braking & blinking are independent per vehicle!
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#991b1b',
    emissive: '#ef4444',
    emissiveIntensity: 0.7,
    roughness: 0.22,
  });
  const leftIndMat = new THREE.MeshStandardMaterial({
    color: '#92400e',
    emissive: '#f59e0b',
    emissiveIntensity: 0.12,
    roughness: 0.25,
  });
  const rightIndMat = new THREE.MeshStandardMaterial({
    color: '#92400e',
    emissive: '#f59e0b',
    emissiveIntensity: 0.12,
    roughness: 0.25,
  });

  const setBraking = (braking: boolean) => {
    tailMat.emissiveIntensity = braking ? 2.95 : 0.7;
    tailMat.color.set(braking ? '#ff4545' : '#991b1b');
  };

  const setTurnSignal = (dir: -1 | 0 | 1 | 2, blinkOn: boolean) => {
    const leftOn = blinkOn && (dir === -1 || dir === 2);
    const rightOn = blinkOn && (dir === 1 || dir === 2);
    leftIndMat.emissiveIntensity = leftOn ? 2.6 : 0.1;
    leftIndMat.color.set(leftOn ? '#fbbf24' : '#78350f');
    rightIndMat.emissiveIntensity = rightOn ? 2.6 : 0.1;
    rightIndMat.color.set(rightOn ? '#fbbf24' : '#78350f');
  };

  const pickCommPlate = () =>
    pool.commercialPlateMats[Math.floor(Math.random() * pool.commercialPlateMats.length)];
  const pickPrivPlate = () =>
    pool.privatePlateMats[Math.floor(Math.random() * pool.privatePlateMats.length)];

  const addWheel = (
    x: number,
    y: number,
    z: number,
    tireGeo: THREE.BufferGeometry,
    rimGeo: THREE.BufferGeometry,
    rimMat: THREE.Material,
    isAlloy = true
  ) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, pool.tireMat);
    const hub = new THREE.Mesh(rimGeo, rimMat);
    w.add(tire, hub);

    if (isAlloy) {
      const spoke = new THREE.Mesh(geos.spokeBar, pool.bumperDarkMat);
      spoke.scale.set(1, y * 1.45, 1);
      spoke.position.x = x >= 0 ? 0.11 : -0.11;
      const spoke2 = spoke.clone();
      spoke2.rotation.x = Math.PI / 2;
      w.add(spoke, spoke2);
      wheelDetails.push(spoke, spoke2);
    }

    w.position.set(x, y, z);
    group.add(w);
    wheels.push(w);
  };

  const addSideMirrors = (x: number, y: number, z: number, scale = 1) => {
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.14 * scale, 0.035 * scale, 0.04 * scale),
        pool.bumperDarkMat
      );
      arm.position.set(side * x, y, z);
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.16 * scale, 0.12 * scale, 0.08 * scale),
        pool.bumperDarkMat
      );
      housing.position.set(side * (x + 0.09 * scale), y + 0.02 * scale, z);
      const mirror = new THREE.Mesh(
        new THREE.PlaneGeometry(0.13 * scale, 0.09 * scale),
        pool.mirrorGlassMat
      );
      mirror.position.set(side * (x + 0.09 * scale), y + 0.02 * scale, z + 0.045 * scale);
      detailGroup.add(arm, housing, mirror);
    });
  };

  const addCornerLightsAndPlates = (
    halfW: number,
    frontZ: number,
    rearZ: number,
    lightY: number,
    plateY: number,
    commercial: boolean,
    withFrontHeadlights = true
  ) => {
    // Rear tail/brake lights + amber turn indicators
    [-1, 1].forEach((s) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), tailMat);
      tl.position.set(s * (halfW - 0.24), lightY, rearZ);
      const indR = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.13, 0.06),
        s < 0 ? leftIndMat : rightIndMat
      );
      indR.position.set(s * (halfW - 0.04), lightY, rearZ);
      bodyGroup.add(tl, indR);

      if (withFrontHeadlights) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.06), pool.headlightLensMat);
        hl.position.set(s * (halfW - 0.26), lightY - 0.04, frontZ);
        const indF = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.12, 0.06),
          s < 0 ? leftIndMat : rightIndMat
        );
        indF.position.set(s * (halfW - 0.05), lightY - 0.04, frontZ);
        bodyGroup.add(hl, indF);
      }
    });

    const plateMat = commercial ? pickCommPlate() : pickPrivPlate();
    const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.2), plateMat);
    rearPlate.position.set(0, plateY, rearZ + 0.02);
    const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.19), plateMat);
    frontPlate.position.set(0, plateY - 0.05, frontZ - 0.02);
    frontPlate.rotation.y = Math.PI;
    bodyGroup.add(rearPlate, frontPlate);
  };

  // =========================================================================
  // 1. LOCAL BUS & DOUBLE-DECKER BUS (dented, faded paint, hanging door pax)
  // =========================================================================
  if (kind === 'bus') {
    wheelRadius = 0.48;
    const isDoubleDecker = Math.random() < 0.24;

    if (isDoubleDecker) {
      const len = 7.45;
      const bodyMat = pool.doubleDeckerBodyMat;
      const topMat = new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        map: pool.dirtMap,
        roughness: 0.56,
      });

      const lowerDeck = new THREE.Mesh(new THREE.BoxGeometry(2.68, 1.54, len), bodyMat);
      lowerDeck.position.y = 1.15;
      lowerDeck.castShadow = true;

      const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(2.66, 1.4, len - 0.12), bodyMat);
      upperDeck.position.y = 2.62;
      upperDeck.castShadow = true;

      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.3, len - 0.1), topMat);
      roofCap.position.y = 3.47;

      const lowerWin = new THREE.Mesh(new THREE.BoxGeometry(2.71, 0.68, len - 0.45), pool.tintedGlassMat);
      lowerWin.position.y = 1.48;
      const upperWin = new THREE.Mesh(new THREE.BoxGeometry(2.71, 0.68, len - 0.45), pool.tintedGlassMat);
      upperWin.position.y = 2.82;

      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.28, 0.22), pool.bumperDarkMat);
      frontBumper.position.set(0, 0.45, -len / 2 - 0.04);
      const rearBumper = frontBumper.clone();
      rearBumper.position.z = len / 2 + 0.04;

      bodyGroup.add(lowerDeck, upperDeck, roofCap, lowerWin, upperWin, frontBumper, rearBumper);
      addCornerLightsAndPlates(1.26, -len / 2 - 0.02, len / 2 + 0.02, 0.85, 0.64, true);

      // LOD <= 40m details: twin wing mirrors, front grille, hanging doorway passenger
      addSideMirrors(1.36, 1.65, -len / 2 + 0.15, 1.35);
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.44, 0.08), pool.bumperDarkMat);
      grille.position.set(0, 0.75, -len / 2 - 0.03);
      detailGroup.add(grille);

      // Hanging passenger at rear/front open doorway
      const rider = new THREE.Group();
      rider.position.set(1.42, 0.85, len * 0.28);
      const shirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.54, 0.24),
        new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.82 })
      );
      shirt.position.y = 0.6;
      const pants = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.5, 0.22),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85 })
      );
      pants.position.y = 0.14;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.76 })
      );
      head.position.y = 1.02;
      rider.add(pants, shirt, head);
      detailGroup.add(rider);

      const wz = len * 0.32;
      addWheel(-1.26, 0.48, -wz, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
      addWheel(1.26, 0.48, -wz, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
      addWheel(-1.26, 0.48, wz, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
      addWheel(1.26, 0.48, wz, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);

      return {
        group,
        bodyGroup,
        detailGroup,
        wheelDetails,
        halfWidth: 1.36,
        halfLength: len / 2,
        wheels,
        wheelRadius,
        setBraking,
        setTurnSignal,
      };
    }

    // Standard Chattogram Local Bus (dented weathered body, curved roof, hanging passengers)
    const len = 6.9;
    const busMat =
      pool.localBusBodyMats[Math.floor(Math.random() * pool.localBusBodyMats.length)];
    const roofCapMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      map: pool.dirtMap,
      roughness: 0.78,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.68, 2.38, len), busMat);
    chassis.position.y = 1.6;
    chassis.castShadow = true;

    // Rounded roof crown + front sun visor
    const roofCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(1.32, 1.32, len - 0.18, 10, 1, false, 0, Math.PI),
      roofCapMat
    );
    roofCrown.rotation.z = Math.PI / 2;
    roofCrown.rotation.y = Math.PI / 2;
    roofCrown.scale.set(1, 0.18, 1);
    roofCrown.position.y = 2.78;

    const windowBand = new THREE.Mesh(
      new THREE.BoxGeometry(2.71, 0.74, len - 0.45),
      pool.tintedGlassMat
    );
    windowBand.position.y = 2.18;
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.72, 0.08), pool.tintedGlassMat);
    rearGlass.position.set(0, 2.18, len / 2 - 0.01);
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.82, 0.08), pool.tintedGlassMat);
    frontGlass.position.set(0, 2.14, -len / 2 - 0.01);

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.28, 0.24), pool.bumperDarkMat);
    frontBumper.position.set(0, 0.48, -len / 2 - 0.05);
    const rearBumper = frontBumper.clone();
    rearBumper.position.z = len / 2 + 0.05;

    bodyGroup.add(chassis, roofCrown, windowBand, rearGlass, frontGlass, frontBumper, rearBumper);
    addCornerLightsAndPlates(1.26, -len / 2 - 0.03, len / 2 + 0.03, 0.92, 0.68, true);

    // LOD <= 40m: mirrors, visor, roof rack, grille, 2 passengers hanging at doorway
    addSideMirrors(1.36, 1.82, -len / 2 + 0.14, 1.35);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.14, 0.38), pool.bumperDarkMat);
    visor.position.set(0, 2.66, -len / 2 - 0.12);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 0.08), pool.chromeMat);
    grille.position.set(0, 0.88, -len / 2 - 0.04);
    detailGroup.add(visor, grille);

    const shirtCols = ['#1d4ed8', '#f97316', '#e11d48', '#15803d'];
    [len * 0.28, -len * 0.26].forEach((dz, idx) => {
      const pax = new THREE.Group();
      pax.position.set(1.42, 0.78, dz);
      const shirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.54, 0.24),
        new THREE.MeshStandardMaterial({
          color: shirtCols[(idx + Math.floor(Math.random() * 4)) % shirtCols.length],
          roughness: 0.82,
        })
      );
      shirt.position.y = 0.6;
      const pants = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.52, 0.22),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85 })
      );
      pants.position.y = 0.12;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75 })
      );
      head.position.y = 1.02;
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.44, 0.12),
        new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75 })
      );
      arm.position.set(-0.14, 0.92, -0.08);
      arm.rotation.z = 0.45;
      pax.add(pants, shirt, head, arm);
      detailGroup.add(pax);
    });

    const wz = len * 0.31;
    addWheel(-1.26, 0.48, -wz, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
    addWheel(1.26, 0.48, -wz, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
    addWheel(-1.26, 0.48, wz, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
    addWheel(1.26, 0.48, wz, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);

    return {
      group,
      bodyGroup,
      detailGroup,
      wheelDetails,
      halfWidth: 1.36,
      halfLength: len / 2,
      wheels,
      wheelRadius,
      setBraking,
      setTurnSignal,
    };
  }

  // =========================================================================
  // 2. PICKUP & PAINTED BANGLADESHI TRUCK
  // =========================================================================
  if (kind === 'truck') {
    const isPickup = Math.random() < 0.42;

    if (isPickup) {
      wheelRadius = 0.38;
      const pickupCols = ['#1d4ed8', '#f8fafc', '#475569', '#0f766e', '#b91c1c'];
      const pMat = new THREE.MeshStandardMaterial({
        color: pickupCols[Math.floor(Math.random() * pickupCols.length)],
        map: pool.dirtMap,
        roughness: 0.4,
        metalness: 0.25,
      });

      const cab = new THREE.Mesh(geos.pickupCab, pMat);
      cab.castShadow = true;
      const ws = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.54, 0.08), pool.tintedGlassMat);
      ws.position.set(0, 1.44, -1.2);
      ws.rotation.x = -0.52;

      // Open pickup cargo bed with side rails & cargo sacks
      const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.24, 2.08), pMat);
      bedFloor.position.set(0, 0.56, 1.08);
      const bedSideL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.54, 2.08), pMat);
      bedSideL.position.set(-0.9, 0.94, 1.08);
      const bedSideR = bedSideL.clone();
      bedSideR.position.x = 0.9;
      const tailgate = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.54, 0.14), pMat);
      tailgate.position.set(0, 0.94, 2.05);

      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.22, 0.18), pool.bumperDarkMat);
      frontBumper.position.set(0, 0.42, -2.08);
      const rearBumper = frontBumper.clone();
      rearBumper.position.z = 2.15;

      bodyGroup.add(cab, ws, bedFloor, bedSideL, bedSideR, tailgate, frontBumper, rearBumper);
      addCornerLightsAndPlates(0.92, -2.07, 2.14, 0.78, 0.62, true);

      // LOD <= 40m: steel rollbar, mirrors, cargo sacks/crates inside bed
      addSideMirrors(0.96, 1.24, -0.95, 1.05);
      const rollBar = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.65, 0.1), pool.chromeMat);
      rollBar.position.set(0, 1.44, 0.18);
      const cargo1 = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.42, 0.95),
        new THREE.MeshStandardMaterial({ color: '#d6d3d1', roughness: 0.9 })
      );
      cargo1.position.set(-0.12, 0.88, 0.85);
      const cargo2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.38, 0.7),
        new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.84 })
      );
      cargo2.position.set(0.32, 0.88, 1.52);
      detailGroup.add(rollBar, cargo1, cargo2);

      addWheel(-0.92, 0.38, -1.32, geos.tireCar, geos.rimCar, pool.steelRimMat, true);
      addWheel(0.92, 0.38, -1.32, geos.tireCar, geos.rimCar, pool.steelRimMat, true);
      addWheel(-0.92, 0.38, 1.32, geos.tireCar, geos.rimCar, pool.steelRimMat, true);
      addWheel(0.92, 0.38, 1.32, geos.tireCar, geos.rimCar, pool.steelRimMat, true);

      return {
        group,
        bodyGroup,
        detailGroup,
        wheelDetails,
        halfWidth: 1.02,
        halfLength: 2.15,
        wheels,
        wheelRadius,
        setBraking,
        setTurnSignal,
      };
    }

    // Painted Bangladeshi Cargo Truck (shaped cab + truck-art panels + wood slats + 6 wheels)
    wheelRadius = 0.48;
    const cabCols = ['#facc15', '#ea580c', '#16a34a', '#0284c7'];
    const cabMat = new THREE.MeshStandardMaterial({
      color: cabCols[Math.floor(Math.random() * cabCols.length)],
      map: pool.dirtMap,
      roughness: 0.42,
      metalness: 0.22,
    });
    const artMat = pool.truckArtMats[Math.floor(Math.random() * pool.truckArtMats.length)];
    const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.86 });

    const cab = new THREE.Mesh(geos.truckCab, cabMat);
    cab.castShadow = true;
    const ws = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.64, 0.08), pool.tintedGlassMat);
    ws.position.set(0, 1.88, -2.3);
    ws.rotation.x = -0.3;

    const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(2.54, 2.08, 4.12), artMat);
    cargoBox.position.set(0, 1.72, 1.15);
    cargoBox.castShadow = true;

    const railTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 4.18), woodMat);
    railTop.position.set(0, 2.82, 1.15);

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.32, 0.24), pool.bumperDarkMat);
    frontBumper.position.set(0, 0.52, -3.12);
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.28, 0.22), pool.bumperDarkMat);
    rearBumper.position.set(0, 0.56, 3.24);

    bodyGroup.add(cab, ws, cargoBox, railTop, frontBumper, rearBumper);
    addCornerLightsAndPlates(1.18, -3.1, 3.23, 0.88, 0.62, true);

    // LOD <= 40m: mirrors, visor, chrome grille, mudflaps
    addSideMirrors(1.18, 1.88, -2.1, 1.3);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.16, 0.42), pool.chromeMat);
    visor.position.set(0, 2.28, -2.52);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.48, 0.08), pool.chromeMat);
    grille.position.set(0, 1.0, -3.11);
    detailGroup.add(visor, grille);

    addWheel(-1.18, 0.48, -2.1, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
    addWheel(1.18, 0.48, -2.1, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
    addWheel(-1.18, 0.48, 0.6, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
    addWheel(1.18, 0.48, 0.6, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
    addWheel(-1.18, 0.48, 2.2, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);
    addWheel(1.18, 0.48, 2.2, geos.tireHeavy, geos.rimHeavy, pool.steelRimMat, true);

    return {
      group,
      bodyGroup,
      detailGroup,
      wheelDetails,
      halfWidth: 1.3,
      halfLength: 3.2,
      wheels,
      wheelRadius,
      setBraking,
      setTurnSignal,
    };
  }

  // =========================================================================
  // 3. CNG AUTOS IN DIFFERENT COLORS
  // =========================================================================
  if (kind === 'cng_ai') {
    wheelRadius = 0.3;
    const cngPalette = ['#16a34a', '#eab308', '#0d9488', '#ea580c', '#2563eb', '#be123c'];
    const cngMat = new THREE.MeshStandardMaterial({
      color: cngPalette[Math.floor(Math.random() * cngPalette.length)],
      map: pool.dirtMap,
      roughness: 0.38,
      metalness: 0.22,
    });

    const nose = new THREE.Mesh(geos.cngNose, cngMat);
    nose.scale.set(0.96, 0.96, 0.94);
    nose.castShadow = true;
    const rear = new THREE.Mesh(geos.cngRearTub, cngMat);
    rear.scale.set(0.96, 0.96, 0.98);
    rear.castShadow = true;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.16, 1.94), pool.cngRoofCanvasMat);
    roof.position.set(0, 1.84, 0.2);
    const rearCurtain = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.46, 0.08),
      pool.cngRoofCanvasMat
    );
    rearCurtain.position.set(0, 1.56, 1.2);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.64, 0.04), pool.tintedGlassMat);
    ws.position.set(0, 1.46, -0.72);
    ws.rotation.x = 0.22;

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.14), pool.bumperDarkMat);
    bumper.position.set(0, 0.44, 1.36);

    bodyGroup.add(nose, rear, roof, rearCurtain, ws, bumper);
    addCornerLightsAndPlates(0.72, -1.28, 1.35, 0.82, 0.62, true);

    // LOD <= 40m: wire-cage side grilles, mirrors, side flaps, passengers
    addSideMirrors(0.58, 1.4, -0.75, 0.8);
    [-0.72, 0.72].forEach((cx) => {
      const cage = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.56, 1.12), pool.chromeMat);
      cage.position.set(cx, 1.38, 0.54);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 1.82), pool.cngRoofCanvasMat);
      flap.position.set(cx * 1.03, 1.72, 0.2);
      detailGroup.add(cage, flap);
    });
    const p1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.42, 0.22),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.85 })
    );
    p1.position.set(-0.28, 1.05, 0.65);
    const p2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.42, 0.22),
      new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.85 })
    );
    p2.position.set(0.28, 1.05, 0.65);
    detailGroup.add(p1, p2);

    addWheel(0, 0.3, -1.12, geos.tireCng, geos.rimCng, pool.alloyRimMat, true);
    addWheel(-0.72, 0.3, 0.75, geos.tireCng, geos.rimCng, pool.alloyRimMat, true);
    addWheel(0.72, 0.3, 0.75, geos.tireCng, geos.rimCng, pool.alloyRimMat, true);

    return {
      group,
      bodyGroup,
      detailGroup,
      wheelDetails,
      halfWidth: 0.76,
      halfLength: 1.35,
      wheels,
      wheelRadius,
      setBraking,
      setTurnSignal,
    };
  }

  // =========================================================================
  // 4. CYCLE RICKSHAWS WITH PAINTED BACK PANELS
  // =========================================================================
  if (kind === 'rickshaw') {
    wheelRadius = 0.36;
    const hoodColors = ['#e11d48', '#2563eb', '#9333ea', '#059669', '#ea580c'];
    const hoodMat = new THREE.MeshStandardMaterial({
      color: hoodColors[Math.floor(Math.random() * hoodColors.length)],
      roughness: 0.68,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.48 });
    const seatMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.72 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.48, 0.84), seatMat);
    seat.position.set(0, 0.74, 0.42);
    const hood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.64, 1.18, 10, 1, false, 0, Math.PI),
      hoodMat
    );
    hood.rotation.z = Math.PI / 2;
    hood.position.set(0, 1.34, 0.48);
    hood.castShadow = true;

    const hoodBand = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.14, 0.14), trimMat);
    hoodBand.position.set(0, 1.38, 1.05);

    // Colorful painted Bangla rickshaw-art back panel
    const artMat =
      pool.rickshawArtMats[Math.floor(Math.random() * pool.rickshawArtMats.length)];
    const artPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.44), artMat);
    artPlate.position.set(0, 0.75, 0.86);

    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.4), pool.bumperDarkMat);
    stem.position.set(0, 0.58, -0.3);

    const riderBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 0.65, 8),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.8 })
    );
    riderBody.position.set(0, 1.1, -0.58);
    const riderHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#a16207', roughness: 0.72 })
    );
    riderHead.position.set(0, 1.56, -0.58);

    // Rear small taillight reflector
    const reflector = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.05), tailMat);
    reflector.position.set(0, 0.5, 0.86);

    bodyGroup.add(seat, hood, hoodBand, artPlate, stem, riderBody, riderHead, reflector);

    // LOD <= 40m: handlebars, mirror, seated passengers, hood side trims
    const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.07, 0.07), pool.chromeMat);
    handlebar.position.set(0, 1.15, -0.92);
    const passL = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.44, 0.24),
      new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.8 })
    );
    passL.position.set(-0.24, 1.14, 0.48);
    const passR = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.44, 0.24),
      new THREE.MeshStandardMaterial({ color: '#14b8a6', roughness: 0.8 })
    );
    passR.position.set(0.24, 1.14, 0.48);
    detailGroup.add(handlebar, passL, passR);

    addWheel(0, 0.36, -0.95, geos.tireMoto, geos.rimMoto, pool.chromeMat, true);
    addWheel(-0.56, 0.36, 0.55, geos.tireMoto, geos.rimMoto, pool.chromeMat, true);
    addWheel(0.56, 0.36, 0.55, geos.tireMoto, geos.rimMoto, pool.chromeMat, true);

    return {
      group,
      bodyGroup,
      detailGroup,
      wheelDetails,
      halfWidth: 0.68,
      halfLength: 1.2,
      wheels,
      wheelRadius,
      setBraking,
      setTurnSignal,
    };
  }

  // =========================================================================
  // 5. MOTORBIKES WITH RIDER AND PILLION
  // =========================================================================
  if (kind === 'bike') {
    wheelRadius = 0.34;
    const bikeColors = ['#1d4ed8', '#18181b', '#dc2626', '#16a34a', '#ea580c'];
    const tankMat = new THREE.MeshStandardMaterial({
      color: bikeColors[Math.floor(Math.random() * bikeColors.length)],
      roughness: 0.24,
      metalness: 0.55,
    });
    const riderShirtMat = new THREE.MeshStandardMaterial({
      color: Math.random() < 0.65 ? '#f97316' : '#1e293b',
      roughness: 0.82,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75 });
    const helmetMat = new THREE.MeshStandardMaterial({
      color: Math.random() < 0.5 ? '#18181b' : '#facc15',
      roughness: 0.24,
      metalness: 0.35,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 1.32), pool.bumperDarkMat);
    chassis.position.set(0, 0.58, 0);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.25, 0.54), tankMat);
    tank.position.set(0, 0.88, -0.24);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.74), pool.tireMat);
    seat.position.set(0, 0.82, 0.32);

    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), pool.headlightLensMat);
    hl.position.set(0, 0.92, -0.74);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.06), tailMat);
    tl.position.set(0, 0.82, 0.74);

    const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.26), riderShirtMat);
    riderTorso.position.set(0, 1.18, 0.06);
    riderTorso.rotation.x = -0.24;
    const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), helmetMat);
    riderHead.position.set(0, 1.56, -0.02);

    // Pillion passenger seated behind rider
    const pillionTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.52, 0.24),
      new THREE.MeshStandardMaterial({
        color: Math.random() < 0.5 ? '#eab308' : '#0284c7',
        roughness: 0.85,
      })
    );
    pillionTorso.position.set(0, 1.16, 0.44);
    pillionTorso.rotation.x = -0.14;
    const pillionHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skinMat);
    pillionHead.position.set(0, 1.52, 0.4);

    bodyGroup.add(chassis, tank, seat, hl, tl, riderTorso, riderHead, pillionTorso, pillionHead);

    // LOD <= 40m: forks, handlebar, mirrors, muffler, Bangla rear plate, turn indicators
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.68, 8), pool.chromeMat);
    fork.position.set(0, 0.68, -0.64);
    fork.rotation.x = -0.32;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.06), pool.chromeMat);
    handle.position.set(0, 1.04, -0.52);
    const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.72, 8), pool.chromeMat);
    muffler.rotation.x = Math.PI / 2;
    muffler.position.set(0.22, 0.44, 0.44);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.12), pickPrivPlate());
    plate.position.set(0, 0.68, 0.76);
    const indL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), leftIndMat);
    indL.position.set(-0.16, 0.82, 0.72);
    const indR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), rightIndMat);
    indR.position.set(0.16, 0.82, 0.72);
    detailGroup.add(fork, handle, muffler, plate, indL, indR);
    addSideMirrors(0.28, 1.1, -0.52, 0.55);

    addWheel(0, 0.34, -0.7, geos.tireMoto, geos.rimMoto, pool.alloyRimMat, true);
    addWheel(0, 0.34, 0.64, geos.tireMoto, geos.rimMoto, pool.alloyRimMat, true);

    return {
      group,
      bodyGroup,
      detailGroup,
      wheelDetails,
      halfWidth: 0.42,
      halfLength: 1.0,
      wheels,
      wheelRadius,
      setBraking,
      setTurnSignal,
    };
  }

  // =========================================================================
  // 6. THELAGARI (Wooden Pushcart)
  // =========================================================================
  if (kind === 'thelagari') {
    wheelRadius = 0.45;
    const woodMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.9 });
    const sackMat = new THREE.MeshStandardMaterial({ color: '#d6d3d1', roughness: 0.95 });
    const crateMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.82 });
    const pusherShirt = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.8 });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.14, 2.2), woodMat);
    deck.position.set(0, 0.62, -0.2);
    deck.castShadow = true;

    const cargo1 = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.58, 0.9), sackMat);
    cargo1.position.set(0, 0.98, -0.58);
    cargo1.castShadow = true;
    const cargo2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.52, 0.78), crateMat);
    cargo2.position.set(0, 0.95, 0.32);
    cargo2.castShadow = true;

    const pusherBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.26), pusherShirt);
    pusherBody.position.set(0, 1.08, 1.48);
    pusherBody.rotation.x = -0.35;
    const pusherHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75 })
    );
    pusherHead.position.set(0, 1.48, 1.34);

    bodyGroup.add(deck, cargo1, cargo2, pusherBody, pusherHead);

    const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.95), woodMat);
    handleL.position.set(-0.52, 0.85, 1.2);
    handleL.rotation.x = 0.28;
    const handleR = handleL.clone();
    handleR.position.x = 0.52;
    detailGroup.add(handleL, handleR);

    addWheel(-0.76, 0.45, -0.2, geos.tireHeavy, geos.rimHeavy, woodMat, true);
    addWheel(0.76, 0.45, -0.2, geos.tireHeavy, geos.rimHeavy, woodMat, true);

    return {
      group,
      bodyGroup,
      detailGroup,
      wheelDetails,
      halfWidth: 0.85,
      halfLength: 1.55,
      wheels,
      wheelRadius,
      setBraking,
      setTurnSignal,
    };
  }

  // =========================================================================
  // 7. PRIVATE CARS: SEDAN, MICROBUS (NOAH), & AMBULANCE (kind === 'car')
  // =========================================================================
  wheelRadius = 0.35;
  const carRoll = Math.random();
  const isAmbulance = carRoll < 0.2;
  const isMicrobus = !isAmbulance && carRoll < 0.62;

  if (isAmbulance) {
    const whiteRescueMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      map: pool.dirtMap,
      roughness: 0.3,
      metalness: 0.24,
    });
    const ambBody = new THREE.Mesh(geos.ambulanceBody, whiteRescueMat);
    ambBody.castShadow = true;

    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.56, 0.08), pool.tintedGlassMat);
    ws.position.set(0, 1.52, -1.52);
    ws.rotation.x = -0.52;
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.48, 0.06), pool.tintedGlassMat);
    rearGlass.position.set(0, 1.52, 2.13);

    const sideDecalL = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 1.15), pool.ambulanceSideMat);
    sideDecalL.position.set(-0.995, 1.18, 0.35);
    sideDecalL.rotation.y = -Math.PI / 2;
    const sideDecalR = sideDecalL.clone();
    sideDecalR.position.x = 0.995;
    sideDecalR.rotation.y = Math.PI / 2;

    const rearStripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.24, 0.05),
      new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4 })
    );
    rearStripe.position.set(0, 1.05, 2.12);
    const sideWinL = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.46), pool.tintedGlassMat);
    sideWinL.position.set(-1.002, 1.62, 0.72);
    sideWinL.rotation.y = -Math.PI / 2;
    const sideWinR = sideWinL.clone();
    sideWinR.position.x = 1.002;
    sideWinR.rotation.y = Math.PI / 2;

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.22, 0.16), pool.bumperDarkMat);
    frontBumper.position.set(0, 0.42, -2.14);
    const rearBumper = frontBumper.clone();
    rearBumper.position.z = 2.14;

    // Emergency roof lightbar (alternating red & blue beacons!)
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.1, 0.28), pool.bumperDarkMat);
    barBase.position.set(0, 2.04, -0.92);
    const redBeaconMat = new THREE.MeshStandardMaterial({
      color: '#dc2626',
      emissive: '#ef4444',
      emissiveIntensity: 2.2,
      roughness: 0.15,
    });
    const blueBeaconMat = new THREE.MeshStandardMaterial({
      color: '#1d4ed8',
      emissive: '#38bdf8',
      emissiveIntensity: 0.4,
      roughness: 0.15,
    });
    const redBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.24), redBeaconMat);
    redBeacon.position.set(-0.32, 2.14, -0.92);
    const blueBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.24), blueBeaconMat);
    blueBeacon.position.set(0.32, 2.14, -0.92);

    bodyGroup.add(
      ambBody,
      ws,
      sideWinL,
      sideWinR,
      rearGlass,
      sideDecalL,
      sideDecalR,
      rearStripe,
      frontBumper,
      rearBumper,
      barBase,
      redBeacon,
      blueBeacon
    );
    addCornerLightsAndPlates(0.92, -2.14, 2.14, 0.84, 0.6, false);

    addSideMirrors(0.98, 1.32, -1.28, 1.05);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.28, 0.06), pool.chromeMat);
    grille.position.set(0, 0.66, -2.14);
    detailGroup.add(grille);

    addWheel(-0.92, 0.35, -1.34, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);
    addWheel(0.92, 0.35, -1.34, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);
    addWheel(-0.92, 0.35, 1.34, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);
    addWheel(0.92, 0.35, 1.34, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);

    const setEmergencyPhase = (phase: number) => {
      const redActive = Math.sin(phase) > 0;
      redBeaconMat.emissiveIntensity = redActive ? 3.2 : 0.25;
      blueBeaconMat.emissiveIntensity = redActive ? 0.25 : 3.2;
    };

    return {
      group,
      bodyGroup,
      detailGroup,
      wheelDetails,
      halfWidth: 1.0,
      halfLength: 2.15,
      wheels,
      wheelRadius,
      isEmergency: true,
      setBraking,
      setTurnSignal,
      setEmergencyPhase,
    };
  }

  if (isMicrobus) {
    const vanColors = ['#f8fafc', '#e2e8f0', '#cbd5e1', '#fef3c7'];
    const vanMat = new THREE.MeshStandardMaterial({
      color: vanColors[Math.floor(Math.random() * vanColors.length)],
      map: pool.dirtMap,
      roughness: 0.28,
      metalness: 0.35,
    });

    const vanBody = new THREE.Mesh(geos.microbusBody, vanMat);
    vanBody.castShadow = true;
    const vanGlass = new THREE.Mesh(geos.microbusGlass, pool.tintedGlassMat);
    const frontWs = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.56, 0.08), pool.tintedGlassMat);
    frontWs.position.set(0, 1.42, -1.52);
    frontWs.rotation.x = -0.6;
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.48, 0.06), pool.tintedGlassMat);
    rearGlass.position.set(0, 1.38, 2.09);

    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.22, 0.16), pool.bumperDarkMat);
    frontBumper.position.set(0, 0.42, -2.14);
    const rearBumper = frontBumper.clone();
    rearBumper.position.z = 2.12;

    bodyGroup.add(vanBody, vanGlass, frontWs, rearGlass, frontBumper, rearBumper);
    addCornerLightsAndPlates(0.92, -2.14, 2.12, 0.84, 0.62, false);

    // LOD <= 40m: mirrors, roof rack bars, chrome grille
    addSideMirrors(0.96, 1.24, -1.25, 1.0);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.24, 0.06), pool.chromeMat);
    grille.position.set(0, 0.66, -2.14);
    [-0.64, 0.64].forEach((rx) => {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 2.3), pool.bumperDarkMat);
      rack.position.set(rx, 1.88, 0.35);
      detailGroup.add(rack);
    });
    detailGroup.add(grille);

    addWheel(-0.92, 0.35, -1.34, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);
    addWheel(0.92, 0.35, -1.34, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);
    addWheel(-0.92, 0.35, 1.34, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);
    addWheel(0.92, 0.35, 1.34, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);

    return {
      group,
      bodyGroup,
      detailGroup,
      wheelDetails,
      halfWidth: 0.98,
      halfLength: 2.15,
      wheels,
      wheelRadius,
      setBraking,
      setTurnSignal,
    };
  }

  // Shaped Sedan (extruded beveled silhouette + tinted glass + mirrors + bumpers + plates)
  const sedanColors = ['#f8fafc', '#2563eb', '#475569', '#eab308', '#0d9488', '#dc2626', '#cbd5e1'];
  const sedanMat = new THREE.MeshStandardMaterial({
    color: sedanColors[Math.floor(Math.random() * sedanColors.length)],
    map: pool.dirtMap,
    roughness: 0.24,
    metalness: 0.56,
    envMapIntensity: 1.35,
  });

  const sedanBody = new THREE.Mesh(geos.sedanBody, sedanMat);
  sedanBody.castShadow = true;
  const sedanGlass = new THREE.Mesh(geos.sedanGlass, pool.tintedGlassMat);
  sedanGlass.scale.set(1.16, 1, 1);

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.2, 0.16), pool.bumperDarkMat);
  frontBumper.position.set(0, 0.4, -1.96);
  const rearBumper = frontBumper.clone();
  rearBumper.position.z = 1.94;

  bodyGroup.add(sedanBody, sedanGlass, frontBumper, rearBumper);
  addCornerLightsAndPlates(0.88, -1.97, 1.95, 0.74, 0.54, false);

  // LOD <= 40m: mirrors, chrome grille, exhaust pipe
  addSideMirrors(0.92, 1.04, -0.78, 0.95);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.22, 0.06), pool.chromeMat);
  grille.position.set(0, 0.58, -1.97);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 8), pool.chromeMat);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(-0.56, 0.3, 1.96);
  detailGroup.add(grille, exhaust);

  addWheel(-0.9, 0.35, -1.24, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);
  addWheel(0.9, 0.35, -1.24, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);
  addWheel(-0.9, 0.35, 1.24, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);
  addWheel(0.9, 0.35, 1.24, geos.tireCar, geos.rimCar, pool.alloyRimMat, true);

  return {
    group,
    bodyGroup,
    detailGroup,
    wheelDetails,
    halfWidth: 0.98,
    halfLength: 1.98,
    wheels,
    wheelRadius,
    setBraking,
    setTurnSignal,
  };
}

export function createVipConvoyVehicle(
  role: 'police' | 'vip',
  maxAnisotropy: number
): TrafficModelRig {
  const pool = getVehicleAssetPool(maxAnisotropy);
  const geos = getSharedVehicleGeos();

  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const detailGroup = new THREE.Group();
  bodyGroup.add(detailGroup);
  group.add(bodyGroup);

  const wheels: THREE.Object3D[] = [];
  const wheelDetails: THREE.Object3D[] = [];
  const wheelRadius = 0.36;

  const tailMat = new THREE.MeshStandardMaterial({
    color: '#991b1b',
    emissive: '#ef4444',
    emissiveIntensity: 0.85,
    roughness: 0.22,
  });
  const leftIndMat = new THREE.MeshStandardMaterial({
    color: '#92400e',
    emissive: '#f59e0b',
    emissiveIntensity: 0.12,
    roughness: 0.25,
  });
  const rightIndMat = new THREE.MeshStandardMaterial({
    color: '#92400e',
    emissive: '#f59e0b',
    emissiveIntensity: 0.12,
    roughness: 0.25,
  });

  const addWheel = (x: number, y: number, z: number) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(geos.tireCar, pool.tireMat);
    const hub = new THREE.Mesh(geos.rimCar, pool.alloyRimMat);
    w.add(tire, hub);
    w.position.set(x, y, z);
    group.add(w);
    wheels.push(w);
  };

  const redBeaconMat = new THREE.MeshStandardMaterial({
    color: '#dc2626',
    emissive: '#ef4444',
    emissiveIntensity: 2.5,
    roughness: 0.15,
  });
  const blueBeaconMat = new THREE.MeshStandardMaterial({
    color: '#1d4ed8',
    emissive: '#38bdf8',
    emissiveIntensity: 0.4,
    roughness: 0.15,
  });

  if (role === 'police') {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.28,
      metalness: 0.35,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: '#1d4ed8',
      roughness: 0.35,
    });
    const body = new THREE.Mesh(geos.pickupCab, bodyMat);
    body.castShadow = true;
    const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.72, 2.02), bodyMat);
    rearDeck.position.set(0, 0.78, 1.05);
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.22, 3.85), stripeMat);
    stripeL.position.set(0, 0.74, 0.04);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.52, 0.08), pool.tintedGlassMat);
    ws.position.set(0, 1.44, -1.2);
    ws.rotation.x = -0.52;

    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 0.26), pool.bumperDarkMat);
    barBase.position.set(0, 1.82, -0.55);
    const redBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.22), redBeaconMat);
    redBeacon.position.set(-0.34, 1.92, -0.55);
    const blueBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.22), blueBeaconMat);
    blueBeacon.position.set(0.34, 1.92, -0.55);

    bodyGroup.add(body, rearDeck, stripeL, ws, barBase, redBeacon, blueBeacon);
  } else {
    const vipMat = new THREE.MeshStandardMaterial({
      color: '#09090b',
      roughness: 0.18,
      metalness: 0.78,
    });
    const body = new THREE.Mesh(geos.microbusBody, vipMat);
    body.scale.set(1.06, 0.94, 1.04);
    body.castShadow = true;
    const glass = new THREE.Mesh(geos.microbusGlass, pool.tintedGlassMat);
    glass.scale.set(1.06, 0.94, 1.04);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.34, 0.08), pool.chromeMat);
    grille.position.set(0, 0.66, -2.18);

    // Small VIP flag staff on front fender + dual grille strobes
    const flagStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), pool.chromeMat);
    flagStaff.position.set(-0.88, 1.18, -1.85);
    const flagCloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.22, 0.34),
      new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.6 })
    );
    flagCloth.position.set(-0.88, 1.34, -1.68);

    const redBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.1), redBeaconMat);
    redBeacon.position.set(-0.42, 0.72, -2.22);
    const blueBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.1), blueBeaconMat);
    blueBeacon.position.set(0.42, 0.72, -2.22);

    bodyGroup.add(body, glass, grille, flagStaff, flagCloth, redBeacon, blueBeacon);
  }

  [-1, 1].forEach((s) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), tailMat);
    tl.position.set(s * 0.74, 0.84, 2.14);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), pool.headlightLensMat);
    hl.position.set(s * 0.74, 0.8, -2.14);
    bodyGroup.add(tl, hl);
  });

  addWheel(-0.92, 0.36, -1.32);
  addWheel(0.92, 0.36, -1.32);
  addWheel(-0.92, 0.36, 1.32);
  addWheel(0.92, 0.36, 1.32);

  return {
    group,
    bodyGroup,
    detailGroup,
    wheelDetails,
    halfWidth: 1.02,
    halfLength: 2.15,
    wheels,
    wheelRadius,
    isEmergency: true,
    setBraking: (braking: boolean) => {
      tailMat.emissiveIntensity = braking ? 2.8 : 0.85;
    },
    setTurnSignal: (dir: -1 | 0 | 1 | 2, blinkOn: boolean) => {
      leftIndMat.emissiveIntensity = blinkOn && (dir === -1 || dir === 2) ? 2.5 : 0.1;
      rightIndMat.emissiveIntensity = blinkOn && (dir === 1 || dir === 2) ? 2.5 : 0.1;
    },
    setEmergencyPhase: (phase: number) => {
      const redActive = Math.sin(phase) > 0;
      redBeaconMat.emissiveIntensity = redActive ? 3.5 : 0.25;
      blueBeaconMat.emissiveIntensity = redActive ? 0.25 : 3.5;
    },
  };
}
