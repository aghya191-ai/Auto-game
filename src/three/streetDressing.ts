import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  BILLBOARD_ADS,
  HANGING_BANNERS,
  SHOP_CATALOG,
  WALL_POSTERS,
} from '../config/chattogramData';
import type { AreaConfig, GraphicsQuality } from '../types/game';
import {
  createAwningStripeTexture,
  createBillboardTexture,
  createBuildingFacadeTexture,
  createFootbridgeSignTexture,
  createHangingBannerTexture,
  createShopSignTexture,
  createTinRoofTexture,
  createWallPosterTexture,
} from './textures';

const CHUNK_COUNT = 6;
const CHUNK_LEN = 45;

// Pool capacities per chunk
const BUILDINGS_PER_CHUNK = 6; // 3 left, 3 right
const SHOPS_PER_CHUNK = 6;
const BANNERS_PER_CHUNK = 4;
const POSTERS_PER_CHUNK = 8;
const BILLBOARDS_PER_CHUNK = 2;

// InstancedMesh slot capacities per chunk
const BALCONIES_PER_CHUNK = 24;
const CLOTHES_PER_CHUNK = 32;
const ACS_PER_CHUNK = 28;
const DISHES_PER_CHUNK = 12;
const TANKS_PER_CHUNK = 10;
const TIN_ROOFS_PER_CHUNK = 12;
const SHUTTERS_PER_CHUNK = 18;
const CRATES_PER_CHUNK = 34;
const BINS_PER_CHUNK = 8;
const GARBAGE_PER_CHUNK = 12;
const BIKES_PER_CHUNK = 8;
const TREES_PER_CHUNK = 14;
const BUSHES_PER_CHUNK = 26;
const POLES_PER_CHUNK = 6;
const HAWKERS_PER_CHUNK = 5;

const _dummy = new THREE.Object3D();
const _mat4 = new THREE.Matrix4();
const _color = new THREE.Color();

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g.clone();
    if (!ng.getAttribute('normal')) {
      ng.computeVertexNormals();
    }
    // Ensure consistent attribute set (position + normal + uv)
    if (!ng.getAttribute('uv')) {
      const count = ng.getAttribute('position').count;
      ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    return ng;
  });
  const merged = mergeGeometries(normalized, false);
  for (const g of normalized) g.dispose();
  for (const g of parts) g.dispose();
  return merged ?? new THREE.BoxGeometry(0.5, 0.5, 0.5);
}

interface InstancedLayer {
  mesh: THREE.InstancedMesh;
  perChunk: number;
  localZ: Float32Array;
  baseMatrices: Float32Array;
  active: Uint8Array;
  detailTier: Uint8Array; // 0 = essential, 1 = high-quality extra detail
}

interface BuildingSlot {
  group: THREE.Group;
  body: THREE.Mesh;
  parapet: THREE.Mesh;
  stairRoom: THREE.Mesh;
}

interface ShopSlot {
  group: THREE.Group;
  signMesh: THREE.Mesh;
  signBack: THREE.Mesh;
  awningMesh: THREE.Mesh;
}

interface BannerSlot {
  group: THREE.Group;
  plane: THREE.Mesh;
  poleL: THREE.Mesh;
  poleR: THREE.Mesh;
}

interface BillboardSlot {
  group: THREE.Group;
  face: THREE.Mesh;
}

interface WireClusterSlot {
  group: THREE.Group;
  crossWires: THREE.Line[];
}

interface FootbridgeSlot {
  group: THREE.Group;
}

interface ChunkPool {
  buildings: BuildingSlot[];
  shops: ShopSlot[];
  banners: BannerSlot[];
  posters: THREE.Mesh[];
  billboards: BillboardSlot[];
  wireCluster: WireClusterSlot;
  footbridge: FootbridgeSlot;
}

type ZoneDensity = 'high' | 'medium_high' | 'modern' | 'sparse';

export class StreetDressingManager {
  private scene: THREE.Scene;
  private maxAnisotropy: number;

  // Cached resource pools (zero allocation after constructor)
  private buildingBoxGeos: THREE.BoxGeometry[] = []; // index 0..5 => 4..9 floors
  private facadeMats: THREE.MeshStandardMaterial[] = [];
  private wallSideMats: THREE.MeshStandardMaterial[] = [];
  private parapetMat: THREE.MeshStandardMaterial;
  private shopSignMats: THREE.MeshBasicMaterial[] = [];
  private awningMats: THREE.MeshStandardMaterial[] = [];
  private bannerMats: THREE.MeshBasicMaterial[] = [];
  private posterMats: THREE.MeshBasicMaterial[] = [];
  private billboardMats: THREE.MeshBasicMaterial[] = [];
  private poleMat: THREE.MeshStandardMaterial;
  private wireMat: THREE.LineBasicMaterial;
  private trussMat: THREE.MeshStandardMaterial;
  private footbridgeSignMat: THREE.MeshBasicMaterial;
  private footbridgeCanopyMat: THREE.MeshStandardMaterial;

  // Pooled scene groups per chunk
  private chunkPools: ChunkPool[] = [];

  // Global InstancedMesh layers
  private layers: {
    balcony: InstancedLayer;
    clothes: InstancedLayer;
    acUnit: InstancedLayer;
    dish: InstancedLayer;
    waterTank: InstancedLayer;
    tinRoof: InstancedLayer;
    shutter: InstancedLayer;
    crate: InstancedLayer;
    bin: InstancedLayer;
    garbage: InstancedLayer;
    bike: InstancedLayer;
    treeTrunk: InstancedLayer;
    treeCrown: InstancedLayer;
    bush: InstancedLayer;
    poleHardware: InstancedLayer;
    hawkerCart: InstancedLayer;
    hawkerCanopy: InstancedLayer;
  };
  private allLayers: InstancedLayer[] = [];

