import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Flame, Flower2, Sparkles } from 'lucide-react';
import {
  CakeColorsConfig,
  CakeDesign,
  CandleMode,
  CandleStyle,
  EffectsConfig,
  GiftBoxStyle,
  Language,
} from '../../types/birthday';
import { formatAgeNumber, parseValidAge } from '../../utils/ageUtils';

export type StageMode = 'hero' | 'cake' | 'gifts' | 'tree' | 'finale';

interface Birthday3DStageProps {
  mode?: StageMode;
  cakeDesign?: CakeDesign;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  cakeColors?: CakeColorsConfig;
  candleMode?: CandleMode;
  candleStyle?: CandleStyle;
  darkBg?: boolean;
  bgHex?: string;
  effects?: EffectsConfig;
  candlesLit?: boolean;
  onBlowCandles?: () => void;
  onRelightCandles?: () => void;
  onGiftClick?: (index: number) => void;
  openedGifts?: boolean[];
  wishCount?: number;
  fireworkTrigger?: number;
  recipientName?: string;
  recipientAge?: string;
  lang?: Language;
  heightClass?: string;
  showDock?: boolean;
}

const _vec3 = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createHeartGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.25);
  shape.bezierCurveTo(0, 0.45, -0.35, 0.52, -0.35, 0.2);
  shape.bezierCurveTo(-0.35, -0.05, 0, -0.25, 0, -0.42);
  shape.bezierCurveTo(0, -0.25, 0.35, -0.05, 0.35, 0.2);
  shape.bezierCurveTo(0.35, 0.52, 0, 0.45, 0, 0.25);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  });
  geo.center();
  return geo;
}

function createTeardropFlameGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.036, 0.03),
    new THREE.Vector2(0.048, 0.07),
    new THREE.Vector2(0.032, 0.125),
    new THREE.Vector2(0.012, 0.175),
    new THREE.Vector2(0.0, 0.205),
  ];
  return new THREE.LatheGeometry(pts, 14);
}

function createPedestalStandGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.05, 0.0),
    new THREE.Vector2(1.02, 0.06),
    new THREE.Vector2(0.75, 0.11),
    new THREE.Vector2(0.32, 0.18),
    new THREE.Vector2(0.22, 0.34),
    new THREE.Vector2(0.26, 0.48),
    new THREE.Vector2(0.55, 0.53),
    new THREE.Vector2(1.56, 0.56),
    new THREE.Vector2(1.62, 0.62),
    new THREE.Vector2(1.58, 0.65),
    new THREE.Vector2(0.0, 0.65),
  ];
  return new THREE.LatheGeometry(pts, 44);
}

function createCandleTexture(
  candleStyle: CandleStyle,
  primaryHex: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (candleStyle === 'gold-metallic') {
    const grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, '#B98C2C');
    grad.addColorStop(0.5, '#F6E19C');
    grad.addColorStop(1, '#9E741E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
  } else if (candleStyle === 'rose-blush') {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#FFF8FA');
    grad.addColorStop(1, primaryHex || '#D97B93');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
  } else if (candleStyle === 'pastel-spiral') {
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = primaryHex || '#E66B8A';
    ctx.lineWidth = 22;
    for (let y = -128; y < 384; y += 56) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y + 64);
      ctx.stroke();
    }
    ctx.strokeStyle = accentHex || '#8CC9E6';
    ctx.lineWidth = 14;
    for (let y = -100; y < 384; y += 56) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y + 64);
      ctx.stroke();
    }
  } else {
    // classic-ivory
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#FFFDF7');
    grad.addColorStop(1, '#F3E9D7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates watertight 3D tubular sculpted wax strokes for digits 0-9.
 * Every digit spans approx x in [-0.15, 0.15], y in [0, 0.44].
 */
function buildNumeralDigitMesh(
  digit: string,
  waxMat: THREE.Material,
  foilMat: THREE.Material
): { group: THREE.Group; wickTopY: number; wickX: number } {
  const group = new THREE.Group();
  const radius = 0.048;

  const addStroke = (pts: [number, number][], closed = false) => {
    const vectors = pts.map(([x, y]) => new THREE.Vector3(x, y, 0));
    const curve = new THREE.CatmullRomCurve3(vectors, closed, 'catmullrom', 0.45);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, closed ? 32 : 24, radius, 12, closed),
      waxMat
    );
    tube.castShadow = true;
    group.add(tube);

    if (!closed && vectors.length >= 2) {
      const capGeo = new THREE.SphereGeometry(radius, 12, 10);
      const startCap = new THREE.Mesh(capGeo, waxMat);
      startCap.position.copy(vectors[0]);
      group.add(startCap);

      const endCap = new THREE.Mesh(capGeo, waxMat);
      endCap.position.copy(vectors[vectors.length - 1]);
      group.add(endCap);
    }
  };

  let wickX = 0;
  let wickTopY = 0.48;

  switch (digit) {
    case '0':
      addStroke(
        [
          [0, 0.42],
          [0.12, 0.34],
          [0.13, 0.21],
          [0.12, 0.08],
          [0, 0.02],
          [-0.12, 0.08],
          [-0.13, 0.21],
          [-0.12, 0.34],
        ],
        true
      );
      wickTopY = 0.47;
      break;
    case '1':
      addStroke([
        [-0.09, 0.34],
        [-0.01, 0.42],
        [0.01, 0.42],
        [0.01, 0.02],
      ]);
      addStroke([
        [-0.09, 0.02],
        [0.1, 0.02],
      ]);
      wickX = 0.01;
      wickTopY = 0.47;
      break;
    case '2':
      addStroke([
        [-0.11, 0.34],
        [0.0, 0.42],
        [0.11, 0.35],
        [0.08, 0.23],
        [-0.11, 0.03],
        [0.12, 0.03],
      ]);
      wickX = 0;
      wickTopY = 0.47;
      break;
    case '3':
      addStroke([
        [-0.1, 0.37],
        [0.02, 0.42],
        [0.11, 0.34],
        [0.02, 0.23],
        [-0.03, 0.22],
      ]);
      addStroke([
        [-0.02, 0.22],
        [0.04, 0.21],
        [0.12, 0.12],
        [0.02, 0.02],
        [-0.11, 0.07],
      ]);
      wickX = 0.02;
      wickTopY = 0.47;
      break;
    case '4':
      addStroke([
        [0.07, 0.02],
        [0.07, 0.42],
        [-0.12, 0.16],
        [0.13, 0.16],
      ]);
      wickX = 0.07;
      wickTopY = 0.47;
      break;
    case '5':
      addStroke([
        [0.11, 0.41],
        [-0.09, 0.41],
        [-0.09, 0.24],
        [0.05, 0.24],
        [0.12, 0.14],
        [0.02, 0.02],
        [-0.11, 0.06],
      ]);
      wickX = 0.0;
      wickTopY = 0.46;
      break;
    case '6':
      addStroke([
        [0.09, 0.39],
        [-0.04, 0.41],
        [-0.12, 0.24],
        [-0.11, 0.07],
        [0.01, 0.02],
        [0.12, 0.11],
        [0.04, 0.22],
        [-0.09, 0.17],
      ]);
      wickX = 0.02;
      wickTopY = 0.46;
      break;
    case '7':
      addStroke([
        [-0.11, 0.41],
        [0.12, 0.41],
        [-0.04, 0.02],
      ]);
      wickX = 0.02;
      wickTopY = 0.46;
      break;
    case '8':
      addStroke(
        [
          [0, 0.42],
          [0.1, 0.35],
          [0.08, 0.26],
          [0, 0.22],
          [-0.08, 0.26],
          [-0.1, 0.35],
        ],
        true
      );
      addStroke(
        [
          [0, 0.22],
          [0.1, 0.16],
          [0.11, 0.07],
          [0, 0.02],
          [-0.11, 0.07],
          [-0.1, 0.16],
        ],
        true
      );
      wickTopY = 0.47;
      break;
    case '9':
    default:
      addStroke([
        [-0.09, 0.05],
        [0.04, 0.03],
        [0.12, 0.2],
        [0.11, 0.37],
        [-0.01, 0.42],
        [-0.11, 0.33],
        [-0.03, 0.22],
        [0.09, 0.26],
      ]);
      wickX = 0.0;
      wickTopY = 0.47;
      break;
  }

  // Support pin anchored cleanly into cake frosting
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 10), foilMat);
  pin.position.set(0, -0.04, 0);
  group.add(pin);

  return { group, wickTopY, wickX };
}

