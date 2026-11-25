import * as THREE from 'three';
import { BILLBOARD_ADS, WALL_POSTERS } from '../config/chattogramData';
import type { AreaBuildingStyle, CngStickerOption, TrafficLightState, VehicleKind } from '../types/game';
import {
  createAreaSignTexture,
  createAwningStripeTexture,
  createBillboardTexture,
  createBuildingFacadeTexture,
  createBusSignTexture,
  createContactShadowTexture,
  createLightGlowTexture,
  createMedianCurbTexture,
  createMedianTopTexture,
  createNumberPlateTexture,
  createOverheadSignTexture,
  createRickshawArtTexture,
  createShopSignTexture,
  createSignalSignTexture,
  createStickerTexture,
  createStopLineTexture,
  createWallPosterTexture,
  createZonePadTexture,
} from './textures';

let sharedContactShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowTex(): THREE.CanvasTexture {
  if (!sharedContactShadowTex) {
    sharedContactShadowTex = createContactShadowTexture();
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

export interface CngRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  paintMaterials: THREE.MeshStandardMaterial[];
  stickerMesh: THREE.Mesh;
  boostFlameLeft: THREE.Mesh;
  boostFlameRight: THREE.Mesh;
  updateAppearance: (colorHex: string, sticker: CngStickerOption, maxAnisotropy: number) => void;
  setLightsGlow: (strength: number) => void;
}

export function createCngModel(
  colorHex: string,
  sticker: CngStickerOption,
  maxAnisotropy: number
): CngRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const paintMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.34,
    metalness: 0.25,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.88,
    metalness: 0.05,
  });
  const cageMat = new THREE.MeshStandardMaterial({
    color: '#d4d4d8',
    roughness: 0.22,
    metalness: 0.85,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#27272a',
    roughness: 0.45,
    metalness: 0.65,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.88,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#e4e4e7',
    roughness: 0.25,
    metalness: 0.85,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.48,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: '#7c2d12',
    roughness: 0.8,
    metalness: 0.05,
  });

  // Contact shadow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 3.6),
    new THREE.MeshBasicMaterial({
      map: getContactShadowTex(),
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  group.add(shadowPlane);

  const wheels: THREE.Object3D[] = [];
  const makeWheel = (x: number, y: number, z: number, scale = 1) => {
    const wGroup = new THREE.Group();
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32 * scale, 0.32 * scale, 0.2 * scale, 16),
      tireMat
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16 * scale, 0.16 * scale, 0.22 * scale, 12),
      rimMat
    );
    hub.rotation.z = Math.PI / 2;
    wGroup.add(tire, hub);
    wGroup.position.set(x, y, z);
    group.add(wGroup);
    wheels.push(wGroup);
  };

  makeWheel(0, 0.3, -1.25, 0.94);
  makeWheel(-0.76, 0.32, 0.82, 1);
  makeWheel(0.76, 0.32, 0.82, 1);

  const frontFork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.72, 10), darkMetalMat);
  frontFork.position.set(0, 0.65, -1.22);
  frontFork.rotation.x = -0.22;
  bodyGroup.add(frontFork);

  const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.62), paintMat);
  frontFender.position.set(0, 0.6, -1.24);
  frontFender.castShadow = true;
  bodyGroup.add(frontFender);

  const floorDeck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 2.35), darkMetalMat);
  floorDeck.position.set(0, 0.38, 0.06);
  floorDeck.castShadow = true;
  bodyGroup.add(floorDeck);

  const noseLower = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.74, 0.76), paintMat);
  noseLower.position.set(0, 0.8, -0.82);
  noseLower.castShadow = true;
  bodyGroup.add(noseLower);

  const noseTip = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.56, 0.72, 12), paintMat);
  noseTip.position.set(0, 0.8, -1.12);
  noseTip.scale.set(1.15, 1, 0.65);
  noseTip.castShadow = true;
  bodyGroup.add(noseTip);

  const rearTub = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.76, 1.38), paintMat);
  rearTub.position.set(0, 0.82, 0.58);
  rearTub.castShadow = true;
  bodyGroup.add(rearTub);

  const rearEngine = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.62, 0.34), paintMat);
  rearEngine.position.set(0, 0.74, 1.32);
  rearEngine.castShadow = true;
  bodyGroup.add(rearEngine);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.12, 0.14), darkMetalMat);
  rearBumper.position.set(0, 0.44, 1.48);
  bodyGroup.add(rearBumper);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), cageMat);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(-0.45, 0.34, 1.42);
  bodyGroup.add(exhaust);

  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.44), seatMat);
  driverSeat.position.set(0, 0.66, -0.35);
  const rearBench = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.26, 0.52), seatMat);
  rearBench.position.set(0, 0.72, 0.75);
  const rearBackrest = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.56, 0.14), seatMat);
  rearBackrest.position.set(0, 1.05, 1.02);
  bodyGroup.add(driverSeat, rearBench, rearBackrest);

  // Subtle driver & passenger silhouettes seated inside for authentic rear chase silhouette
  const skinSil = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.78 });
  const driverBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.44, 0.22),
    new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.85 })
  );
  driverBody.position.set(0, 0.98, -0.32);
  const driverHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinSil);
  driverHead.position.set(0, 1.32, -0.32);
  bodyGroup.add(driverBody, driverHead);

  const wsFrameLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.82, 8), darkMetalMat);
  wsFrameLeft.position.set(-0.54, 1.52, -0.74);
  wsFrameLeft.rotation.x = 0.22;
  const wsFrameRight = wsFrameLeft.clone();
  wsFrameRight.position.x = 0.54;
  bodyGroup.add(wsFrameLeft, wsFrameRight);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.7, 0.04), glassMat);
  windshield.position.set(0, 1.52, -0.75);
  windshield.rotation.x = 0.22;
  bodyGroup.add(windshield);

  const roofMain = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 1.98), roofMat);
  roofMain.position.set(0, 1.92, 0.22);
  roofMain.castShadow = true;
  const roofCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.74, 0.74, 1.92, 12, 1, false, 0, Math.PI),
    roofMat
  );
  roofCrown.rotation.z = Math.PI / 2;
  roofCrown.rotation.y = Math.PI / 2;
  roofCrown.scale.set(1, 0.25, 1);
  roofCrown.position.set(0, 1.96, 0.22);
  bodyGroup.add(roofMain, roofCrown);

  // Decorative brass/pink canopy trim along rear roofline
  const rearTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.54, 0.1, 0.08),
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.45 })
  );
  rearTrim.position.set(0, 1.88, 1.21);
  bodyGroup.add(rearTrim);

  const rearCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.72, 0.08), roofMat);
  rearCanopy.position.set(0, 1.52, 1.2);
  bodyGroup.add(rearCanopy);

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
    const diag2 = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1.15, 6), cageMat);
    diag2.rotation.x = -1.05;
    diag2.position.y = 0.1;
    cageGroup.add(diag1, diag2);

    bodyGroup.add(cageGroup);
  };
  buildSideCage(-0.76);
  buildSideCage(0.76);

  const headMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#facc15',
    emissiveIntensity: 1.35,
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
    opacity: 0.22,
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
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  [-0.36, 0.36].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), headMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, 0.88, -1.26);
    const glow = new THREE.Sprite(headGlowMat);
    glow.position.set(x, 0.88, -1.32);
    glow.scale.set(0.7, 0.7, 1);
    bodyGroup.add(hl, glow);
  });

  const headBeamPool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 7.5), beamMat);
  headBeamPool.rotation.x = -Math.PI / 2;
  headBeamPool.position.set(0, 0.03, -4.8);
  group.add(headBeamPool);

  [-0.56, 0.56].forEach((x) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.06), tailMat);
    tl.position.set(x, 0.86, 1.48);
    tl.rotation.z = x < 0 ? -0.22 : 0.22;
    const glow = new THREE.Sprite(tailGlowMat);
    glow.position.set(x, 0.86, 1.54);
    glow.scale.set(0.65, 0.52, 1);
    bodyGroup.add(tl, glow);
  });

  [-0.64, 0.64].forEach((x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.03), darkMetalMat);
    arm.position.set(x, 1.42, -0.78);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), darkMetalMat);
    mirror.position.set(x + Math.sign(x) * 0.08, 1.45, -0.78);
    bodyGroup.add(arm, mirror);
  });

  const plateTex = createNumberPlateTexture(maxAnisotropy);
  const plateMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.22),
    new THREE.MeshBasicMaterial({ map: plateTex })
  );
  plateMesh.position.set(0, 0.68, 1.5);
  bodyGroup.add(plateMesh);

  const stickerTex = createStickerTexture(sticker.text, sticker.bgHex, sticker.textHex, maxAnisotropy);
  const stickerMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.36),
    new THREE.MeshBasicMaterial({ map: stickerTex })
  );
  stickerMesh.position.set(0, 1.48, 1.25);
  bodyGroup.add(stickerMesh);

  const flameMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.9,
  });
  const boostFlameLeft = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.8, 8), flameMat);
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
    headMat.emissiveIntensity = 0.8 + strength * 2.2;
    tailMat.emissiveIntensity = 1.0 + strength * 1.4;
    headGlowMat.opacity = 0.16 + strength * 0.62;
    tailGlowMat.opacity = 0.28 + strength * 0.5;
    beamMat.opacity = strength * 0.22;
  };

  return {
    group,
    bodyGroup,
    wheels,
    paintMaterials: [paintMat],
    stickerMesh,
    boostFlameLeft,
    boostFlameRight,
    updateAppearance,
    setLightsGlow,
  };
}