  constructor(scene: THREE.Scene, maxAnisotropy: number) {
    this.scene = scene;
    this.maxAnisotropy = maxAnisotropy;

    this.parapetMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.78 });
    this.poleMat = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.55, metalness: 0.45 });
    this.wireMat = new THREE.LineBasicMaterial({ color: '#0f172a' });
    this.trussMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45, metalness: 0.68 });
    this.footbridgeSignMat = new THREE.MeshBasicMaterial({
      map: createFootbridgeSignTexture('ফুটওভার ব্রিজ ব্যবহার করুন · নিরাপদ পারাপার', maxAnisotropy),
    });
    this.footbridgeCanopyMat = new THREE.MeshStandardMaterial({
      map: createTinRoofTexture('#0f766e', maxAnisotropy),
      roughness: 0.68,
      side: THREE.DoubleSide,
    });

    this.initTextureAndGeometryPools();
    this.layers = this.initInstancedLayers();
    this.allLayers = Object.values(this.layers);
  }

  private initTextureAndGeometryPools(): void {
    // 6 shared unit-footprint BoxGeometries for 4 to 9 floors
    for (let f = 4; f <= 9; f++) {
      const h = f * 2.95 + 1.4; // 13.2m .. 27.95m
      this.buildingBoxGeos.push(new THREE.BoxGeometry(1, h, 1));
    }

    // 20 cached worn facade materials (peeling paint, water stains, 4-9 floors, varied styles)
    const facadeSpecs: { color: string; style: 'brick' | 'concrete' | 'louver' | 'modern'; floors: number }[] = [
      { color: '#d6cfc7', style: 'concrete', floors: 4 },
      { color: '#c97b63', style: 'brick', floors: 5 },
      { color: '#e2d9c2', style: 'louver', floors: 6 },
      { color: '#cbd5e1', style: 'modern', floors: 8 },
      { color: '#dfc5af', style: 'brick', floors: 4 },
      { color: '#b6ada4', style: 'concrete', floors: 6 },
      { color: '#d4dce9', style: 'louver', floors: 9 },
      { color: '#d9bca3', style: 'concrete', floors: 5 },
      { color: '#c88d7c', style: 'brick', floors: 7 },
      { color: '#bfd4c8', style: 'concrete', floors: 5 },
      { color: '#d3cde2', style: 'modern', floors: 9 },
      { color: '#e8ccb3', style: 'brick', floors: 6 },
      { color: '#cbd5df', style: 'louver', floors: 7 },
      { color: '#dec0c0', style: 'concrete', floors: 4 },
      { color: '#d6dff0', style: 'modern', floors: 8 },
      { color: '#e3dcb8', style: 'concrete', floors: 6 },
      { color: '#b98b73', style: 'brick', floors: 5 },
      { color: '#c5d8cc', style: 'louver', floors: 8 },
      { color: '#e2ded9', style: 'concrete', floors: 7 },
      { color: '#c3ccd4', style: 'modern', floors: 9 },
    ];

    facadeSpecs.forEach((spec, idx) => {
      const tex = createBuildingFacadeTexture(
        spec.color,
        spec.style,
        this.maxAnisotropy,
        spec.floors,
        idx + 11
      );
      this.facadeMats.push(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.84 }));
      this.wallSideMats.push(new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.88 }));
    });

    // 12 cached Shop Sign + Awning materials across all 8 shop categories
    SHOP_CATALOG.forEach((shop) => {
      const tex = createShopSignTexture(shop.name, shop.bgHex, this.maxAnisotropy, shop.label);
      this.shopSignMats.push(new THREE.MeshBasicMaterial({ map: tex }));
    });

    const awningColors = ['#dc2626', '#0284c7', '#16a34a', '#ea580c', '#7c3aed', '#eab308'];
    awningColors.forEach((hex) => {
      this.awningMats.push(
        new THREE.MeshStandardMaterial({
          map: createAwningStripeTexture(hex, this.maxAnisotropy),
          roughness: 0.72,
          side: THREE.DoubleSide,
        })
      );
    });

    // Cached political-free Bangla hanging banners
    HANGING_BANNERS.forEach((b) => {
      const tex = createHangingBannerTexture(b.title, b.subtitle, b.bg, b.fg, this.maxAnisotropy);
      this.bannerMats.push(new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    });

    // Cached political-free wall posters (movies, admission, sale offers)
    WALL_POSTERS.forEach((p) => {
      const tex = createWallPosterTexture(p.text, p.bg, p.fg, this.maxAnisotropy, p.sub, p.badge);
      this.posterMats.push(new THREE.MeshBasicMaterial({ map: tex }));
    });

    // Cached billboards
    BILLBOARD_ADS.forEach((ad) => {
      const tex = createBillboardTexture(ad.title, ad.subtitle, ad.bg, ad.fg, this.maxAnisotropy);
      this.billboardMats.push(new THREE.MeshBasicMaterial({ map: tex }));
    });
  }

  private createLayer(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    perChunk: number,
    castShadow = false
  ): InstancedLayer {
    const capacity = CHUNK_COUNT * perChunk;
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.frustumCulled = false;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;

    const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) {
      mesh.setMatrixAt(i, zeroMat);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);

    return {
      mesh,
      perChunk,
      localZ: new Float32Array(capacity),
      baseMatrices: new Float32Array(capacity * 16),
      active: new Uint8Array(capacity),
      detailTier: new Uint8Array(capacity),
    };
  }

  private initInstancedLayers() {
    // 1. Concrete Balcony + Metal Railing
    const balcSlab = new THREE.BoxGeometry(0.95, 0.14, 2.5);
    const balcFront = new THREE.BoxGeometry(0.06, 0.72, 2.46);
    balcFront.translate(0.44, 0.42, 0);
    const balcL = new THREE.BoxGeometry(0.9, 0.72, 0.06);
    balcL.translate(0, 0.42, -1.21);
    const balcR = new THREE.BoxGeometry(0.9, 0.72, 0.06);
    balcR.translate(0, 0.42, 1.21);
    const balconyGeo = mergeParts([balcSlab, balcFront, balcL, balcR]);
    const balconyMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.78 });

    // 2. Hanging Clothes on balconies (per-instance bright fabric colors)
    const shirtBody = new THREE.BoxGeometry(0.08, 0.56, 0.46);
    const sleeveL = new THREE.BoxGeometry(0.07, 0.22, 0.18);
    sleeveL.translate(0, 0.14, -0.26);
    const sleeveR = new THREE.BoxGeometry(0.07, 0.22, 0.18);
    sleeveR.translate(0, 0.14, 0.26);
    const clothesGeo = mergeParts([shirtBody, sleeveL, sleeveR]);
    const clothesMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 });

    // 3. AC Condenser Units
    const acBox = new THREE.BoxGeometry(0.36, 0.54, 0.84);
    const acFan = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 10);
    acFan.rotateZ(Math.PI / 2);
    acFan.translate(0.18, 0, -0.14);
    const acGeo = mergeParts([acBox, acFan]);
    const acMat = new THREE.MeshStandardMaterial({ color: '#e7e5e4', roughness: 0.58, metalness: 0.18 });

    // 4. Satellite Dishes
    const dishBowl = new THREE.CylinderGeometry(0.44, 0.1, 0.16, 12);
    dishBowl.rotateZ(Math.PI * 0.32);
    dishBowl.translate(0, 0.48, 0);
    const dishMast = new THREE.CylinderGeometry(0.04, 0.05, 0.55, 6);
    dishMast.translate(-0.15, 0.27, 0);
    const dishArm = new THREE.BoxGeometry(0.38, 0.03, 0.03);
    dishArm.translate(0.18, 0.55, 0);
    const dishGeo = mergeParts([dishBowl, dishMast, dishArm]);
    const dishMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.42, metalness: 0.35 });

    // 5. Rooftop Water Tanks (Gazi/Plastic cylinder + lid + concrete pad)
    const tankBase = new THREE.BoxGeometry(1.45, 0.22, 1.45);
    tankBase.translate(0, 0.11, 0);
    const tankCyl = new THREE.CylinderGeometry(0.58, 0.62, 1.45, 12);
    tankCyl.translate(0, 0.94, 0);
    const tankCap = new THREE.CylinderGeometry(0.28, 0.54, 0.18, 12);
    tankCap.translate(0, 1.74, 0);
    const waterTankGeo = mergeParts([tankBase, tankCyl, tankCap]);
    const waterTankMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.52 });

    // 6. Slanted Corrugated Tin-Roof Extensions
    const tinSheet = new THREE.BoxGeometry(1.9, 0.08, 4.4);
    tinSheet.rotateZ(-0.24);
    tinSheet.translate(0, 0.16, 0);
    const tinBeam1 = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
    tinBeam1.translate(0.75, -0.38, -1.9);
    const tinBeam2 = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
    tinBeam2.translate(0.75, -0.38, 1.9);
    const tinRoofGeo = mergeParts([tinSheet, tinBeam1, tinBeam2]);
    const tinRoofMat = new THREE.MeshStandardMaterial({
      map: createTinRoofTexture('#cbd5e1', this.maxAnisotropy),
      roughness: 0.65,
      metalness: 0.35,
    });

    // 7. Rolling Shop Shutters (ground floor relief)
    const shutterPanel = new THREE.BoxGeometry(0.12, 2.4, 2.8);
    shutterPanel.translate(0, 1.2, 0);
    const shutterTop = new THREE.BoxGeometry(0.24, 0.28, 2.88);
    shutterTop.translate(0.05, 2.46, 0);
    const shutterGeo = mergeParts([shutterPanel, shutterTop]);
    const shutterMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.5, metalness: 0.55 });

    // 8. Stacked Goods / Crates outside shops
    const crateBot = new THREE.BoxGeometry(0.68, 0.44, 0.72);
    crateBot.translate(0, 0.22, 0);
    const crateTop = new THREE.BoxGeometry(0.56, 0.38, 0.6);
    crateTop.translate(0.04, 0.63, 0.04);
    const crateGeo = mergeParts([crateBot, crateTop]);
    const crateMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82 });

    // 9. Municipal Litter Bins
    const binStand = new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6);
    binStand.translate(0, 0.45, 0);
    const binTub = new THREE.CylinderGeometry(0.24, 0.2, 0.52, 8);
    binTub.translate(0, 0.65, 0);
    const binRim = new THREE.CylinderGeometry(0.26, 0.26, 0.06, 8);
    binRim.translate(0, 0.91, 0);
    const binGeo = mergeParts([binStand, binTub, binRim]);
    const binMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });

    // 10. Piles of Roadside Garbage (sacks + rubble)
    const bag1 = new THREE.DodecahedronGeometry(0.32, 0);
    bag1.scale(1.15, 0.78, 1.0);
    bag1.translate(0, 0.22, 0);
    const bag2 = new THREE.DodecahedronGeometry(0.24, 0);
    bag2.scale(1.1, 0.72, 1.1);
    bag2.translate(0.32, 0.16, 0.22);
    const bag3 = new THREE.BoxGeometry(0.52, 0.1, 0.44);
    bag3.rotateY(0.4);
    bag3.translate(-0.22, 0.05, -0.18);
    const garbageGeo = mergeParts([bag1, bag2, bag3]);
    const garbageMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88 });

    // 11. Parked Motorcycles / Bikes
    const bikeWheelF = new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10);
    bikeWheelF.rotateZ(Math.PI / 2);
    bikeWheelF.translate(0, 0.28, -0.58);
    const bikeWheelR = new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10);
    bikeWheelR.rotateZ(Math.PI / 2);
    bikeWheelR.translate(0, 0.28, 0.58);
    const bikeFrame = new THREE.BoxGeometry(0.28, 0.4, 1.08);
    bikeFrame.translate(0, 0.58, 0);
    const bikeSeat = new THREE.BoxGeometry(0.26, 0.12, 0.64);
    bikeSeat.translate(0, 0.82, 0.18);
    const bikeBar = new THREE.BoxGeometry(0.64, 0.06, 0.06);
    bikeBar.translate(0, 0.96, -0.44);
    const bikeGeo = mergeParts([bikeWheelF, bikeWheelR, bikeFrame, bikeSeat, bikeBar]);
    const bikeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.42, metalness: 0.45 });

    // 12. Trees (Trunk + Crown)
    const treeTrunkGeo = new THREE.CylinderGeometry(0.13, 0.22, 2.6, 6);
    treeTrunkGeo.translate(0, 1.3, 0);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.92 });

    const crownMain = new THREE.DodecahedronGeometry(1.22, 0);
    crownMain.translate(0, 3.15, 0);
    const crownTop = new THREE.DodecahedronGeometry(0.86, 0);
    crownTop.translate(0.15, 3.9, -0.1);
    const treeCrownGeo = mergeParts([crownMain, crownTop]);
    const treeCrownMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.78,
      flatShading: true,
    });

    // 13. Median & Planter Bushes
    const bushMain = new THREE.DodecahedronGeometry(0.36, 0);
    bushMain.scale(1.15, 0.78, 1.15);
    bushMain.translate(0, 0.25, 0);
    const bushSide = new THREE.DodecahedronGeometry(0.26, 0);
    bushSide.translate(0.22, 0.18, 0.16);
    const bushGeo = mergeParts([bushMain, bushSide]);
    const bushMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.84,
      flatShading: true,
    });

    // 14. Utility Pole Transformers & Cable Coil Bundles
    const xfmr = new THREE.CylinderGeometry(0.28, 0.28, 0.76, 8);
    xfmr.translate(0, 4.9, 0);
    const coil = new THREE.TorusGeometry(0.24, 0.055, 6, 12);
    coil.rotateY(Math.PI / 2);
    coil.translate(0.12, 3.85, 0.16);
    const bush1 = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6);
    bush1.translate(-0.12, 5.38, 0);
    const bush2 = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6);
    bush2.translate(0.12, 5.38, 0);
    const poleHardwareGeo = mergeParts([xfmr, coil, bush1, bush2]);
    const poleHardwareMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.55,
      metalness: 0.45,
    });

    // 15. Hawker Carts + Tilted Umbrellas/Canopies
    const cartDeck = new THREE.BoxGeometry(1.15, 0.22, 2.05);
    cartDeck.translate(0, 0.62, 0);
    const cartRail = new THREE.BoxGeometry(1.18, 0.2, 2.08);
    cartRail.translate(0, 0.82, 0);
    const cartW1 = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10);
    cartW1.rotateZ(Math.PI / 2);
    cartW1.translate(-0.56, 0.24, -0.68);
    const cartW2 = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10);
    cartW2.rotateZ(Math.PI / 2);
    cartW2.translate(0.56, 0.24, -0.68);
    const cartW3 = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10);
    cartW3.rotateZ(Math.PI / 2);
    cartW3.translate(-0.56, 0.24, 0.68);
    const cartW4 = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10);
    cartW4.rotateZ(Math.PI / 2);
    cartW4.translate(0.56, 0.24, 0.68);
    const cartGoods = new THREE.BoxGeometry(0.9, 0.26, 1.65);
    cartGoods.translate(0, 0.98, 0);
    const hawkerCartGeo = mergeParts([cartDeck, cartRail, cartW1, cartW2, cartW3, cartW4, cartGoods]);
    const hawkerCartMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.86 });

    const umbPole = new THREE.CylinderGeometry(0.035, 0.04, 1.95, 6);
    umbPole.translate(0, 1.35, 0);
    const umbCone = new THREE.ConeGeometry(1.18, 0.46, 8);
    umbCone.translate(0, 2.35, 0);
    const hawkerCanopyGeo = mergeParts([umbPole, umbCone]);
    const hawkerCanopyMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    return {
      balcony: this.createLayer(balconyGeo, balconyMat, BALCONIES_PER_CHUNK, false),
      clothes: this.createLayer(clothesGeo, clothesMat, CLOTHES_PER_CHUNK, false),
      acUnit: this.createLayer(acGeo, acMat, ACS_PER_CHUNK, false),
      dish: this.createLayer(dishGeo, dishMat, DISHES_PER_CHUNK, false),
      waterTank: this.createLayer(waterTankGeo, waterTankMat, TANKS_PER_CHUNK, false),
      tinRoof: this.createLayer(tinRoofGeo, tinRoofMat, TIN_ROOFS_PER_CHUNK, false),
      shutter: this.createLayer(shutterGeo, shutterMat, SHUTTERS_PER_CHUNK, false),
      crate: this.createLayer(crateGeo, crateMat, CRATES_PER_CHUNK, false),
      bin: this.createLayer(binGeo, binMat, BINS_PER_CHUNK, false),
      garbage: this.createLayer(garbageGeo, garbageMat, GARBAGE_PER_CHUNK, false),
      bike: this.createLayer(bikeGeo, bikeMat, BIKES_PER_CHUNK, false),
      treeTrunk: this.createLayer(treeTrunkGeo, treeTrunkMat, TREES_PER_CHUNK, false),
      treeCrown: this.createLayer(treeCrownGeo, treeCrownMat, TREES_PER_CHUNK, false),
      bush: this.createLayer(bushGeo, bushMat, BUSHES_PER_CHUNK, false),
      poleHardware: this.createLayer(poleHardwareGeo, poleHardwareMat, POLES_PER_CHUNK, false),
      hawkerCart: this.createLayer(hawkerCartGeo, hawkerCartMat, HAWKERS_PER_CHUNK, false),
      hawkerCanopy: this.createLayer(hawkerCanopyGeo, hawkerCanopyMat, HAWKERS_PER_CHUNK, false),
    };
  }

  public initChunkPool(chunkIndex: number, sceneryGroup: THREE.Group): void {
    // 1. Pooled Building Slots
    const buildings: BuildingSlot[] = [];
    for (let i = 0; i < BUILDINGS_PER_CHUNK; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(this.buildingBoxGeos[0], [
        this.wallSideMats[0],
        this.wallSideMats[0],
        this.parapetMat,
        this.parapetMat,
        this.wallSideMats[0],
        this.wallSideMats[0],
      ]);
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.5, 1.04), this.parapetMat);
      const stairRoom = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.3, 3.2), this.parapetMat);
      group.add(body, parapet, stairRoom);
      sceneryGroup.add(group);
      buildings.push({ group, body, parapet, stairRoom });
    }

    // 2. Pooled Ground-Floor Shops (Signboard + Awning)
    const shops: ShopSlot[] = [];
    const signGeo = new THREE.PlaneGeometry(5.6, 1.15);
    const signBackGeo = new THREE.BoxGeometry(0.14, 1.24, 5.8);
    const awningGeo = new THREE.BoxGeometry(1.65, 0.12, 6.2);
    for (let i = 0; i < SHOPS_PER_CHUNK; i++) {
      const group = new THREE.Group();
      const signBack = new THREE.Mesh(signBackGeo, this.trussMat);
      signBack.position.set(0, 3.65, 0);
      const signMesh = new THREE.Mesh(signGeo, this.shopSignMats[0]);
      signMesh.position.set(0.09, 3.65, 0);
      signMesh.rotation.y = Math.PI / 2;
      const awningMesh = new THREE.Mesh(awningGeo, this.awningMats[0]);
      awningMesh.position.set(0.84, 2.95, 0);
      awningMesh.rotation.z = -0.18;
      group.add(signBack, signMesh, awningMesh);
      sceneryGroup.add(group);
      shops.push({ group, signMesh, signBack, awningMesh });
    }

    // 3. Pooled Hanging Banners (political-free, suspended with top bar & wire hangers)
    const banners: BannerSlot[] = [];
    const bannerGeo = new THREE.PlaneGeometry(3.2, 1.05);
    const bannerBarGeo = new THREE.BoxGeometry(3.35, 0.06, 0.06);
    const bannerHangerGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.35, 5);
    for (let i = 0; i < BANNERS_PER_CHUNK; i++) {
      const group = new THREE.Group();
      const plane = new THREE.Mesh(bannerGeo, this.bannerMats[0]);
      const poleL = new THREE.Mesh(bannerBarGeo, this.poleMat);
      poleL.position.set(0, 0.55, 0);
      const poleR = new THREE.Mesh(bannerBarGeo, this.poleMat);
      poleR.position.set(0, -0.55, 0);
      const hangL = new THREE.Mesh(bannerHangerGeo, this.poleMat);
      hangL.position.set(-1.35, 1.22, 0);
      const hangR = new THREE.Mesh(bannerHangerGeo, this.poleMat);
      hangR.position.set(1.35, 1.22, 0);
      group.add(plane, poleL, poleR, hangL, hangR);
      sceneryGroup.add(group);
      banners.push({ group, plane, poleL, poleR });
    }

    // 4. Pooled Wall Posters
    const posters: THREE.Mesh[] = [];
    const posterGeo = new THREE.PlaneGeometry(1.75, 1.28);
    for (let i = 0; i < POSTERS_PER_CHUNK; i++) {
      const m = new THREE.Mesh(posterGeo, this.posterMats[0]);
      sceneryGroup.add(m);
      posters.push(m);
    }

    // 5. Pooled Steel-Truss Billboard Frames
    const billboards: BillboardSlot[] = [];
    const postGeo = new THREE.CylinderGeometry(0.14, 0.18, 6.4, 8);
    const trussBraceGeo = new THREE.BoxGeometry(0.1, 0.1, 4.1);
    const frameBackGeo = new THREE.BoxGeometry(0.28, 3.05, 6.45);
    const frameFaceGeo = new THREE.PlaneGeometry(6.05, 2.68);
    const lampArmGeo = new THREE.BoxGeometry(0.75, 0.08, 0.08);
    for (let i = 0; i < BILLBOARDS_PER_CHUNK; i++) {
      const group = new THREE.Group();
      const p1 = new THREE.Mesh(postGeo, this.trussMat);
      p1.position.set(0, 3.2, -1.9);
      const p2 = new THREE.Mesh(postGeo, this.trussMat);
      p2.position.set(0, 3.2, 1.9);
      const brace1 = new THREE.Mesh(trussBraceGeo, this.trussMat);
      brace1.position.set(0, 2.8, 0);
      brace1.rotation.x = 0.55;
      const brace2 = new THREE.Mesh(trussBraceGeo, this.trussMat);
      brace2.position.set(0, 2.8, 0);
      brace2.rotation.x = -0.55;
      const back = new THREE.Mesh(frameBackGeo, this.trussMat);
      back.position.set(0, 6.65, 0);
      const arm1 = new THREE.Mesh(lampArmGeo, this.trussMat);
      arm1.position.set(-0.42, 8.2, -1.6);
      const arm2 = new THREE.Mesh(lampArmGeo, this.trussMat);
      arm2.position.set(-0.42, 8.2, 1.6);

      const face = new THREE.Mesh(frameFaceGeo, this.billboardMats[0]);
      face.position.set(-0.16, 6.65, 0);
      face.rotation.y = -Math.PI / 2;

      group.add(p1, p2, brace1, brace2, back, arm1, arm2, face);
      sceneryGroup.add(group);
      billboards.push({ group, face });
    }

    // 6. Pooled Dense Overhead Electric Poles & Wires
    const wireCluster = this.createPooledWireCluster();
    sceneryGroup.add(wireCluster.group);

    // 7. Pooled Pedestrian Footbridge (ফুটওভার ব্রিজ)
    const footbridge = this.createPooledFootbridge();
    footbridge.group.visible = false;
    sceneryGroup.add(footbridge.group);

    this.chunkPools[chunkIndex] = {
      buildings,
      shops,
      banners,
      posters,
      billboards,
      wireCluster,
      footbridge,
    };
  }

  private createPooledWireCluster(): WireClusterSlot {
    const group = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 7.9, 7);
    const arm1Geo = new THREE.BoxGeometry(1.5, 0.11, 0.11);
    const arm2Geo = new THREE.BoxGeometry(1.2, 0.09, 0.09);

    [-9.3, 9.3].forEach((px) => {
      for (const pz of [-11, 11]) {
        const pole = new THREE.Mesh(poleGeo, this.poleMat);
        pole.position.set(px, 3.95, pz);
        const arm1 = new THREE.Mesh(arm1Geo, this.poleMat);
        arm1.position.set(px, 7.45, pz);
        const arm2 = new THREE.Mesh(arm2Geo, this.poleMat);
        arm2.position.set(px, 6.45, pz);
        group.add(pole, arm1, arm2);
      }

      // 6 longitudinal sagging power/telecom wires along each sidewalk
      for (let w = 0; w < 6; w++) {
        const wx = px + (w - 2.5) * 0.22;
        const wy = 6.3 + (w % 3) * 0.56;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(wx, wy, -CHUNK_LEN / 2),
          new THREE.Vector3(wx + ((w % 2) - 0.5) * 0.12, wy - 0.55 - (w % 3) * 0.14, 0),
          new THREE.Vector3(wx, wy, CHUNK_LEN / 2),
        ]);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(8));
        group.add(new THREE.Line(lineGeo, this.wireMat));
      }
    });

    // Pool of 18 cross-street overhead wire strands (visibility toggled by zone density!)
    const crossWires: THREE.Line[] = [];
    for (let i = 0; i < 18; i++) {
      const zOff = -19 + i * 2.2;
      const yStart = 6.05 + (i % 5) * 0.34;
      const sag = 0.55 + (i % 4) * 0.26;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-9.3, yStart, zOff),
        new THREE.Vector3(-3.2, yStart - sag * 0.85, zOff + (i % 2 === 0 ? 0.55 : -0.45)),
        new THREE.Vector3(3.2, yStart - sag, zOff - (i % 2 === 0 ? 0.45 : 0.55)),
        new THREE.Vector3(9.3, yStart + 0.12, zOff + (i % 3 === 0 ? 0.7 : -0.35)),
      ]);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
      const line = new THREE.Line(lineGeo, this.wireMat);
      group.add(line);
      crossWires.push(line);
    }

    return { group, crossWires };
  }

  private createPooledFootbridge(): FootbridgeSlot {
    const group = new THREE.Group();
    const deckY = 6.25;
    const deckW = 21.8;

    // Main bridge walkway slab & steel side trusses (clearance >= 5.95m above road)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.35, 2.7), this.trussMat);
    deck.position.set(0, deckY, 0);

    const railFront = new THREE.Mesh(new THREE.BoxGeometry(deckW, 1.15, 0.1), this.trussMat);
    railFront.position.set(0, deckY + 0.72, 1.3);
    const railBack = railFront.clone();
    railBack.position.z = -1.3;

    // Overhead corrugated canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(deckW + 0.6, 0.12, 3.2), this.footbridgeCanopyMat);
    canopy.position.set(0, deckY + 2.45, 0);

    // Support pillars on outer sidewalk edges (clear of road & inner curb)
    const colGeo = new THREE.CylinderGeometry(0.24, 0.28, deckY + 2.4, 8);
    for (const sx of [-9.95, 9.95]) {
      for (const sz of [-1.2, 1.2]) {
        const col = new THREE.Mesh(colGeo, this.trussMat);
        col.position.set(sx, (deckY + 2.4) / 2, sz);
        group.add(col);
      }

      // Angled stair ramp descending neatly along sidewalk
      const stair = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 7.2), this.trussMat);
      stair.position.set(sx, deckY * 0.5, 4.1);
      stair.rotation.x = 0.75;
      group.add(stair);
    }

    // Bangla awareness/promo sign mounted across front truss
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 1.18), this.footbridgeSignMat);
    sign.position.set(0, deckY + 0.72, 1.37);

    group.add(deck, railFront, railBack, canopy, sign);
    return { group };
  }

  private getZoneDensity(area: AreaConfig): ZoneDensity {
    if (area.buildingStyle === 'market' || area.buildingStyle === 'oldtown') return 'high';
    if (area.buildingStyle === 'port') return 'medium_high';
    if (area.buildingStyle === 'modern') return 'modern';
    return 'sparse';
  }

  private setSlotMatrix(
    layer: InstancedLayer,
    chunkIndex: number,
    localIdx: number,
    x: number,
    y: number,
    localZ: number,
    rotX = 0,
    rotY = 0,
    rotZ = 0,
    scaleX = 1,
    scaleY = 1,
    scaleZ = 1,
    colorHex?: string,
    detailTier: 0 | 1 = 0
  ): void {
    if (localIdx >= layer.perChunk) return;
    const slot = chunkIndex * layer.perChunk + localIdx;
    layer.localZ[slot] = localZ;
    layer.active[slot] = 1;
    layer.detailTier[slot] = detailTier;

    _dummy.position.set(x, y, localZ);
    _dummy.rotation.set(rotX, rotY, rotZ);
    _dummy.scale.set(scaleX, scaleY, scaleZ);
    _dummy.updateMatrix();
    _dummy.matrix.toArray(layer.baseMatrices, slot * 16);
    layer.mesh.setMatrixAt(slot, _dummy.matrix);

    if (colorHex) {
      _color.set(colorHex);
      layer.mesh.setColorAt(slot, _color);
    }
  }

  private clearChunkSlots(chunkIndex: number): void {
    _mat4.makeScale(0, 0, 0);
    for (const layer of this.allLayers) {
      const start = chunkIndex * layer.perChunk;
      for (let i = 0; i < layer.perChunk; i++) {
        const slot = start + i;
        layer.active[slot] = 0;
        layer.mesh.setMatrixAt(slot, _mat4);
      }
      layer.mesh.instanceMatrix.needsUpdate = true;
      if (layer.mesh.instanceColor) layer.mesh.instanceColor.needsUpdate = true;
    }
  }

  public populateChunk(
    chunkIndex: number,
    seedIdx: number,
    area: AreaConfig,
    hasDivider: boolean,
    quality: GraphicsQuality
  ): void {
    const pool = this.chunkPools[chunkIndex];
    if (!pool) return;

    this.clearChunkSlots(chunkIndex);
    const rng = makeRng((seedIdx + 1) * 7919 + area.name.length * 193);
    const density = this.getZoneDensity(area);

    // Track per-layer local write cursors for this chunk
    let cBalc = 0;
    let cCloth = 0;
    let cAc = 0;
    let cDish = 0;
    let cTank = 0;
    let cTin = 0;
    let cShutter = 0;
    let cCrate = 0;
    let cBin = 0;
    let cGarb = 0;
    let cBike = 0;
    let cTree = 0;
    let cBush = 0;
    let cPoleHw = 0;
    let cHawker = 0;

    // 1. Buildings (3 slots per side; highway leaves 1 slot open occasionally for openness)
    let bIdx = 0;
    let shopIdx = 0;
    let posterIdx = 0;
    const zSlots = [-14.8, 0.0, 14.8];

    const clothesColors = ['#ef4444', '#facc15', '#38bdf8', '#ec4899', '#f8fafc', '#22c55e', '#f97316'];
    const tankColors = ['#18181b', '#18181b', '#0369a1', '#065f46'];
    const tinColors = ['#3b82f6', '#dc2626', '#64748b', '#0f766e'];
    const bikeColors = ['#dc2626', '#1e293b', '#0284c7', '#64748b', '#16a34a'];
    const garbageColors = ['#1c1917', '#27272a', '#3f3f46', '#44403c'];
    const treeGreens = ['#2b7a22', '#358829', '#23681e', '#418f2b'];
    const bushGreens = ['#1b6d20', '#257d26', '#165a1a', '#2e8b2d'];

    [-1, 1].forEach((side) => {
      const facingDir = side === -1 ? 1 : -1;
      for (let s = 0; s < zSlots.length; s++) {
        const slot = pool.buildings[bIdx++];
        if (!slot) continue;

        // Highway zones have wider open gaps between buildings
        if (density === 'sparse' && s === 1 && rng() < 0.6) {
          slot.group.visible = false;
          continue;
        }
        slot.group.visible = true;

        const floors =
          density === 'modern'
            ? 5 + Math.floor(rng() * 5) // 5-9 floors
            : density === 'high'
            ? 4 + Math.floor(rng() * 5) // 4-8 floors
            : 4 + Math.floor(rng() * 4); // 4-7 floors
        const geoIdx = Math.max(0, Math.min(5, floors - 4));
        const bHeight = floors * 2.95 + 1.4;
        const bDepth = 5.8 + rng() * 3.0; // X thickness
        const bWidth = density === 'high' ? 12.2 + rng() * 2.4 : 10.4 + rng() * 3.2; // Z frontage
        const setback = 12.6 + bDepth * 0.5 + (density === 'sparse' ? 0.9 : rng() * 0.65);
        const bx = side * setback;
        const bz = zSlots[s] + (rng() - 0.5) * 1.1;
        const frontFaceX = bx - side * (bDepth * 0.5);

        const matPick = Math.floor(rng() * this.facadeMats.length);
        const fMat = this.facadeMats[matPick];
        const sMat = this.wallSideMats[matPick];

        slot.body.geometry = this.buildingBoxGeos[geoIdx];
        slot.body.scale.set(bDepth, 1, bWidth);
        slot.body.material = [
          facingDir === 1 ? fMat : sMat,
          facingDir === -1 ? fMat : sMat,
          this.parapetMat,
          this.parapetMat,
          sMat,
          sMat,
        ];
        slot.body.position.set(0, bHeight / 2, 0);

        slot.parapet.scale.set(bDepth, 1, bWidth);
        slot.parapet.position.set(0, bHeight + 0.25, 0);

        slot.stairRoom.visible = floors >= 6 || rng() > 0.45;
        slot.stairRoom.position.set(side * (bDepth * 0.15), bHeight + 1.15, (rng() - 0.5) * 2.5);

        slot.group.position.set(bx, 0, bz);

        // Rooftop Water Tanks (1-2 per building)
        if (cTank < TANKS_PER_CHUNK) {
          this.setSlotMatrix(
            this.layers.waterTank,
            chunkIndex,
            cTank++,
            bx - side * (bDepth * 0.16),
            bHeight + 0.48,
            bz + (rng() - 0.5) * 2.5,
            0,
            rng() * Math.PI,
            0,
            1,
            1,
            1,
            tankColors[Math.floor(rng() * tankColors.length)],
            0
          );
        }

        // Rooftop or Front Satellite Dishes
        if (cDish < DISHES_PER_CHUNK && (density === 'modern' || rng() > 0.45)) {
          this.setSlotMatrix(
            this.layers.dish,
            chunkIndex,
            cDish++,
            frontFaceX + side * 0.45,
            bHeight + 0.48,
            bz + (rng() - 0.5) * 3.0,
            0,
            side === -1 ? 0.4 : Math.PI - 0.4,
            0,
            1,
            1,
            1,
            undefined,
            1
          );
        }

        // Tin-Roof Extension on roof or shopfront overhang
        if (cTin < TIN_ROOFS_PER_CHUNK && (density !== 'modern' || rng() > 0.6)) {
          const onRoof = rng() > 0.48;
          this.setSlotMatrix(
            this.layers.tinRoof,
            chunkIndex,
            cTin++,
            onRoof ? bx : frontFaceX - side * 0.85,
            onRoof ? bHeight + 0.65 : 3.2,
            bz + (rng() - 0.5) * 2.0,
            0,
            side === -1 ? 0 : Math.PI,
            0,
            1,
            1,
            onRoof ? 1.1 : 1.35,
            tinColors[Math.floor(rng() * tinColors.length)],
            0
          );
        }

        // Balconies with Hanging Clothes & AC Units on upper floors
        const balcFloors = Math.min(3, floors - 2);
        for (let bf = 1; bf <= balcFloors; bf++) {
          const fy = 4.4 + (bf - 1) * 3.1;
          if (fy > bHeight - 2.0) break;

          if (cBalc < BALCONIES_PER_CHUNK && (bf % 2 === 1 || rng() > 0.35)) {
            const balcZ = bz + (bf % 2 === 0 ? 2.4 : -2.2);
            this.setSlotMatrix(
              this.layers.balcony,
              chunkIndex,
              cBalc++,
              frontFaceX - side * 0.45,
              fy,
              balcZ,
              0,
              side === -1 ? 0 : Math.PI,
              0,
              1,
              1,
              1,
              undefined,
              0
            );

            // Hanging clothes on balcony railing
            if (cCloth < CLOTHES_PER_CHUNK && rng() > 0.25) {
              for (let cl = 0; cl < 2 && cCloth < CLOTHES_PER_CHUNK; cl++) {
                this.setSlotMatrix(
                  this.layers.clothes,
                  chunkIndex,
                  cCloth++,
                  frontFaceX - side * 0.92,
                  fy + 0.36,
                  balcZ - 0.45 + cl * 0.88,
                  0,
                  (rng() - 0.5) * 0.2,
                  0,
                  1,
                  0.9 + rng() * 0.25,
                  0.9 + rng() * 0.25,
                  clothesColors[Math.floor(rng() * clothesColors.length)],
                  1
                );
              }
            }
          }

          // AC condenser unit mounted on facade
          if (cAc < ACS_PER_CHUNK && (density === 'modern' || rng() > 0.38)) {
            this.setSlotMatrix(
              this.layers.acUnit,
              chunkIndex,
              cAc++,
              frontFaceX - side * 0.18,
              fy + 0.55,
              bz + (bf % 2 === 0 ? -2.8 : 2.6),
              0,
              side === -1 ? 0 : Math.PI,
              0,
              1,
              1,
              1,
              undefined,
              1
            );
          }
        }

        // Ground-Floor Shopfront (Signboard + Awning + Shutters + Outside Stacked Goods)
        const hasShop = density !== 'sparse' || rng() > 0.35;
        if (hasShop && shopIdx < SHOPS_PER_CHUNK) {
          const shopPreset = SHOP_CATALOG[(seedIdx * 3 + shopIdx + s) % SHOP_CATALOG.length];
          const sSlot = pool.shops[shopIdx++];
          sSlot.group.visible = true;
          sSlot.group.position.set(frontFaceX, 0, bz);
          sSlot.group.rotation.y = side === -1 ? 0 : Math.PI;
          sSlot.signMesh.material = this.shopSignMats[(seedIdx * 3 + shopIdx) % this.shopSignMats.length];
          sSlot.awningMesh.material = this.awningMats[(seedIdx + shopIdx) % this.awningMats.length];

          // Corrugated steel shutter flanking shop entrance
          if (cShutter < SHUTTERS_PER_CHUNK) {
            this.setSlotMatrix(
              this.layers.shutter,
              chunkIndex,
              cShutter++,
              frontFaceX - side * 0.06,
              0,
              bz + 3.6,
              0,
              side === -1 ? 0 : Math.PI,
              0,
              1,
              1,
              1,
              undefined,
              1
            );
          }

          // Stacked goods outside shop on outer sidewalk edge (x around ±11.6..±12.2)
          const goodsCount = density === 'high' ? 3 : 2;
          for (let g = 0; g < goodsCount && cCrate < CRATES_PER_CHUNK; g++) {
            this.setSlotMatrix(
              this.layers.crate,
              chunkIndex,
              cCrate++,
              frontFaceX - side * (0.55 + rng() * 0.45),
              0.2,
              bz - 2.4 + g * 2.1 + (rng() - 0.5) * 0.5,
              0,
              (rng() - 0.5) * 0.4,
              0,
              0.9 + rng() * 0.25,
              0.9 + rng() * 0.28,
              0.9 + rng() * 0.25,
              shopPreset.crateColors[g % 3],
              g > 0 ? 1 : 0
            );
          }
        }

        // Political-Free Wall Posters (movies, school admission, sale offers)
        if (posterIdx < POSTERS_PER_CHUNK && (density === 'high' || rng() > 0.3)) {
          const pm = pool.posters[posterIdx++];
          pm.visible = true;
          pm.material = this.posterMats[(seedIdx * 5 + posterIdx) % this.posterMats.length];
          pm.position.set(frontFaceX - side * 0.07, 1.55, bz + (s % 2 === 0 ? 3.8 : -3.8));
          pm.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
        }
      }
    });

    // Hide unused shop & poster pool slots
    for (let i = shopIdx; i < SHOPS_PER_CHUNK; i++) pool.shops[i].group.visible = false;
    for (let i = posterIdx; i < POSTERS_PER_CHUNK; i++) pool.posters[i].visible = false;

    // 2. Hanging Political-Free Bangla Banners along sidewalk poles
    const bannerTarget = density === 'high' ? 4 : density === 'sparse' ? 2 : 3;
    for (let i = 0; i < BANNERS_PER_CHUNK; i++) {
      const bSlot = pool.banners[i];
      if (i >= bannerTarget) {
        bSlot.group.visible = false;
        continue;
      }
      bSlot.group.visible = true;
      const side = i % 2 === 0 ? -1 : 1;
      bSlot.plane.material = this.bannerMats[(seedIdx * 2 + i) % this.bannerMats.length];
      bSlot.group.position.set(side * 10.7, 4.95 + (i % 2) * 0.35, -15 + i * 10);
      bSlot.group.rotation.set(0, side === -1 ? 0.14 : -0.14, (rng() - 0.5) * 0.04);
    }

    // 3. Billboard Frames
    const bbTarget = density === 'sparse' || density === 'modern' ? 2 : seedIdx % 2 === 0 ? 2 : 1;
    for (let i = 0; i < BILLBOARDS_PER_CHUNK; i++) {
      const bb = pool.billboards[i];
      if (i >= bbTarget) {
        bb.group.visible = false;
        continue;
      }
      bb.group.visible = true;
      const side: -1 | 1 = (seedIdx + i) % 2 === 0 ? 1 : -1;
      bb.face.material = this.billboardMats[(seedIdx * 2 + i) % this.billboardMats.length];
      bb.group.position.set(side * 11.45, 0, i === 0 ? -6.5 : 12.5);
      bb.group.rotation.y = side === 1 ? 0.22 : Math.PI - 0.22;
    }

    // 4. Overhead Wires Density & Pole Transformers + Cable Bundles
    const wireCount =
      density === 'high' ? 18 : density === 'medium_high' ? 14 : density === 'modern' ? 10 : 7;
    pool.wireCluster.crossWires.forEach((line, idx) => {
      line.visible = idx < wireCount && (seedIdx % 2 === 0 || idx % 2 === 0);
    });

    [-9.3, 9.3].forEach((px, pSideIdx) => {
      for (const pz of [-11, 11]) {
        if (cPoleHw < POLES_PER_CHUNK && (pSideIdx === 0 || pz > 0)) {
          this.setSlotMatrix(
            this.layers.poleHardware,
            chunkIndex,
            cPoleHw++,
            px + (px > 0 ? -0.25 : 0.25),
            0,
            pz,
            0,
            px > 0 ? Math.PI : 0,
            0,
            1,
            1,
            1,
            undefined,
            0
          );
        }
      }
    });

    // 5. Pedestrian Footbridge every 3-4 zones when flyover isn't present on that chunk
    const showFootbridge = !area.hasFlyover && seedIdx % 3 === 1;
    pool.footbridge.group.visible = showFootbridge;
    pool.footbridge.group.position.set(0, 0, -4.0);

    // 6. Trees & Bushes (sidewalks + center median divider via InstancedMesh!)
    const dividerStart = hasDivider ? -20 : 0;
    const dividerEnd = hasDivider ? 16 : 20;
    let mIdx = 0;
    for (let z = dividerStart + 1.3; z <= dividerEnd - 1.2; z += 2.5) {
      if (mIdx % 4 === 1 && cTree < TREES_PER_CHUNK) {
        const s = 0.88 + rng() * 0.26; // ±15% scale variation
        const rot = rng() * Math.PI * 2;
        const gCol = treeGreens[Math.floor(rng() * treeGreens.length)];
        this.setSlotMatrix(this.layers.treeTrunk, chunkIndex, cTree, 0, 0.24, z, 0, rot, 0, s, s, s, undefined, 0);
        this.setSlotMatrix(this.layers.treeCrown, chunkIndex, cTree, 0, 0.24, z, 0, rot, 0, s, s, s, gCol, 0);
        cTree++;
      } else if (cBush < BUSHES_PER_CHUNK) {
        const s = 0.85 + rng() * 0.3;
        const bCol = bushGreens[Math.floor(rng() * bushGreens.length)];
        this.setSlotMatrix(
          this.layers.bush,
          chunkIndex,
          cBush++,
          0,
          0.26,
          z,
          0,
          rng() * Math.PI,
          0,
          s,
          s * 0.9,
          s,
          bCol,
          0
        );
      }
      mIdx++;
    }

    // Sidewalk trees & bushes
    [-1, 1].forEach((side) => {
      for (const tz of [-16, 15]) {
        if (cTree < TREES_PER_CHUNK && (density !== 'high' || rng() > 0.35)) {
          const s = 0.92 + rng() * 0.28;
          const rot = rng() * Math.PI * 2;
          const tx = side * (11.5 + rng() * 0.4);
          this.setSlotMatrix(this.layers.treeTrunk, chunkIndex, cTree, tx, 0.2, tz, 0, rot, 0, s, s, s, undefined, 0);
          this.setSlotMatrix(
            this.layers.treeCrown,
            chunkIndex,
            cTree,
            tx,
            0.2,
            tz,
            0,
            rot,
            0,
            s,
            s,
            s,
            treeGreens[Math.floor(rng() * treeGreens.length)],
            0
          );
          cTree++;
        }
      }
      for (let sb = 0; sb < 2 && cBush < BUSHES_PER_CHUNK; sb++) {
        this.setSlotMatrix(
          this.layers.bush,
          chunkIndex,
          cBush++,
          side * 11.4,
          0.2,
          -6 + sb * 16,
          0,
          rng() * Math.PI,
          0,
          1.1,
          0.95,
          1.1,
          bushGreens[Math.floor(rng() * bushGreens.length)],
          1
        );
      }
    });

    // 7. Litter Bins, Garbage Piles, Parked Bikes & Hawker Carts (strictly on sidewalks, road clear!)
    const binCount = density === 'modern' ? 6 : 4;
    for (let i = 0; i < binCount && cBin < BINS_PER_CHUNK; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.setSlotMatrix(
        this.layers.bin,
        chunkIndex,
        cBin++,
        side * (9.2 + rng() * 0.3),
        0.2,
        -17 + i * 9 + rng() * 3,
        0,
        rng() * Math.PI,
        0,
        1,
        1,
        1,
        i % 2 === 0 ? '#16a34a' : '#0284c7',
        1
      );
    }

    const garbCount = density === 'high' ? 8 : density === 'modern' ? 2 : 5;
    for (let i = 0; i < garbCount && cGarb < GARBAGE_PER_CHUNK; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.setSlotMatrix(
        this.layers.garbage,
        chunkIndex,
        cGarb++,
        side * (11.7 + rng() * 0.5),
        0.2,
        -19 + i * 5.2 + rng() * 2,
        0,
        rng() * Math.PI,
        0,
        0.85 + rng() * 0.35,
        0.85 + rng() * 0.3,
        0.85 + rng() * 0.35,
        garbageColors[Math.floor(rng() * garbageColors.length)],
        1
      );
    }

    const bikeCount = density === 'high' ? 6 : density === 'sparse' ? 3 : 5;
    for (let i = 0; i < bikeCount && cBike < BIKES_PER_CHUNK; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.setSlotMatrix(
        this.layers.bike,
        chunkIndex,
        cBike++,
        side * (9.25 + rng() * 0.25),
        0.2,
        -14 + i * 6.5 + rng() * 2,
        0,
        side * (0.25 + rng() * 0.3),
        0,
        1,
        1,
        1,
        bikeColors[Math.floor(rng() * bikeColors.length)],
        1
      );
    }

    const hawkerCount = density === 'high' ? 4 : density === 'sparse' ? 1 : 2;
    const canopyColors = ['#dc2626', '#eab308', '#0284c7', '#16a34a', '#ea580c'];
    for (let i = 0; i < hawkerCount && cHawker < HAWKERS_PER_CHUNK; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const hx = side * (10.35 + rng() * 0.35);
      const hz = -12 + i * 10 + (rng() - 0.5) * 3;
      const hRot = side === -1 ? 0.08 : Math.PI - 0.08;
      this.setSlotMatrix(this.layers.hawkerCart, chunkIndex, cHawker, hx, 0.2, hz, 0, hRot, 0, 1, 1, 1, undefined, 0);
      this.setSlotMatrix(
        this.layers.hawkerCanopy,
        chunkIndex,
        cHawker,
        hx,
        0.2,
        hz,
        0,
        hRot,
        0,
        1,
        1,
        1,
        canopyColors[Math.floor(rng() * canopyColors.length)],
        0
      );
      cHawker++;
    }

    // Push updated static colors & initial matrices
    for (const layer of this.allLayers) {
      layer.mesh.instanceMatrix.needsUpdate = true;
      if (layer.mesh.instanceColor) layer.mesh.instanceColor.needsUpdate = true;
    }

    // Apply quality filter immediately if in low quality mode
    this.applyQuality(quality);
  }

  public applyQuality(quality: GraphicsQuality): void {
    const isLow = quality === 'low';
    for (const layer of this.allLayers) {
      const total = layer.active.length;
      const arr = layer.mesh.instanceMatrix.array as Float32Array;
      const base = layer.baseMatrices;
      for (let slot = 0; slot < total; slot++) {
        if (!layer.active[slot]) continue;
        const off = slot * 16;
        if (isLow && layer.detailTier[slot] === 1) {
          // Zero out scale basis columns to hide secondary micro-detail in low mode cleanly
          arr[off + 0] = 0;
          arr[off + 1] = 0;
          arr[off + 2] = 0;
          arr[off + 4] = 0;
          arr[off + 5] = 0;
          arr[off + 6] = 0;
          arr[off + 8] = 0;
          arr[off + 9] = 0;
          arr[off + 10] = 0;
        } else if (layer.detailTier[slot] === 1) {
          // Restore original scale & rotation basis from baseMatrices when switching Low -> High
          arr[off + 0] = base[off + 0];
          arr[off + 1] = base[off + 1];
          arr[off + 2] = base[off + 2];
          arr[off + 4] = base[off + 4];
          arr[off + 5] = base[off + 5];
          arr[off + 6] = base[off + 6];
          arr[off + 8] = base[off + 8];
          arr[off + 9] = base[off + 9];
          arr[off + 10] = base[off + 10];
        }
      }
      layer.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // Zero-GC per-frame chunk Z sync: writes only translation.z [slot * 16 + 14]!
  public syncChunkTransforms(chunks: { z: number }[], _quality: GraphicsQuality): void {
    const chunkCount = chunks.length;
    for (let l = 0; l < this.allLayers.length; l++) {
      const layer = this.allLayers[l];
      const arr = layer.mesh.instanceMatrix.array as Float32Array;
      const perChunk = layer.perChunk;
      for (let c = 0; c < chunkCount; c++) {
        const cz = chunks[c].z;
        const baseSlot = c * perChunk;
        for (let i = 0; i < perChunk; i++) {
          const slot = baseSlot + i;
          if (!layer.active[slot]) continue;
          arr[slot * 16 + 14] = cz + layer.localZ[slot];
        }
      }
      layer.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    for (const layer of this.allLayers) {
      this.scene.remove(layer.mesh);
      layer.mesh.geometry.dispose();
      (layer.mesh.material as THREE.Material).dispose();
    }
    for (const g of this.buildingBoxGeos) g.dispose();
    for (const m of this.facadeMats) {
      m.map?.dispose();
      m.dispose();
    }
    for (const m of this.wallSideMats) m.dispose();
    this.parapetMat.dispose();
    for (const m of this.shopSignMats) {
      m.map?.dispose();
      m.dispose();
    }
    for (const m of this.awningMats) {
      m.map?.dispose();
      m.dispose();
    }
    for (const m of this.bannerMats) {
      m.map?.dispose();
      m.dispose();
    }
    for (const m of this.posterMats) {
      m.map?.dispose();
      m.dispose();
    }
    for (const m of this.billboardMats) {
      m.map?.dispose();
      m.dispose();
    }
    this.poleMat.dispose();
    this.wireMat.dispose();
    this.trussMat.dispose();
    this.footbridgeSignMat.map?.dispose();
    this.footbridgeSignMat.dispose();
    this.footbridgeCanopyMat.map?.dispose();
    this.footbridgeCanopyMat.dispose();
  }
}