function buildCompositeCake(params: {
  cakeDesign: CakeDesign;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  cakeColors?: CakeColorsConfig;
  recipientAge?: string;
  candleMode?: CandleMode;
  candleStyle?: CandleStyle;
}): {
  group: THREE.Group;
  flames: THREE.Mesh[];
  halos: THREE.Mesh[];
  candleLights: THREE.PointLight[];
  smokeMeshes: THREE.Mesh[];
  textures: THREE.Texture[];
} {
  const {
    cakeDesign,
    primaryHex,
    secondaryHex,
    accentHex,
    cakeColors,
    recipientAge,
    candleMode = 'auto',
    candleStyle = 'classic-ivory',
  } = params;

  const group = new THREE.Group();
  const flames: THREE.Mesh[] = [];
  const halos: THREE.Mesh[] = [];
  const candleLights: THREE.PointLight[] = [];
  const smokeMeshes: THREE.Mesh[] = [];
  const textures: THREE.Texture[] = [];

  const isNeon = cakeDesign === 'neon-party';
  const isRoyal = cakeDesign === 'royal-crown' || cakeDesign === 'luxury-tiered';
  const isBlackGold = cakeDesign === 'black-gold';
  const isChocolate = cakeDesign === 'chocolate-ganache';
  const isWhite = cakeDesign === 'white-elegant';
  const isRose = cakeDesign === 'rose-garden';
  const isPastel = cakeDesign === 'pastel-cloud';
  const isChildrens = cakeDesign === 'childrens-colorful';

  // 1. Sculpted Lathe Pedestal Stand
  const standMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(
      isRoyal || isBlackGold ? '#D4AF37' : isChocolate ? '#E6D6C5' : '#F8F4EE'
    ),
    roughness: isRoyal || isBlackGold ? 0.2 : 0.35,
    metalness: isRoyal || isBlackGold ? 0.85 : 0.12,
    clearcoat: 0.55,
  });
  const pedestal = new THREE.Mesh(createPedestalStandGeometry(), standMat);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  // 2. Cake Tier Colors (harmonized across styles + optional custom overrides)
  const tier1Color =
    cakeColors?.tier1 ||
    (isBlackGold
      ? '#1A181D'
      : isChocolate
      ? '#4A2B20'
      : isNeon
      ? '#1B1F36'
      : isPastel
      ? '#FFF3EC'
      : isChildrens
      ? '#FCE38A'
      : isWhite
      ? '#FFFFFF'
      : '#FFFDF8');

  const tier2Color =
    cakeColors?.tier2 ||
    (isBlackGold
      ? '#242028'
      : isChocolate
      ? '#633B2C'
      : isNeon
      ? primaryHex
      : isChildrens
      ? '#95E1D3'
      : isWhite
      ? '#F7F5F0'
      : secondaryHex);

  const tier3Color =
    cakeColors?.frosting ||
    (isBlackGold
      ? '#1F1C22'
      : isChocolate
      ? '#3D2218'
      : isNeon
      ? secondaryHex
      : isChildrens
      ? '#F38181'
      : isWhite
      ? '#FFFFFF'
      : '#FFF7F9');

  const garnishColor =
    cakeColors?.accent ||
    (isBlackGold || isRoyal ? '#D4AF37' : isChocolate ? '#C99B6B' : accentHex || primaryHex);

  const makeTierMat = (hex: string, rough = 0.62) =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness: rough,
      metalness: isNeon ? 0.18 : 0.04,
    });

  // Tier heights & radii sitting cleanly on pedestal top (y = 0.65)
  const tier1 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.22, 1.26, 0.62, 44),
    makeTierMat(tier1Color, isChocolate ? 0.42 : 0.66)
  );
  tier1.position.y = 0.96; // bottom 0.65, top 1.27
  tier1.castShadow = true;
  tier1.receiveShadow = true;
  group.add(tier1);

  const tier2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 0.95, 0.54, 40),
    makeTierMat(tier2Color, isChocolate ? 0.4 : 0.58)
  );
  tier2.position.y = 1.54; // bottom 1.27, top 1.81
  tier2.castShadow = true;
  tier2.receiveShadow = true;
  group.add(tier2);

  const tier3 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.66, 0.46, 36),
    makeTierMat(tier3Color, 0.52)
  );
  tier3.position.y = 2.04; // bottom 1.81, top 2.27
  tier3.castShadow = true;
  tier3.receiveShadow = true;
  group.add(tier3);

  const topTierTopY = 2.27;

  // Frosting Top Glaze Ring + Drips on Tier 2 & Tier 3
  const glazeColor = isChocolate ? '#2E160F' : isBlackGold ? '#D4AF37' : tier3Color;
  const glazeMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(glazeColor),
    roughness: isChocolate ? 0.18 : 0.35,
    metalness: isBlackGold ? 0.82 : 0.05,
    clearcoat: 0.75,
  });

  const topIcingDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.655, 0.655, 0.04, 36), glazeMat);
  topIcingDisc.position.y = topTierTopY - 0.015;
  group.add(topIcingDisc);

  if (isChocolate || isChildrens || isPastel || isBlackGold) {
    const dripCount = 14;
    for (let d = 0; d < dripCount; d++) {
      const ang = (d / dripCount) * Math.PI * 2;
      const len = 0.08 + ((d * 37) % 10) * 0.015;
      const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, len, 6, 8), glazeMat);
      drip.position.set(Math.cos(ang) * 0.64, topTierTopY - 0.04 - len / 2, Math.sin(ang) * 0.64);
      group.add(drip);
    }
  }

  // Metallic Ribbon Collars + Piped Cream Pearls
  const ribbonMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(garnishColor),
    roughness: 0.22,
    metalness: isRoyal || isBlackGold ? 0.85 : 0.45,
    clearcoat: 0.6,
  });

  const collar1 = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.034, 12, 48), ribbonMat);
  collar1.rotation.x = Math.PI / 2;
  collar1.position.y = 0.68;
  group.add(collar1);

  const collar2 = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.028, 12, 44), ribbonMat);
  collar2.rotation.x = Math.PI / 2;
  collar2.position.y = 1.28;
  group.add(collar2);

  // Cream Dollop Piping Ring around Tier 3 Base & Tier 2 Top
  const dollopGeo = new THREE.SphereGeometry(0.052, 10, 10);
  const dollopMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(isBlackGold ? '#D4AF37' : '#FFFDF9'),
    roughness: isBlackGold ? 0.22 : 0.42,
    metalness: isBlackGold ? 0.85 : 0.04,
  });
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    const p = new THREE.Mesh(dollopGeo, dollopMat);
    p.scale.set(1, 0.82, 1);
    p.position.set(Math.cos(ang) * 0.66, 1.83, Math.sin(ang) * 0.66);
    group.add(p);
  }

  // Style-Specific Decorations
  if (isRose || cakeDesign === 'luxury-tiered') {
    const roseMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(primaryHex),
      roughness: 0.42,
      sheen: 0.6,
    });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f7a58, roughness: 0.6 });
    for (let r = 0; r < 7; r++) {
      const ang = (r / 7) * Math.PI * 2;
      const bud = new THREE.Mesh(new THREE.DodecahedronGeometry(0.105, 1), roseMat);
      bud.position.set(Math.cos(ang) * 1.06, 1.33, Math.sin(ang) * 1.06);
      group.add(bud);

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), leafMat);
      leaf.scale.set(1.4, 0.3, 0.8);
      leaf.position.set(Math.cos(ang + 0.16) * 1.1, 1.29, Math.sin(ang + 0.16) * 1.1);
      group.add(leaf);
    }
  }

  if (isRoyal || isBlackGold) {
    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.022, 10, 36), ribbonMat);
    crownBand.rotation.x = Math.PI / 2;
    crownBand.position.y = topTierTopY + 0.015;
    group.add(crownBand);
  }

  if (isChildrens || isPastel) {
    const sprinkleColors = ['#FF6B8B', '#4ECDC4', '#FFE66D', '#8AC926', '#A78BFA'];
    const sprGeo = new THREE.CapsuleGeometry(0.014, 0.045, 4, 6);
    for (let s = 0; s < 28; s++) {
      const tierRad = s % 2 === 0 ? 1.24 : 0.94;
      const tierY = s % 2 === 0 ? 0.78 + ((s * 17) % 10) * 0.036 : 1.38 + ((s * 23) % 10) * 0.032;
      const ang = (s / 28) * Math.PI * 2 * 2.3;
      const sprMat = new THREE.MeshStandardMaterial({
        color: sprinkleColors[s % sprinkleColors.length],
        roughness: 0.35,
      });
      const spr = new THREE.Mesh(sprGeo, sprMat);
      spr.position.set(Math.cos(ang) * tierRad, tierY, Math.sin(ang) * tierRad);
      spr.rotation.set(s * 0.7, ang, s * 0.5);
      group.add(spr);
    }
  }

  // 3. Age-Aware & Numeral Candles
  const validAge = parseValidAge(recipientAge);
  const useNumerals =
    validAge !== null &&
    (candleMode === 'numeral' || (candleMode === 'auto' && validAge > 20));

  const candleTex = createCandleTexture(candleStyle, primaryHex, accentHex);
  textures.push(candleTex);

  const candleMat = new THREE.MeshPhysicalMaterial({
    map: candleTex,
    roughness: candleStyle === 'gold-metallic' ? 0.22 : 0.36,
    metalness: candleStyle === 'gold-metallic' ? 0.85 : 0.06,
    clearcoat: 0.35,
  });
  const wickMat = new THREE.MeshBasicMaterial({ color: 0x241d1a });
  const flameGeo = createTeardropFlameGeometry();
  const haloGeo = new THREE.SphereGeometry(0.11, 12, 10);
  const smokeGeo = new THREE.SphereGeometry(0.055, 10, 10);

  const addFlameAndSmokeAt = (fx: number, fy: number, fz: number, idx: number, scale = 1) => {
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.048, 6), wickMat);
    wick.position.set(fx, fy + 0.022, fz);
    wick.userData = { isCandle: true, candleIndex: idx };
    group.add(wick);

    const flameMat = new THREE.MeshBasicMaterial({
      color: isNeon ? 0xff6da2 : 0xffbe3b,
      transparent: true,
      opacity: 0.96,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    const flameBaseY = fy + 0.042;
    flame.position.set(fx, flameBaseY, fz);
    flame.scale.setScalar(scale);
    flame.userData = { isCandle: true, candleIndex: idx, baseY: flameBaseY, baseScale: scale };
    group.add(flame);
    flames.push(flame);

    const haloMat = new THREE.MeshBasicMaterial({
      color: isNeon ? 0xff4d8d : 0xffaa2b,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(fx, flameBaseY + 0.07 * scale, fz);
    halo.scale.setScalar(scale);
    group.add(halo);
    halos.push(halo);

    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xe4e0da,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const smoke = new THREE.Mesh(smokeGeo, smokeMat);
    smoke.position.set(fx, flameBaseY + 0.04, fz);
    smoke.userData = { baseY: flameBaseY + 0.04, baseX: fx, baseZ: fz };
    group.add(smoke);
    smokeMeshes.push(smoke);
  };

  if (useNumerals && validAge !== null) {
    const digits = String(validAge).split('');
    const spacing = digits.length >= 3 ? 0.34 : 0.38;
    const startX = -((digits.length - 1) * spacing) / 2;
    const foilAccentMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(garnishColor),
      roughness: 0.24,
      metalness: 0.85,
    });

    digits.forEach((digit, idx) => {
      const { group: numGroup, wickTopY, wickX } = buildNumeralDigitMesh(
        digit,
        candleMat,
        foilAccentMat
      );
      const nx = startX + idx * spacing;
      const ny = topTierTopY + 0.1; // pin bottom at topTierTopY - 0.01
      numGroup.position.set(nx, ny, 0);
      numGroup.userData = { isCandle: true, candleIndex: idx };
      group.add(numGroup);

      addFlameAndSmokeAt(nx + wickX, ny + wickTopY - 0.01, 0, idx, 1.05);
    });
  } else {
    // Individual Candles: exact age count if 1..20 (or manual override up to 40), else 5 balanced candles
    const targetCount = validAge !== null ? Math.min(validAge, 40) : 5;
    const coords: [number, number][] = [];

    if (targetCount === 1) {
      coords.push([0, 0]);
    } else if (targetCount <= 7) {
      coords.push([0, 0]);
      const ringN = targetCount - 1;
      for (let i = 0; i < ringN; i++) {
        const a = (i / ringN) * Math.PI * 2;
        coords.push([Math.cos(a) * 0.34, Math.sin(a) * 0.34]);
      }
    } else if (targetCount <= 20) {
      coords.push([0, 0]);
      const innerN = Math.min(6, targetCount - 1);
      for (let i = 0; i < innerN; i++) {
        const a = (i / innerN) * Math.PI * 2;
        coords.push([Math.cos(a) * 0.23, Math.sin(a) * 0.23]);
      }
      const outerN = targetCount - 1 - innerN;
      for (let i = 0; i < outerN; i++) {
        const a = (i / outerN) * Math.PI * 2 + 0.22;
        coords.push([Math.cos(a) * 0.47, Math.sin(a) * 0.47]);
      }
    } else {
      // Compact 3 concentric rings when user manually forces individual >20
      coords.push([0, 0]);
      const r1 = 6;
      const r2 = 12;
      const r3 = targetCount - 1 - r1 - r2;
      for (let i = 0; i < r1; i++) {
        const a = (i / r1) * Math.PI * 2;
        coords.push([Math.cos(a) * 0.16, Math.sin(a) * 0.16]);
      }
      for (let i = 0; i < r2; i++) {
        const a = (i / r2) * Math.PI * 2 + 0.15;
        coords.push([Math.cos(a) * 0.33, Math.sin(a) * 0.33]);
      }
      for (let i = 0; i < r3; i++) {
        const a = (i / r3) * Math.PI * 2 + 0.08;
        coords.push([Math.cos(a) * 0.50, Math.sin(a) * 0.50]);
      }
    }

    const candleScale = targetCount > 15 ? 0.72 : targetCount > 9 ? 0.84 : 1.0;
    const candleH = 0.42 * candleScale;
    const candleR = 0.036 * candleScale;
    const waxGeo = new THREE.CylinderGeometry(candleR * 0.94, candleR, candleH, 14);
    const dripCollarGeo = new THREE.TorusGeometry(candleR * 0.96, 0.008 * candleScale, 6, 12);

    coords.forEach(([cx, cz], idx) => {
      const candle = new THREE.Mesh(waxGeo, candleMat);
      // Base rests cleanly at topTierTopY
      candle.position.set(cx, topTierTopY + candleH / 2, cz);
      candle.castShadow = true;
      candle.userData = { isCandle: true, candleIndex: idx };
      group.add(candle);

      const waxCollar = new THREE.Mesh(dripCollarGeo, candleMat);
      waxCollar.rotation.x = Math.PI / 2;
      waxCollar.position.set(cx, topTierTopY + candleH, cz);
      group.add(waxCollar);

      addFlameAndSmokeAt(cx, topTierTopY + candleH, cz, idx, candleScale);
    });
  }

  // Primary warm candlelight over top of cake
  const light = new THREE.PointLight(0xffb733, 2.0, 6.5, 1.4);
  light.position.set(0, topTierTopY + 0.75, 0.25);
  group.add(light);
  candleLights.push(light);

  return { group, flames, halos, candleLights, smokeMeshes, textures };
}