export interface CockpitRig {
  group: THREE.Group;
  handlebarPivot: THREE.Group;
  ornamentPivot: THREE.Group;
  updateAppearance: (colorHex: string) => void;
}

export function createCockpitModel(colorHex: string): CockpitRig {
  const group = new THREE.Group();
  group.visible = false;

  const paintMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.34,
    metalness: 0.25,
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
    metalness: 0.7,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#e4e4e7',
    roughness: 0.2,
    metalness: 0.9,
  });
  const cageMat = new THREE.MeshStandardMaterial({
    color: '#d4d4d8',
    roughness: 0.24,
    metalness: 0.85,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: '#27272a',
    roughness: 0.9,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: '#b45309',
    roughness: 0.72,
  });
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: '#0f766e',
    roughness: 0.85,
  });

  // Front hood & mudguard visible over windshield cowl
  const noseCowl = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.38, 0.68), paintMat);
  noseCowl.position.set(0, 0.88, -1.04);
  const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.56), paintMat);
  frontFender.position.set(0, 0.64, -1.28);
  group.add(noseCowl, frontFender);

  // Dashboard inner ledge
  const dashDeck = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.14, 0.32), darkMetalMat);
  dashDeck.position.set(0, 1.06, -0.78);
  group.add(dashDeck);

  // Windshield A-pillars & Top Header Frame
  const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.94, 8), darkMetalMat);
  pillarL.position.set(-0.62, 1.48, -0.82);
  pillarL.rotation.x = 0.2;
  const pillarR = pillarL.clone();
  pillarR.position.x = 0.62;

  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.08, 0.12), darkMetalMat);
  topHeader.position.set(0, 1.92, -0.74);

  const lowerRim = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.08, 0.08), paintMat);
  lowerRim.position.set(0, 1.12, -0.88);
  group.add(pillarL, pillarR, topHeader, lowerRim);

  // Overhead Canvas Roof Canopy (lines visible above & behind when looking up/back)
  const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 2.05), roofMat);
  roofPanel.position.set(0, 1.98, 0.24);
  group.add(roofPanel);

  // Side support posts & partial Wire-Cage Grilles (খাঁচা-জালি) on left/right sides
  const buildCockpitSideCage = (sideX: number) => {
    const cage = new THREE.Group();
    cage.position.set(sideX, 1.42, 0.15);

    const midPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8), darkMetalMat);
    midPost.position.set(0, 0.08, -0.2);
    const rearPost = midPost.clone();
    rearPost.position.z = 0.95;

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 1.25), cageMat);
    topRail.position.set(0, 0.44, 0.36);
    const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.25), cageMat);
    midRail.position.set(0, 0.14, 0.36);
    const botRail = midRail.clone();
    botRail.position.y = -0.18;

    const vBar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 6), cageMat);
    vBar1.position.set(0, 0.13, 0.14);
    const vBar2 = vBar1.clone();
    vBar2.position.z = 0.54;

    const diag = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.92, 6), cageMat);
    diag.rotation.x = 1.05;
    diag.position.set(0, 0.13, 0.36);

    cage.add(midPost, rearPost, topRail, midRail, botRail, vBar1, vBar2, diag);
    group.add(cage);
  };
  buildCockpitSideCage(-0.76);
  buildCockpitSideCage(0.76);

  // Rear Cabin Frame (visible when holding V to look back)
  const rearUpper = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.25, 0.08), roofMat);
  rearUpper.position.set(0, 1.82, 1.22);
  const rearBench = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.35, 0.48),
    new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.8 })
  );
  rearBench.position.set(0, 0.72, 0.88);
  group.add(rearUpper, rearBench);

  // Corner Side Mirror (left windshield edge)
  const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.025), darkMetalMat);
  mirrorArm.position.set(-0.68, 1.44, -0.82);
  const mirrorCase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.04), darkMetalMat);
  mirrorCase.position.set(-0.78, 1.46, -0.8);
  mirrorCase.rotation.y = 0.35;
  const mirrorGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.085),
    new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.08, metalness: 0.9 })
  );
  mirrorGlass.position.set(-0.78, 1.46, -0.778);
  mirrorGlass.rotation.y = 0.35;
  group.add(mirrorArm, mirrorCase, mirrorGlass);

  // Hanging Windshield Ornament (তাবিজ / ঝালর)
  const ornamentPivot = new THREE.Group();
  ornamentPivot.position.set(0, 1.88, -0.74);

  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), gripMat);
  cord.position.y = -0.08;
  const charmRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.026, 0.008, 6, 12),
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.25, metalness: 0.85 })
  );
  charmRing.position.y = -0.17;
  const tasselBody = new THREE.Mesh(
    new THREE.ConeGeometry(0.032, 0.1, 8),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.65 })
  );
  tasselBody.position.y = -0.24;
  const charmBead = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 8),
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.2, metalness: 0.8 })
  );
  charmBead.position.y = -0.29;
  ornamentPivot.add(cord, charmRing, tasselBody, charmBead);
  group.add(ornamentPivot);

  // Motorcycle-style CNG Steering Handlebar + Driver Hands
  const handlebarPivot = new THREE.Group();
  handlebarPivot.position.set(0, 1.12, -0.62);
  handlebarPivot.rotation.x = 0.22;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 10), darkMetalMat);
  stem.position.y = -0.08;
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), chromeMat);
  clamp.position.y = 0.02;

  const leftBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8), chromeMat);
  leftBar.rotation.z = Math.PI / 2 - 0.12;
  leftBar.position.set(-0.18, 0.04, 0.04);

  const rightBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8), chromeMat);
  rightBar.rotation.z = -Math.PI / 2 + 0.12;
  rightBar.position.set(0.18, 0.04, 0.04);

  const leftGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.15, 10), gripMat);
  leftGrip.rotation.z = Math.PI / 2 - 0.12;
  leftGrip.position.set(-0.32, 0.06, 0.06);

  const rightGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.15, 10), gripMat);
  rightGrip.rotation.z = -Math.PI / 2 + 0.12;
  rightGrip.position.set(0.32, 0.06, 0.06);

  // Low-poly Driver Hands & Forearms gripping handlebar
  const makeArmAndHand = (side: -1 | 1) => {
    const armGroup = new THREE.Group();
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.065, 0.09), skinMat);
    hand.position.set(side * 0.32, 0.075, 0.06);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.32, 8), skinMat);
    forearm.position.set(side * 0.34, -0.02, 0.22);
    forearm.rotation.x = Math.PI / 2 - 0.35;
    forearm.rotation.z = side * 0.15;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.054, 0.2, 8), sleeveMat);
    sleeve.position.set(side * 0.36, -0.08, 0.38);
    sleeve.rotation.x = Math.PI / 2 - 0.35;
    sleeve.rotation.z = side * 0.15;
    armGroup.add(hand, forearm, sleeve);
    return armGroup;
  };

  handlebarPivot.add(
    stem,
    clamp,
    leftBar,
    rightBar,
    leftGrip,
    rightGrip,
    makeArmAndHand(-1),
    makeArmAndHand(1)
  );
  group.add(handlebarPivot);

  const updateAppearance = (newColorHex: string) => {
    paintMat.color.set(newColorHex);
  };

  return {
    group,
    handlebarPivot,
    ornamentPivot,
    updateAppearance,
  };
}

