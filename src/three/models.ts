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
  type CngRig,
  type TrafficModelRig,
} from './vehicleModels';

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