function buildCompositeRose(colorHex: string): { group: THREE.Group; petals: THREE.Mesh[] } {
  const group = new THREE.Group();
  const petals: THREE.Mesh[] = [];

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3b6e4c, roughness: 0.65 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.9, 10), stemMat);
  stem.position.y = 0.45;
  group.add(stem);

  const sepal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.14, 6), stemMat);
  sepal.rotation.x = Math.PI;
  sepal.position.y = 0.92;
  group.add(sepal);

  const petalMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.42,
    sheen: 0.7,
    sheenColor: new THREE.Color('#ffd6e0'),
    side: THREE.DoubleSide,
  });

  const petalGeo = new THREE.SphereGeometry(0.18, 12, 10, 0, Math.PI * 0.75, 0, Math.PI * 0.75);
  for (let i = 0; i < 10; i++) {
    const ring = i < 4 ? 0 : 1;
    const angle = (i / (ring === 0 ? 4 : 6)) * Math.PI * 2 + ring * 0.5;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(
      Math.cos(angle) * (ring === 0 ? 0.06 : 0.12),
      1.04 + (ring === 0 ? 0.03 : 0),
      Math.sin(angle) * (ring === 0 ? 0.06 : 0.12)
    );
    petal.rotation.y = -angle;
    petal.userData = { baseTilt: ring === 0 ? 0.25 : 0.55, bloomTilt: ring === 0 ? 0.65 : 1.05 };
    petal.rotation.z = petal.userData.baseTilt;
    group.add(petal);
    petals.push(petal);
  }

  return { group, petals };
}