export interface TrafficModelRig {
  group: THREE.Group;
  halfWidth: number;
  halfLength: number;
  wheels: THREE.Object3D[];
}

export function createVehicleModel(kind: VehicleKind, maxAnisotropy: number): TrafficModelRig {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];

  const tireMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#d4d4d8', roughness: 0.3, metalness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.15, metalness: 0.3 });
  const headMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#facc15',
    emissiveIntensity: 0.8,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 0.9,
  });

  const addWheel = (x: number, y: number, z: number, radius: number, width = 0.24) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 12), tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, width + 0.02, 8),
      rimMat
    );
    w.add(hub);
    group.add(w);
    wheels.push(w);
  };

  if (kind === 'bus') {
    const roll = Math.random();
    if (roll < 0.26) {
      // Iconic Red & White Double-Decker City Bus
      const bodyMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.38, metalness: 0.18 });
      const topMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.45 });
      const darkWin = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.2 });
      const len = 7.4;

      const lowerDeck = new THREE.Mesh(new THREE.BoxGeometry(2.68, 1.55, len), bodyMat);
      lowerDeck.position.y = 1.15;
      lowerDeck.castShadow = true;

      const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(2.66, 1.4, len - 0.1), bodyMat);
      upperDeck.position.y = 2.62;
      upperDeck.castShadow = true;

      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.34, len - 0.08), topMat);
      roofCap.position.y = 3.48;

      const lowerWin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.68, len - 0.5), darkWin);
      lowerWin.position.y = 1.48;
      const upperWin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.68, len - 0.5), darkWin);
      upperWin.position.y = 2.82;

      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.26, 0.2), rimMat);
      bumper.position.set(0, 0.46, len / 2 + 0.02);
      const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), tailMat);
      tlL.position.set(-1.02, 0.85, len / 2 + 0.02);
      tlL.rotation.z = -0.25;
      const tlR = tlL.clone();
      tlR.position.x = 1.02;
      tlR.rotation.z = 0.25;

      const signTex = createBusSignTexture(maxAnisotropy, 'মায়ের দোয়া');
      const signBack = new THREE.Mesh(
        new THREE.PlaneGeometry(1.75, 0.4),
        new THREE.MeshBasicMaterial({ map: signTex })
      );
      signBack.position.set(0, 0.88, len / 2 + 0.03);
      const signFront = signBack.clone();
      signFront.position.set(0, 2.02, -(len / 2 + 0.03));
      signFront.rotation.y = Math.PI;

      group.add(lowerDeck, upperDeck, roofCap, lowerWin, upperWin, bumper, tlL, tlR, signBack, signFront);
      const wz = len * 0.32;
      addWheel(-1.26, 0.48, -wz, 0.48);
      addWheel(1.26, 0.48, -wz, 0.48);
      addWheel(-1.26, 0.48, wz, 0.48);
      addWheel(1.26, 0.48, wz, 0.48);

      return { group, halfWidth: 1.36, halfLength: len / 2, wheels };
    }

    // Classic Yellow-Red "মায়ের দোয়া" City Bus (54%) or Green/Blue Metro Bus (20%)
    const variants = [
      { body: '#eab308', top: '#eab308', stripe: '#b91c1c', len: 6.9, route: 'মায়ের দোয়া', hasHelper: true },
      { body: '#facc15', top: '#eab308', stripe: '#dc2626', len: 6.8, route: 'মায়ের দোয়া', hasHelper: true },
      { body: '#16a34a', top: '#f8fafc', stripe: '#facc15', len: 7.0, route: 'নিউমার্কেট — বহদ্দারহাট', hasHelper: false },
      { body: '#0284c7', top: '#e2e8f0', stripe: '#f59e0b', len: 6.6, route: 'সদরঘাট — অলংকার', hasHelper: false },
    ];
    const v = roll < 0.78 ? variants[roll < 0.52 ? 0 : 1] : variants[roll < 0.9 ? 2 : 3];
    const bodyMat = new THREE.MeshStandardMaterial({ color: v.body, roughness: 0.38, metalness: 0.16 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: v.stripe, roughness: 0.45 });
    const roofMat = new THREE.MeshStandardMaterial({ color: v.top, roughness: 0.5 });
    const orangeGlowMat = new THREE.MeshStandardMaterial({
      color: '#fb923c',
      emissive: '#f97316',
      emissiveIntensity: 1.15,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.68, 1.38, v.len), bodyMat);
    chassis.position.y = 1.12;
    chassis.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.64, 1.18, v.len - 0.12), roofMat);
    cabin.position.y = 2.34;
    cabin.castShadow = true;

    // Recessed dark window band + rear glass pane
    const windowBelt = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.72, v.len - 0.45), glassMat);
    windowBelt.position.y = 2.26;
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.72, 0.08), glassMat);
    rearGlass.position.set(0, 2.24, v.len / 2 - 0.04);

    // Bold red roof header trim + middle stripe
    const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.24, v.len - 0.06), stripeMat);
    roofTrim.position.y = 2.86;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.2, v.len + 0.02), stripeMat);
    stripe.position.y = 1.48;
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.26, 0.2), rimMat);
    bumper.position.set(0, 0.48, v.len / 2 + 0.02);

    // Angled V-shaped orange/red taillights (matching screenshot yellow bus rear!)
    const tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.08), orangeGlowMat);
    tlLeft.position.set(-0.88, 0.92, v.len / 2 + 0.03);
    tlLeft.rotation.z = -0.3;
    const tlRight = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.08), orangeGlowMat);
    tlRight.position.set(0.88, 0.92, v.len / 2 + 0.03);
    tlRight.rotation.z = 0.3;

    const signTex = createBusSignTexture(maxAnisotropy, v.route);
    const signBack = new THREE.Mesh(
      new THREE.PlaneGeometry(2.15, 0.38),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signBack.position.set(0, 2.76, v.len / 2 - 0.01);
    const signFront = signBack.clone();
    signFront.position.z = -(v.len / 2 - 0.01);
    signFront.rotation.y = Math.PI;

    group.add(
      chassis,
      cabin,
      windowBelt,
      rearGlass,
      roofTrim,
      stripe,
      bumper,
      tlLeft,
      tlRight,
      signBack,
      signFront
    );

    // Blue-shirted Bus Helper leaning on side doorway (just like reference screenshot!)
    if (v.hasHelper) {
      const helperGroup = new THREE.Group();
      helperGroup.position.set(1.42, 0.85, v.len * 0.24);
      const shirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.56, 0.24),
        new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.8 })
      );
      shirt.position.y = 0.62;
      const pants = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.5, 0.22),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85 })
      );
      pants.position.y = 0.14;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75 })
      );
      head.position.y = 1.05;
      helperGroup.add(pants, shirt, head);
      group.add(helperGroup);
    }

    const wz = v.len * 0.31;
    addWheel(-1.26, 0.48, -wz, 0.48);
    addWheel(1.26, 0.48, -wz, 0.48);
    addWheel(-1.26, 0.48, wz, 0.48);
    addWheel(1.26, 0.48, wz, 0.48);

    return { group, halfWidth: 1.36, halfLength: v.len / 2, wheels };
  }

  if (kind === 'truck') {
    const isLagunaPickup = Math.random() < 0.45;
    if (isLagunaPickup) {
      // Blue Covered Pickup / Laguna (seen in reference Screenshot 2)
      const blueMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.36, metalness: 0.22 });
      const darkTrim = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 });

      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.92, 1.42, 1.45), blueMat);
      cab.position.set(0, 1.05, -1.25);
      cab.castShadow = true;
      const ws = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.56, 0.08), glassMat);
      ws.position.set(0, 1.35, -1.98);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.32, 2.65), blueMat);
      canopy.position.set(0, 1.25, 0.85);
      canopy.castShadow = true;
      const rearOpen = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.72, 0.1), darkTrim);
      rearOpen.position.set(0, 1.28, 2.15);
      const hl = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 0.08), headMat);
      hl.position.set(0, 0.7, -1.98);

      group.add(cab, ws, canopy, rearOpen, hl);
      addWheel(-0.92, 0.38, -1.3, 0.38);
      addWheel(0.92, 0.38, -1.3, 0.38);
      addWheel(-0.92, 0.38, 1.3, 0.38);
      addWheel(0.92, 0.38, 1.3, 0.38);

      return { group, halfWidth: 1.02, halfLength: 2.15, wheels };
    }

    const cabMat = new THREE.MeshStandardMaterial({
      color: Math.random() < 0.5 ? '#facc15' : '#ea580c',
      roughness: 0.38,
      metalness: 0.22,
    });
    const bedMat = new THREE.MeshStandardMaterial({
      color: Math.random() < 0.5 ? '#c2410c' : '#166534',
      roughness: 0.78,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 });

    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.8, 1.85), cabMat);
    cab.position.set(0, 1.35, -1.9);
    cab.castShadow = true;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.05, 0.9), cabMat);
    hood.position.set(0, 0.95, -2.95);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.16, 0.45), trimMat);
    visor.position.set(0, 2.22, -2.65);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.68, 0.08), glassMat);
    ws.position.set(0, 1.8, -2.84);

    const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.1, 4.1), bedMat);
    cargo.position.set(0, 1.72, 1.15);
    cargo.castShadow = true;
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 4.15), woodMat);
    railTop.position.set(0, 2.8, 1.15);
    const cargoStripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.25, 4.12), trimMat);
    cargoStripe.position.set(0, 0.8, 1.15);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 0.22), trimMat);
    bumper.position.set(0, 0.55, 3.22);

    const signTex = createBusSignTexture(maxAnisotropy, 'মায়ের দোয়া');
    const signBack = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 0.35),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signBack.position.set(0, 2.58, 3.23);

    group.add(cab, hood, visor, ws, cargo, railTop, cargoStripe, bumper, signBack);
    addWheel(-1.18, 0.48, -2.1, 0.48);
    addWheel(1.18, 0.48, -2.1, 0.48);
    addWheel(-1.18, 0.48, 0.6, 0.48);
    addWheel(1.18, 0.48, 0.6, 0.48);
    addWheel(-1.18, 0.48, 2.2, 0.48);
    addWheel(1.18, 0.48, 2.2, 0.48);

    return { group, halfWidth: 1.3, halfLength: 3.2, wheels };
  }

  if (kind === 'bike') {
    const bikeColors = ['#1d4ed8', '#18181b', '#dc2626', '#16a34a'];
    const tankMat = new THREE.MeshStandardMaterial({
      color: bikeColors[Math.floor(Math.random() * bikeColors.length)],
      roughness: 0.25,
      metalness: 0.55,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.4, metalness: 0.7 });
    const riderShirtMat = new THREE.MeshStandardMaterial({
      color: Math.random() < 0.65 ? '#f97316' : '#1e293b',
      roughness: 0.82,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75 });
    const helmetMat = new THREE.MeshStandardMaterial({
      color: Math.random() < 0.5 ? '#18181b' : '#facc15',
      roughness: 0.25,
      metalness: 0.3,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 1.32), frameMat);
    chassis.position.set(0, 0.58, 0);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.54), tankMat);
    tank.position.set(0, 0.88, -0.24);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.72), tireMat);
    seat.position.set(0, 0.82, 0.32);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.68, 8), rimMat);
    fork.position.set(0, 0.68, -0.64);
    fork.rotation.x = -0.32;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.06), rimMat);
    handle.position.set(0, 1.04, -0.52);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), headMat);
    hl.position.set(0, 0.92, -0.74);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.06), tailMat);
    tl.position.set(0, 0.8, 0.74);

    const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.26), riderShirtMat);
    riderTorso.position.set(0, 1.18, 0.06);
    riderTorso.rotation.x = -0.24;
    const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), helmetMat);
    riderHead.position.set(0, 1.56, -0.02);
    group.add(chassis, tank, seat, fork, handle, hl, tl, riderTorso, riderHead);

    // Pillion passenger sitting behind rider (very authentic, like reference screenshot left lane!)
    if (Math.random() < 0.7) {
      const pillionTorso = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.52, 0.24),
        new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.85 })
      );
      pillionTorso.position.set(0, 1.16, 0.42);
      pillionTorso.rotation.x = -0.14;
      const pillionHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skinMat);
      pillionHead.position.set(0, 1.52, 0.38);
      group.add(pillionTorso, pillionHead);
    }

    addWheel(0, 0.32, -0.7, 0.32, 0.12);
    addWheel(0, 0.32, 0.64, 0.32, 0.12);

    return { group, halfWidth: 0.42, halfLength: 1.0, wheels };
  }

  if (kind === 'thelagari') {
    const woodMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.9 });
    const sackMat = new THREE.MeshStandardMaterial({ color: '#d6d3d1', roughness: 0.95 });
    const crateMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.82 });
    const pusherShirt = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.8 });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.14, 2.2), woodMat);
    deck.position.set(0, 0.62, -0.2);
    deck.castShadow = true;

    const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.95), woodMat);
    handleL.position.set(-0.52, 0.85, 1.2);
    handleL.rotation.x = 0.28;
    const handleR = handleL.clone();
    handleR.position.x = 0.52;

    const cargo1 = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.58, 0.9), sackMat);
    cargo1.position.set(0, 0.98, -0.58);
    cargo1.castShadow = true;
    const cargo2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.52, 0.78), crateMat);
    cargo2.position.set(0, 0.95, 0.32);
    cargo2.castShadow = true;

    // Pushing vendor behind cart
    const pusherBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.26), pusherShirt);
    pusherBody.position.set(0, 1.08, 1.48);
    pusherBody.rotation.x = -0.35;
    const pusherHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75 })
    );
    pusherHead.position.set(0, 1.48, 1.34);

    group.add(deck, handleL, handleR, cargo1, cargo2, pusherBody, pusherHead);
    addWheel(-0.76, 0.45, -0.2, 0.45, 0.1);
    addWheel(0.76, 0.45, -0.2, 0.45, 0.1);

    return { group, halfWidth: 0.85, halfLength: 1.55, wheels };
  }

  if (kind === 'cng_ai') {
    const aiColor = Math.random() < 0.78 ? '#16a34a' : '#eab308';
    const paintMat = new THREE.MeshStandardMaterial({ color: aiColor, roughness: 0.36, metalness: 0.2 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.85 });
    const cageMat = new THREE.MeshStandardMaterial({ color: '#d4d4d8', roughness: 0.25, metalness: 0.8 });

    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.72, 0.8), paintMat);
    nose.position.set(0, 0.74, -0.75);
    nose.castShadow = true;
    const rear = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.76, 1.45), paintMat);
    rear.position.set(0, 0.78, 0.55);
    rear.castShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.16, 1.96), roofMat);
    roof.position.set(0, 1.84, 0.2);
    const rearCurtain = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.44, 0.08), roofMat);
    rearCurtain.position.set(0, 1.58, 1.18);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.65, 0.04), glassMat);
    ws.position.set(0, 1.46, -0.74);
    ws.rotation.x = 0.22;
    const cageL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.58, 1.15), cageMat);
    cageL.position.set(-0.73, 1.38, 0.55);
    const cageR = cageL.clone();
    cageR.position.x = 0.73;

    // Visible passenger silhouettes inside AI CNG
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

    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.12, 0.06), tailMat);
    tl.position.set(0, 0.82, 1.3);

    group.add(nose, rear, roof, rearCurtain, ws, cageL, cageR, p1, p2, tl);
    addWheel(0, 0.28, -1.12, 0.28, 0.16);
    addWheel(-0.72, 0.3, 0.75, 0.3, 0.18);
    addWheel(0.72, 0.3, 0.75, 0.3, 0.18);

    return { group, halfWidth: 0.76, halfLength: 1.35, wheels };
  }

  if (kind === 'rickshaw') {
    const hoodColors = ['#e11d48', '#2563eb', '#9333ea', '#059669'];
    const hoodMat = new THREE.MeshStandardMaterial({
      color: hoodColors[Math.floor(Math.random() * hoodColors.length)],
      roughness: 0.68,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.55 });
    const frameMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.5, metalness: 0.6 });
    const seatMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.7 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.46, 0.82), seatMat);
    seat.position.set(0, 0.72, 0.42);
    const hood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.64, 1.18, 10, 1, false, 0, Math.PI),
      hoodMat
    );
    hood.rotation.z = Math.PI / 2;
    hood.position.set(0, 1.34, 0.48);
    hood.castShadow = true;

    const hoodBand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.14), trimMat);
    hoodBand.position.set(0, 1.38, 1.05);

    const artTex = createRickshawArtTexture('সুপারহিট!', maxAnisotropy);
    const artPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.06, 0.42),
      new THREE.MeshBasicMaterial({ map: artTex })
    );
    artPlate.position.set(0, 0.74, 0.85);

    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.4), frameMat);
    stem.position.set(0, 0.58, -0.3);
    const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.08), rimMat);
    handlebar.position.set(0, 1.15, -0.92);
    const riderBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 0.65, 8),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.8 })
    );
    riderBody.position.set(0, 1.1, -0.58);
    const riderHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#a16207', roughness: 0.7 })
    );
    riderHead.position.set(0, 1.56, -0.58);

    // Two passengers seated inside rickshaw
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

    group.add(seat, hood, hoodBand, artPlate, stem, handlebar, riderBody, riderHead, passL, passR);
    addWheel(0, 0.36, -0.95, 0.36, 0.1);
    addWheel(-0.56, 0.36, 0.55, 0.36, 0.1);
    addWheel(0.56, 0.36, 0.55, 0.36, 0.1);

    return { group, halfWidth: 0.68, halfLength: 1.2, wheels };
  }

  // Private Car (Clean White Noah Microbus / Van or Sedan / SUV)
  const carRoll = Math.random();
  const isMicrobus = carRoll < 0.46;
  const isSuv = !isMicrobus && carRoll < 0.72;
  const carColors = isMicrobus
    ? ['#f8fafc', '#f1f5f9', '#e2e8f0']
    : ['#f8fafc', '#2563eb', '#475569', '#eab308', '#0d9488', '#dc2626'];
  const carMat = new THREE.MeshStandardMaterial({
    color: carColors[Math.floor(Math.random() * carColors.length)],
    roughness: 0.24,
    metalness: isMicrobus ? 0.32 : 0.52,
  });

  if (isMicrobus) {
    // Crisp White Box Microbus / Van (matching reference screenshot ahead of yellow bus!)
    const vanBody = new THREE.Mesh(new THREE.BoxGeometry(1.92, 1.38, 4.25), carMat);
    vanBody.position.y = 1.04;
    vanBody.castShadow = true;
    const winBand = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.56, 3.8), glassMat);
    winBand.position.set(0, 1.32, -0.04);
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.52, 0.06), glassMat);
    rearGlass.position.set(0, 1.32, 2.13);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.24, 0.16), tireMat);
    bumper.position.set(0, 0.44, 2.14);
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.06), tailMat);
    tlL.position.set(-0.78, 0.84, 2.14);
    const tlR = tlL.clone();
    tlR.position.x = 0.78;
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.08), headMat);
    hl.position.set(0, 0.72, -2.14);

    group.add(vanBody, winBand, rearGlass, bumper, tlL, tlR, hl);
    addWheel(-0.92, 0.35, -1.34, 0.35);
    addWheel(0.92, 0.35, -1.34, 0.35);
    addWheel(-0.92, 0.35, 1.34, 0.35);
    addWheel(0.92, 0.35, 1.34, 0.35);

    return { group, halfWidth: 0.98, halfLength: 2.15, wheels };
  }

  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.64, isSuv ? 4.2 : 3.9), carMat);
  lower.position.y = 0.64;
  lower.castShadow = true;
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.64, isSuv ? 0.78 : 0.56, isSuv ? 3.1 : 2.1),
    carMat
  );
  top.position.set(0, isSuv ? 1.32 : 1.18, isSuv ? 0.25 : 0.12);
  top.castShadow = true;
  const win = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, isSuv ? 0.54 : 0.42, isSuv ? 2.85 : 1.88),
    glassMat
  );
  win.position.set(0, isSuv ? 1.32 : 1.16, isSuv ? 0.25 : 0.12);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.26, 0.08), rimMat);
  grille.position.set(0, 0.6, -(isSuv ? 2.11 : 1.96));
  const tailLights = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.15, 0.06), tailMat);
  tailLights.position.set(0, 0.74, isSuv ? 2.11 : 1.96);

  group.add(lower, top, win, grille, tailLights);
  const zWheel = isSuv ? 1.34 : 1.22;
  addWheel(-0.92, 0.35, -zWheel, 0.35);
  addWheel(0.92, 0.35, -zWheel, 0.35);
  addWheel(-0.92, 0.35, zWheel, 0.35);
  addWheel(0.92, 0.35, zWheel, 0.35);

  return { group, halfWidth: 0.98, halfLength: isSuv ? 2.1 : 1.98, wheels };
}