function buildCompositeGiftBox(style: GiftBoxStyle, idx: number): {
  group: THREE.Group;
  lid: THREE.Group;
} {
  const group = new THREE.Group();
  const paletteMap: Record<GiftBoxStyle, { box: number; ribbon: number }> = {
    'velvet-crimson': { box: 0x9e2a4b, ribbon: 0xe9c46a },
    'ivory-gold': { box: 0xf7f1e5, ribbon: 0xc9963b },
    'lavender-silk': { box: 0x6f58c9, ribbon: 0xf3d5ff },
    'midnight-star': { box: 0x18213a, ribbon: 0xf4a261 },
  };
  const colors = paletteMap[style] || paletteMap['velvet-crimson'];

  const boxMat = new THREE.MeshStandardMaterial({ color: colors.box, roughness: 0.48, metalness: 0.08 });
  const ribbonMat = new THREE.MeshPhysicalMaterial({
    color: colors.ribbon,
    roughness: 0.2,
    metalness: 0.75,
    clearcoat: 0.6,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.95), boxMat);
  body.position.y = 0.375;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData = { giftIndex: idx };
  group.add(body);

  const vRibbon1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.76, 0.97), ribbonMat);
  vRibbon1.position.y = 0.38;
  group.add(vRibbon1);

  const vRibbon2 = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.76, 0.16), ribbonMat);
  vRibbon2.position.y = 0.38;
  group.add(vRibbon2);

  const lid = new THREE.Group();
  lid.position.y = 0.78;
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.18, 1.04), boxMat);
  lidMesh.castShadow = true;
  lidMesh.userData = { giftIndex: idx };
  lid.add(lidMesh);

  const bow1 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 10, 24), ribbonMat);
  bow1.position.set(-0.15, 0.16, 0);
  bow1.rotation.y = Math.PI / 4;
  lid.add(bow1);

  const bow2 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 10, 24), ribbonMat);
  bow2.position.set(0.15, 0.16, 0);
  bow2.rotation.y = -Math.PI / 4;
  lid.add(bow2);

  group.add(lid);
  return { group, lid };
}