export interface PedestrianRig {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  alertBadge: THREE.Mesh;
}

export function createPedestrianModel(shirtHex: string, isWaitingPassenger = false): PedestrianRig {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 });
  const hairMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.26), shirtMat);
  torso.position.y = 1.05;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
  head.position.y = 1.54;
  head.castShadow = true;

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat
  );
  hair.position.y = 1.56;

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), pantsMat);
  leftLeg.position.set(-0.12, 0.38, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), pantsMat);
  rightLeg.position.set(0.12, 0.38, 0);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 0.15), shirtMat);
  leftArm.position.set(-0.32, 1.05, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.54, 0.15), shirtMat);
  rightArm.position.set(0.32, 1.05, 0);

  const alertBadge = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshBasicMaterial({ color: isWaitingPassenger ? '#10b981' : '#ef4444' })
  );
  alertBadge.position.y = 2.1;
  alertBadge.visible = isWaitingPassenger;

  group.add(torso, head, hair, leftLeg, rightLeg, leftArm, rightArm, alertBadge);
  return { group, leftLeg, rightLeg, leftArm, rightArm, alertBadge };
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
  maxAnisotropy: number
): THREE.Group {
  const group = new THREE.Group();
  const padTex = createZonePadTexture(type, maxAnisotropy);
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
    const kioskGroup = new THREE.Group();
    const kioskMat = new THREE.MeshStandardMaterial({
      color: isGas ? '#eab308' : '#ec4899',
      roughness: 0.45,
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.0, 1.9), kioskMat);
    base.position.y = 1.0;
    base.castShadow = true;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 2.6), roofMat);
    canopy.position.y = 2.4;
    kioskGroup.add(base, canopy);
    kioskGroup.position.set(4.5, 0, 0);
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