function buildCompositeWishingTree(wishCount: number, primaryHex: string, accentHex: string): {
  group: THREE.Group;
  lanterns: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const lanterns: THREE.Mesh[] = [];

  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.32, 1.8, 14), barkMat);
  trunk.position.y = 0.9;
  trunk.castShadow = true;
  group.add(trunk);

  const branchAngles = [0, 1.6, 3.1, 4.7];
  branchAngles.forEach((ang, i) => {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 1.1, 10), barkMat);
    branch.position.set(Math.cos(ang) * 0.4, 1.65 + (i % 2) * 0.15, Math.sin(ang) * 0.4);
    branch.rotation.z = Math.cos(ang) * -0.65;
    branch.rotation.x = Math.sin(ang) * 0.65;
    group.add(branch);
  });

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3a6b4c, roughness: 0.75 });
  const canopyOffsets = [
    [0, 2.35, 0, 0.95],
    [-0.65, 2.0, 0.35, 0.68],
    [0.65, 2.05, -0.35, 0.72],
    [0.2, 2.1, 0.65, 0.64],
    [-0.25, 2.15, -0.6, 0.62],
  ];
  canopyOffsets.forEach(([x, y, z, r]) => {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), foliageMat);
    crown.position.set(x, y, z);
    crown.castShadow = true;
    group.add(crown);
  });

  const totalOrbs = Math.max(6, Math.min(20, wishCount + 6));
  const orbGeo = new THREE.OctahedronGeometry(0.09, 1);
  for (let i = 0; i < totalOrbs; i++) {
    const ang = (i / totalOrbs) * Math.PI * 2;
    const rad = 0.65 + (i % 3) * 0.28;
    const orbMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(i % 2 === 0 ? accentHex : primaryHex),
      emissive: new THREE.Color(i % 2 === 0 ? accentHex : primaryHex),
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(Math.cos(ang) * rad, 1.55 + (i % 4) * 0.24, Math.sin(ang) * rad);
    orb.userData = { baseY: orb.position.y, phase: i * 0.7 };
    group.add(orb);
    lanterns.push(orb);
  }

  return { group, lanterns };
}

export const Birthday3DStage: React.FC<Birthday3DStageProps> = ({
  mode = 'hero',
  cakeDesign = 'rose-garden',
  primaryColor = '#C83E5B',
  secondaryColor = '#F3B6C2',
  accentColor = '#E9C46A',
  cakeColors,
  candleMode = 'auto',
  candleStyle = 'classic-ivory',
  darkBg = false,
  bgHex,
  effects,
  candlesLit = true,
  onBlowCandles,
  onRelightCandles,
  onGiftClick,
  openedGifts = [false, false, false],
  wishCount = 4,
  fireworkTrigger = 0,
  recipientName,
  recipientAge,
  lang = 'en',
  heightClass = 'h-[440px] md:h-[540px]',
  showDock = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [roseBloomed, setRoseBloomed] = useState(false);
  const [localBurst, setLocalBurst] = useState(0);

  const candlesLitRef = useRef(candlesLit);
  candlesLitRef.current = candlesLit;

  const roseBloomedRef = useRef(roseBloomed);
  roseBloomedRef.current = roseBloomed;

  const openedGiftsRef = useRef(openedGifts);
  openedGiftsRef.current = openedGifts;

  const onBlowRef = useRef(onBlowCandles);
  onBlowRef.current = onBlowCandles;

  const onGiftRef = useRef(onGiftClick);
  onGiftRef.current = onGiftClick;

  const triggerFireworkRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (fireworkTrigger > 0 || localBurst > 0) {
      triggerFireworkRef.current();
    }
  }, [fireworkTrigger, localBurst]);

  const cakeColorSig = cakeColors
    ? `${cakeColors.tier1}-${cakeColors.tier2}-${cakeColors.frosting}-${cakeColors.accent}`
    : '';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setWebglUnavailable(true);
      return;
    }

    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(bgHex || (darkBg ? '#12101B' : '#FAF6F3'));
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2(bgColor.getHex(), 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(0, mode === 'tree' ? 2.6 : 2.95, mode === 'gifts' ? 5.8 : 5.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 3.1;
    controls.maxDistance = 9.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(0, 1.45, 0);
    controls.autoRotate = !isSoftwareGl && mode === 'hero';
    controls.autoRotateSpeed = 0.65;

    // 3-Point Warm/Cool Studio Lighting Rig
    const hemi = new THREE.HemisphereLight(
      darkBg ? 0x99aaff : 0xfff8f0,
      darkBg ? 0x1b1529 : 0xd8c8bd,
      0.78
    );
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.55);
    keyLight.position.set(4.5, 7, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(new THREE.Color(primaryColor).getHex(), 0.85);
    rimLight.position.set(-4, 4, -4);
    scene.add(rimLight);

    // Stage floor disc
    const floorMat = new THREE.MeshStandardMaterial({
      color: darkBg ? 0x191625 : 0xf2ebe5,
      roughness: 0.72,
      metalness: 0.08,
    });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.08, 48), floorMat);
    floor.position.y = -0.04;
    floor.receiveShadow = true;
    scene.add(floor);

    const eff: EffectsConfig = effects || {
      enabled: true,
      roses: true,
      petals: true,
      balloons: true,
      hearts: true,
      fireworks: true,
      confetti: true,
      sparkles: true,
      speed: 1,
      density: 1,
      intensity: 1,
      primaryColor,
      secondaryColor,
      accentColor,
    };

    const clickables: THREE.Object3D[] = [];
    const flamesList: THREE.Mesh[] = [];
    const halosList: THREE.Mesh[] = [];
    const candleLightsList: THREE.PointLight[] = [];
    const smokeList: THREE.Mesh[] = [];
    const disposableTextures: THREE.Texture[] = [];
    const roseGroups: { group: THREE.Group; petals: THREE.Mesh[] }[] = [];
    const giftLids: THREE.Group[] = [];
    const treeLanterns: THREE.Mesh[] = [];

    if (mode === 'hero' || mode === 'cake' || mode === 'finale') {
      const cake = buildCompositeCake({
        cakeDesign,
        primaryHex: primaryColor,
        secondaryHex: secondaryColor,
        accentHex: accentColor,
        cakeColors,
        recipientAge,
        candleMode,
        candleStyle,
      });
      scene.add(cake.group);
      flamesList.push(...cake.flames);
      halosList.push(...cake.halos);
      candleLightsList.push(...cake.candleLights);
      smokeList.push(...cake.smokeMeshes);
      disposableTextures.push(...cake.textures);
      clickables.push(cake.group);

      if (eff.enabled && eff.roses) {
        const offsets: [number, number, number][] = [
          [-1.85, 0, 0.6],
          [1.85, 0, 0.5],
          [-1.55, 0, -0.95],
          [1.55, 0, -0.95],
        ];
        offsets.forEach(([rx, ry, rz], idx) => {
          const rose = buildCompositeRose(idx % 2 === 0 ? primaryColor : secondaryColor);
          rose.group.position.set(rx, ry, rz);
          rose.group.scale.setScalar(0.9);
          rose.group.userData = { isRose: true };
          scene.add(rose.group);
          roseGroups.push(rose);
          clickables.push(rose.group);
        });
      }
    } else if (mode === 'gifts') {
      const styles: GiftBoxStyle[] = ['velvet-crimson', 'ivory-gold', 'lavender-silk'];
      styles.forEach((st, idx) => {
        const gift = buildCompositeGiftBox(st, idx);
        gift.group.position.set((idx - 1) * 1.65, 0, idx === 1 ? 0.35 : -0.1);
        scene.add(gift.group);
        giftLids.push(gift.lid);
        clickables.push(gift.group);
      });
    } else if (mode === 'tree') {
      const tree = buildCompositeWishingTree(wishCount, primaryColor, accentColor);
      scene.add(tree.group);
      treeLanterns.push(...tree.lanterns);
    }

    // Floating Metallic Balloons
    const balloons: { group: THREE.Group; baseY: number; phase: number }[] = [];
    if (eff.enabled && eff.balloons) {
      const bCount = Math.max(3, Math.round(5 * eff.density));
      const bGeo = new THREE.SphereGeometry(0.32, 20, 18);
      bGeo.scale(1, 1.18, 1);
      const bColors = [primaryColor, secondaryColor, accentColor];
      for (let i = 0; i < bCount; i++) {
        const bGroup = new THREE.Group();
        const bMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(bColors[i % bColors.length]),
          roughness: 0.16,
          metalness: 0.35,
          clearcoat: 1.0,
        });
        const bulb = new THREE.Mesh(bGeo, bMat);
        bulb.castShadow = true;
        bGroup.add(bulb);

        const knot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 8), bMat);
        knot.position.y = -0.39;
        bGroup.add(knot);

        const stringGeo = new THREE.CylinderGeometry(0.005, 0.005, 1.3, 4);
        const stringMat = new THREE.MeshBasicMaterial({ color: darkBg ? 0xcccccc : 0x888888 });
        const str = new THREE.Mesh(stringGeo, stringMat);
        str.position.y = -1.05;
        bGroup.add(str);

        const angle = (i / bCount) * Math.PI * 2;
        const radius = 2.4 + (i % 2) * 0.5;
        const baseY = 2.2 + (i % 3) * 0.45;
        bGroup.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius - 0.6);
        scene.add(bGroup);
        balloons.push({ group: bGroup, baseY, phase: i * 1.1 });
      }
    }

    // Floating Hearts
    const hearts: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
    if (eff.enabled && eff.hearts && mode !== 'gifts') {
      const heartGeo = createHeartGeometry();
      const heartMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(primaryColor),
        roughness: 0.3,
        metalness: 0.25,
      });
      const hCount = Math.max(2, Math.round(4 * eff.density));
      for (let i = 0; i < hCount; i++) {
        const h = new THREE.Mesh(heartGeo, heartMat);
        const ang = (i / hCount) * Math.PI * 2 + 0.4;
        const baseY = 1.6 + (i % 2) * 0.6;
        h.position.set(Math.cos(ang) * 2.1, baseY, Math.sin(ang) * 1.7);
        h.scale.setScalar(0.45);
        scene.add(h);
        hearts.push({ mesh: h, baseY, phase: i * 1.3 });
      }
    }

    // Falling Rose Petals / Confetti
    const particleCount = eff.enabled ? Math.min(80, Math.round(42 * eff.density)) : 0;
    let petalInstanced: THREE.InstancedMesh | null = null;
    const petalStates: { x: number; y: number; z: number; rx: number; ry: number; speed: number }[] = [];
    if (particleCount > 0 && (eff.petals || eff.confetti || eff.sparkles)) {
      const pGeo = eff.petals
        ? new THREE.PlaneGeometry(0.11, 0.14)
        : new THREE.BoxGeometry(0.08, 0.08, 0.02);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.45,
        side: THREE.DoubleSide,
      });
      petalInstanced = new THREE.InstancedMesh(pGeo, pMat, particleCount);
      petalInstanced.frustumCulled = false;
      const palette = [
        new THREE.Color(primaryColor),
        new THREE.Color(secondaryColor),
        new THREE.Color(accentColor),
      ];
      for (let i = 0; i < particleCount; i++) {
        petalStates.push({
          x: (Math.random() - 0.5) * 6.5,
          y: Math.random() * 4.5 + 0.5,
          z: (Math.random() - 0.5) * 5.5,
          rx: Math.random() * Math.PI,
          ry: Math.random() * Math.PI,
          speed: 0.45 + Math.random() * 0.55,
        });
        petalInstanced.setColorAt(i, palette[i % palette.length]);
      }
      if (petalInstanced.instanceColor) petalInstanced.instanceColor.needsUpdate = true;
      scene.add(petalInstanced);
    }

    // Fireworks Burst Particle Pool
    const fwCount = 80;
    const fwGeo = new THREE.BufferGeometry();
    const fwPositions = new Float32Array(fwCount * 3);
    const fwVelocities: THREE.Vector3[] = [];
    for (let i = 0; i < fwCount; i++) {
      fwPositions[i * 3] = 0;
      fwPositions[i * 3 + 1] = -20;
      fwPositions[i * 3 + 2] = 0;
      fwVelocities.push(new THREE.Vector3());
    }
    fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPositions, 3));
    const fwMat = new THREE.PointsMaterial({
      color: new THREE.Color(accentColor),
      size: 0.14,
      transparent: true,
      opacity: 0,
    });
    const fireworksPoints = new THREE.Points(fwGeo, fwMat);
    scene.add(fireworksPoints);

    let fwActiveTimer = 0;
    triggerFireworkRef.current = () => {
      if (!eff.enabled || !eff.fireworks) return;
      fwActiveTimer = 2.0;
      fwMat.opacity = 1;
      for (let i = 0; i < fwCount; i++) {
        fwPositions[i * 3] = (Math.random() - 0.5) * 0.7;
        fwPositions[i * 3 + 1] = 2.75 + Math.random() * 0.4;
        fwPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const spd = 1.6 + Math.random() * 2.4;
        fwVelocities[i].set(
          Math.sin(phi) * Math.cos(theta) * spd,
          Math.cos(phi) * spd * 0.8 + 1.3,
          Math.sin(phi) * Math.sin(theta) * spd
        );
      }
      fwGeo.attributes.position.needsUpdate = true;
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointerClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickables, true);
      if (!hits.length) return;

      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        if (obj.userData?.isCandle) {
          onBlowRef.current?.();
          return;
        }
        if (obj.userData?.isRose) {
          setRoseBloomed((prev) => !prev);
          return;
        }
        if (typeof obj.userData?.giftIndex === 'number') {
          onGiftRef.current?.(obj.userData.giftIndex);
          return;
        }
        obj = obj.parent;
      }
    };
    renderer.domElement.addEventListener('click', handlePointerClick);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    const dummy = new THREE.Object3D();
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08) * (eff.speed || 1);
      const elapsed = clock.getElapsedTime();

      controls.update();

      const lit = candlesLitRef.current;

      // Candle flames smooth extinguish / ignite & warm light transition
      flamesList.forEach((flame, idx) => {
        const baseScale = flame.userData.baseScale || 1;
        const targetScale = lit ? baseScale : 0.001;
        const curScale = flame.scale.y;
        const dampedScale = THREE.MathUtils.damp(curScale, targetScale, 8, dt);

        if (lit) {
          flame.visible = true;
          const pulse = dampedScale * (1 + Math.sin(elapsed * 10 + idx * 1.7) * 0.14);
          flame.scale.set(
            pulse,
            dampedScale * (1 + Math.cos(elapsed * 12 + idx) * 0.16),
            pulse
          );
          flame.position.y = (flame.userData.baseY || 2.74) + Math.sin(elapsed * 8 + idx) * 0.008;
        } else {
          flame.scale.setScalar(dampedScale);
          if (dampedScale < 0.04) flame.visible = false;
        }
      });

      halosList.forEach((halo, idx) => {
        const mat = halo.material as THREE.MeshBasicMaterial;
        const targetOp = lit ? 0.22 + Math.sin(elapsed * 8 + idx) * 0.06 : 0;
        mat.opacity = THREE.MathUtils.damp(mat.opacity, targetOp, 7, dt);
        halo.visible = mat.opacity > 0.01;
      });

      candleLightsList.forEach((l) => {
        const targetIntensity = lit ? (1.85 + Math.sin(elapsed * 9) * 0.25) * eff.intensity : 0;
        l.intensity = THREE.MathUtils.damp(l.intensity, targetIntensity, 6, dt);
      });

      smokeList.forEach((sm, idx) => {
        const mat = sm.material as THREE.MeshStandardMaterial;
        const baseY = sm.userData.baseY || 2.75;
        const baseX = sm.userData.baseX || 0;
        if (!lit) {
          sm.position.y += dt * 0.38;
          if (sm.position.y > baseY + 0.95) sm.position.y = baseY;
          const life = (sm.position.y - baseY) / 0.95;
          mat.opacity = Math.max(0, (1 - life) * 0.36);
          sm.scale.setScalar(0.8 + life * 1.55);
          sm.position.x = baseX + Math.sin(elapsed * 2 + idx) * 0.045;
        } else {
          mat.opacity = 0;
          sm.position.y = baseY;
          sm.position.x = baseX;
        }
      });

      const targetBloom = roseBloomedRef.current ? 1 : 0;
      roseGroups.forEach((rose, idx) => {
        rose.group.rotation.y += dt * 0.25 * (idx % 2 === 0 ? 1 : -1);
        rose.petals.forEach((petal) => {
          const target = THREE.MathUtils.lerp(
            petal.userData.baseTilt,
            petal.userData.bloomTilt,
            targetBloom
          );
          petal.rotation.z = THREE.MathUtils.damp(petal.rotation.z, target, 4, dt);
        });
      });

      giftLids.forEach((lid, idx) => {
        const isOpen = openedGiftsRef.current[idx];
        const targetY = isOpen ? 1.35 : 0.78;
        const targetRotX = isOpen ? -0.65 : 0;
        lid.position.y = THREE.MathUtils.damp(lid.position.y, targetY, 5, dt);
        lid.rotation.x = THREE.MathUtils.damp(lid.rotation.x, targetRotX, 5, dt);
      });

      treeLanterns.forEach((orb) => {
        const phase = orb.userData.phase || 0;
        orb.position.y = (orb.userData.baseY || 1.8) + Math.sin(elapsed * 1.8 + phase) * 0.05;
        orb.rotation.y += dt * 0.8;
      });

      balloons.forEach((b) => {
        b.group.position.y = b.baseY + Math.sin(elapsed * 1.2 + b.phase) * 0.16;
        b.group.rotation.z = Math.sin(elapsed * 0.9 + b.phase) * 0.05;
      });

      hearts.forEach((h) => {
        h.mesh.position.y = h.baseY + Math.sin(elapsed * 1.5 + h.phase) * 0.14;
        h.mesh.rotation.y += dt * 0.8;
      });

      if (petalInstanced) {
        for (let i = 0; i < petalStates.length; i++) {
          const p = petalStates[i];
          p.y -= dt * p.speed * 0.85;
          p.rx += dt * 1.4;
          p.ry += dt * 1.1;
          if (p.y < 0.05) {
            p.y = 4.5 + Math.random();
            p.x = (Math.random() - 0.5) * 6.2;
          }
          _vec3.set(
            p.x + Math.sin(elapsed * 1.2 + i) * 0.15,
            p.y,
            p.z + Math.cos(elapsed + i) * 0.1
          );
          dummy.position.copy(_vec3);
          dummy.rotation.set(p.rx, p.ry, 0);
          dummy.updateMatrix();
          petalInstanced.setMatrixAt(i, dummy.matrix);
        }
        petalInstanced.instanceMatrix.needsUpdate = true;
      }

      if (fwActiveTimer > 0) {
        fwActiveTimer -= dt;
        fwMat.opacity = Math.max(0, fwActiveTimer / 2.0);
        for (let i = 0; i < fwCount; i++) {
          fwVelocities[i].y -= dt * 2.2;
          fwPositions[i * 3] += fwVelocities[i].x * dt;
          fwPositions[i * 3 + 1] += fwVelocities[i].y * dt;
          fwPositions[i * 3 + 2] += fwVelocities[i].z * dt;
        }
        fwGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('click', handlePointerClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      disposableTextures.forEach((tex) => tex.dispose());
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [
    mode,
    cakeDesign,
    primaryColor,
    secondaryColor,
    accentColor,
    cakeColorSig,
    recipientAge,
    candleMode,
    candleStyle,
    darkBg,
    bgHex,
    wishCount,
  ]);

  const isAr = lang === 'ar';
  const validAge = parseValidAge(recipientAge);

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border ${
        darkBg ? 'border-white/10 bg-[#12101B]' : 'border-stone-200 bg-[#FAF6F3]'
      }`}
    >
      {/* Top-Left Minimal Context Label */}
      {recipientName && (
        <div
          className={`absolute top-4 ${isAr ? 'right-4' : 'left-4'} z-10 px-4 py-2 rounded-xl border ${
            darkBg
              ? 'bg-[#171422]/90 border-white/15 text-white'
              : 'bg-white/92 border-stone-200 text-stone-900'
          }`}
        >
          <p className="font-display text-lg font-semibold leading-tight">
            {recipientName}
            {validAge !== null ? ` · ${formatAgeNumber(validAge, lang)}` : ''}
          </p>
        </div>
      )}

      {/* Isolated 3D WebGL Mount Container or Graceful Fallback */}
      {webglUnavailable ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center mb-4 border"
            style={{
              backgroundColor: `${primaryColor}18`,
              borderColor: `${primaryColor}40`,
            }}
          >
            <Flame className="w-12 h-12" style={{ color: primaryColor }} />
          </div>
          <h3 className={`font-display text-2xl font-semibold ${darkBg ? 'text-white' : 'text-stone-900'}`}>
            {isAr ? 'احتفال عيد ميلاد ثلاثي الأبعاد' : '3D Birthday Celebration Stage'}
          </h3>
          {validAge !== null && (
            <p className="text-sm mt-1 font-medium" style={{ color: primaryColor }}>
              {formatAgeNumber(validAge, lang)} {isAr ? 'شمعة' : 'Candles'}
            </p>
          )}
          <p className={`text-sm mt-2 max-w-md ${darkBg ? 'text-stone-300' : 'text-stone-600'}`}>
            {isAr
              ? 'تم تفعيل العرض المبسّط المتوافق مع جهازك.'
              : 'Lightweight celebratory view active for reduced-motion or non-WebGL browsers.'}
          </p>
        </div>
      ) : (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      )}

      {/* Collapsible Bottom Control Dock */}
      {showDock && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[94%]">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className={`mb-1.5 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              darkBg
                ? 'bg-[#1A1726]/95 border-white/15 text-stone-200 hover:bg-[#252136]'
                : 'bg-white/95 border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span className="whitespace-nowrap">
              {dockCollapsed
                ? isAr ? 'إظهار التحكم' : 'Show Controls'
                : isAr ? 'إخفاء التحكم' : 'Hide Controls'}
            </span>
          </button>

          {!dockCollapsed && (
            <div
              className={`flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm ${
                darkBg
                  ? 'bg-[#171422]/95 border-white/15 text-white'
                  : 'bg-white/95 border-stone-200 text-stone-900'
              }`}
            >
              {(mode === 'hero' || mode === 'cake' || mode === 'finale') && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (candlesLit) {
                        onBlowCandles?.();
                        setLocalBurst((n) => n + 1);
                      } else {
                        onRelightCandles?.();
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>
                      {candlesLit
                        ? isAr ? 'إطفاء الشموع' : 'Blow Candles'
                        : isAr ? 'إشعال الشموع' : 'Relight Candles'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoseBloomed((v) => !v)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      darkBg
                        ? 'border-white/15 hover:bg-white/10 text-stone-100'
                        : 'border-stone-200 hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <Flower2 className="w-3.5 h-3.5" />
                    <span>{roseBloomed ? (isAr ? 'ضم الورود' : 'Close Roses') : (isAr ? 'تفتيح الورود' : 'Bloom Roses')}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setLocalBurst((n) => n + 1)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  darkBg
                    ? 'border-white/15 hover:bg-white/10 text-stone-100'
                    : 'border-stone-200 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? 'ألعاب نارية' : 'Fireworks'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
