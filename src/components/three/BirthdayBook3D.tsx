import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BookOpen } from 'lucide-react';
import { DecorationsConfig, Language } from '../../types/birthday';
import { formatAgeNumber, parseValidAge } from '../../utils/ageUtils';

interface BirthdayBook3DProps {
  recipientName: string;
  recipientAge?: string;
  bookTitle?: string;
  birthdayDate?: string;
  coverColor?: string;
  paperColor?: string;
  accentColor?: string;
  darkBg?: boolean;
  bgHex?: string;
  lang?: Language;
  isOpen?: boolean;
  turnSignal?: number;
  turnDir?: 1 | -1;
  decorations?: DecorationsConfig;
  onOpenClick?: () => void;
  heightClass?: string;
  interactiveOrbit?: boolean;
}

const _tmpVec = new THREE.Vector3();

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

function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = 0;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function createBookCoverTexture(params: {
  recipientName: string;
  recipientAge?: string;
  bookTitle?: string;
  birthdayDate?: string;
  coverColor: string;
  accentColor: string;
  lang: Language;
  decorations?: DecorationsConfig;
  maxAnisotropy: number;
}): THREE.CanvasTexture {
  const {
    recipientName,
    recipientAge,
    bookTitle,
    birthdayDate,
    coverColor,
    accentColor,
    lang,
    decorations,
    maxAnisotropy,
  } = params;
  const isAr = lang === 'ar';
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1360;
  const ctx = canvas.getContext('2d')!;

  // Base leather/linen gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, coverColor);
  grad.addColorStop(1, '#1A1118');
  ctx.fillStyle = coverColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle ambient vignette for depth
  const vignette = ctx.createRadialGradient(
    canvas.width * 0.48,
    canvas.height * 0.42,
    120,
    canvas.width * 0.5,
    canvas.height * 0.5,
    920
  );
  vignette.addColorStop(0, 'rgba(255,255,255,0.08)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Fine bookcloth / leather weave grain
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let y = 0; y < canvas.height; y += 6) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  for (let x = 0; x < canvas.width; x += 6) {
    ctx.fillRect(x, 0, 1, canvas.height);
  }

  // Spine crease indentation along left edge
  const spineShadow = ctx.createLinearGradient(0, 0, 72, 0);
  spineShadow.addColorStop(0, 'rgba(0,0,0,0.38)');
  spineShadow.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  spineShadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spineShadow;
  ctx.fillRect(0, 0, 72, canvas.height);

  const gold = accentColor || '#DFC07C';

  // Double metallic embossed frame
  ctx.strokeStyle = gold;
  ctx.lineWidth = 4;
  ctx.strokeRect(86, 68, canvas.width - 146, canvas.height - 136);
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.72;
  ctx.strokeRect(104, 86, canvas.width - 182, canvas.height - 172);
  ctx.globalAlpha = 1;

  // Decorative embossed corners
  if (decorations?.corners !== false) {
    const drawCorner = (cx: number, cy: number, sx: number, sy: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sx, sy);
      ctx.strokeStyle = gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 56);
      ctx.lineTo(0, 0);
      ctx.lineTo(56, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(18, 18, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    drawCorner(112, 94, 1, 1);
    drawCorner(canvas.width - 86, 94, -1, 1);
    drawCorner(112, canvas.height - 94, 1, -1);
    drawCorner(canvas.width - 86, canvas.height - 94, -1, -1);
  }

  // Center medallion crest
  const centerX = canvas.width * 0.52;
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(centerX, 340, 88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(centerX, 340, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const validAge = parseValidAge(recipientAge);
  ctx.fillStyle = gold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (validAge !== null) {
    ctx.font = '600 66px "Cormorant Garamond", "Cairo", Georgia, serif';
    ctx.fillText(formatAgeNumber(validAge, lang), centerX, 342);
  } else {
    // Classic floral / star crest when no numeric age is specified
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 34 : 14;
      const px = centerX + Math.cos(a) * r;
      const py = 340 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Embossed "Happy Birthday" title
  ctx.fillStyle = gold;
  ctx.font = isAr
    ? '700 54px "Cairo", Georgia, serif'
    : '600 54px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(isAr ? 'عيد ميلاد سعيد' : 'Happy Birthday', centerX, 530);

  // Subtle ornamental rule
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 160, 586);
  ctx.lineTo(centerX + 160, 586);
  ctx.stroke();

  // Recipient Name (with automatic sizing for longer names)
  const displayName = recipientName || (isAr ? 'صاحب العيد' : 'Celebrant');
  const fontSize = displayName.length > 18 ? 64 : displayName.length > 12 ? 78 : 96;
  ctx.fillStyle = '#FFFDF9';
  ctx.font = isAr
    ? `700 ${fontSize}px "Cairo", Georgia, serif`
    : `600 ${fontSize}px "Playfair Display", Georgia, serif`;
  ctx.fillText(displayName, centerX, 710, 680);

  // Subtitle / Book title
  if (bookTitle) {
    ctx.fillStyle = 'rgba(255,250,240,0.82)';
    ctx.font = '500 32px "Plus Jakarta Sans", "Cairo", sans-serif';
    ctx.fillText(bookTitle, centerX, 830, 660);
  }

  // Bottom date & keepsake imprint
  if (birthdayDate) {
    ctx.fillStyle = gold;
    ctx.globalAlpha = 0.85;
    ctx.font = '500 28px "JetBrains Mono", monospace';
    ctx.fillText(birthdayDate, centerX, 1140);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = gold;
  ctx.globalAlpha = 0.7;
  ctx.font = '500 24px "Cormorant Garamond", "Cairo", serif';
  ctx.fillText(isAr ? 'كتاب ذكريات لحظات الحب' : 'LOVE MOMENTS KEEPSAKE EDITION', centerX, 1210);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createPaperBlockTexture(paperHex: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paperHex || '#F9F2E3';
  ctx.fillRect(0, 0, 512, 512);
  // Subtle horizontal page leaf striations
  for (let y = 0; y < 512; y += 6) {
    ctx.fillStyle = y % 12 === 0 ? 'rgba(130, 100, 70, 0.14)' : 'rgba(255,255,255,0.22)';
    ctx.fillRect(0, y, 512, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export const BirthdayBook3D: React.FC<BirthdayBook3DProps> = ({
  recipientName,
  recipientAge,
  bookTitle,
  birthdayDate,
  coverColor = '#6F1D32',
  paperColor = '#FBF7EE',
  accentColor = '#DFC07C',
  darkBg = false,
  bgHex,
  lang = 'en',
  isOpen = false,
  turnSignal = 0,
  turnDir = 1,
  decorations,
  onOpenClick,
  heightClass = 'h-[420px] md:h-[520px]',
  interactiveOrbit = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const onOpenRef = useRef(onOpenClick);
  onOpenRef.current = onOpenClick;

  const turnTriggerRef = useRef<(dir: 1 | -1) => void>(() => {});

  useEffect(() => {
    if (turnSignal > 0) {
      turnTriggerRef.current(turnDir);
    }
  }, [turnSignal, turnDir]);

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
        alpha: true,
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

    const width = container.clientWidth || 720;
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
    const effectiveBg = bgHex || (darkBg ? '#130F21' : '#F8F4EE');
    scene.background = new THREE.Color(effectiveBg);
    scene.fog = new THREE.FogExp2(new THREE.Color(effectiveBg).getHex(), 0.035);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    camera.position.set(0.15, 2.35, 5.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enabled = interactiveOrbit;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = Math.PI / 2 - 0.15;
    controls.target.set(0, 0.1, 0);

    // 3-Point Warm Studio Lighting
    const hemi = new THREE.HemisphereLight(
      darkBg ? 0xb4b8ff : 0xfff8ed,
      darkBg ? 0x1d162c : 0xd9cbbd,
      0.85
    );
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.65);
    keyLight.position.set(3.8, 6.2, 4.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -3.5;
    keyLight.shadow.camera.right = 3.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(new THREE.Color(accentColor).getHex(), 0.75);
    rimLight.position.set(-4.2, 3.2, -3.5);
    scene.add(rimLight);

    // Soft surface pedestal/desk contact disc
    const tableMat = new THREE.MeshStandardMaterial({
      color: darkBg ? 0x1b162a : 0xf1e9de,
      roughness: 0.78,
      metalness: 0.05,
    });
    const tableDisc = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.08, 48), tableMat);
    tableDisc.position.y = -0.32;
    tableDisc.receiveShadow = true;
    scene.add(tableDisc);

    // --- Build Composite 3D Hardcover Book ---
    const bookRoot = new THREE.Group();
    // Tilt book toward viewer slightly so cover art is heroically legible
    bookRoot.rotation.x = -0.45;
    scene.add(bookRoot);

    const bookW = 2.05;
    const bookH = 2.75;
    const coverThickness = 0.07;
    const blockThickness = 0.28;
    const spineOffset = -bookW / 2;

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const coverTex = createBookCoverTexture({
      recipientName,
      recipientAge,
      bookTitle,
      birthdayDate,
      coverColor,
      accentColor,
      lang,
      decorations,
      maxAnisotropy: maxAniso,
    });
    const edgeTex = createPaperBlockTexture(paperColor, maxAniso);

    const leatherMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(coverColor),
      roughness: 0.56,
      metalness: 0.08,
      clearcoat: 0.15,
    });
    const foilMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(accentColor),
      roughness: 0.22,
      metalness: 0.88,
      clearcoat: 0.6,
    });
    const coverFaceMat = new THREE.MeshPhysicalMaterial({
      map: coverTex,
      roughness: 0.45,
      metalness: 0.12,
      clearcoat: 0.2,
    });
    const paperMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(paperColor),
      roughness: 0.88,
      metalness: 0.01,
    });
    const pageEdgeMat = new THREE.MeshStandardMaterial({
      map: edgeTex,
      roughness: 0.72,
      metalness: 0.12,
    });

    // Book Spine Assembly (hinged along left edge x = spineOffset)
    const spineGroup = new THREE.Group();
    spineGroup.position.set(spineOffset, 0, 0);
    bookRoot.add(spineGroup);

    const spineHeight = bookH;
    const spineGeo = new THREE.CylinderGeometry(
      0.21,
      0.21,
      spineHeight,
      24,
      1,
      false,
      Math.PI,
      Math.PI
    );
    const spineMesh = new THREE.Mesh(spineGeo, leatherMat);
    spineMesh.position.set(0, 0, 0);
    spineMesh.castShadow = true;
    spineGroup.add(spineMesh);

    // Metallic raised spine ribs aligned cleanly with the spine curve
    const ribGeo = new THREE.CylinderGeometry(
      0.222,
      0.222,
      0.035,
      20,
      1,
      false,
      Math.PI,
      Math.PI
    );
    [-1.02, -0.52, 0.52, 1.02].forEach((ry) => {
      const rib = new THREE.Mesh(ribGeo, foilMat);
      rib.position.set(0, ry, 0);
      spineGroup.add(rib);
    });

    // Back Cover
    const coverShape = createRoundedRectShape(bookW, bookH, 0.1);
    const coverGeo = new THREE.ExtrudeGeometry(coverShape, {
      depth: coverThickness,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.014,
      bevelThickness: 0.012,
    });
    const backCover = new THREE.Mesh(coverGeo, leatherMat);
    backCover.position.set(0, 0, -blockThickness / 2 - coverThickness);
    backCover.castShadow = true;
    backCover.receiveShadow = true;
    spineGroup.add(backCover);

    // Layered Paper Block (slightly inset from cover borders, rounded right corners)
    const blockShape = createRoundedRectShape(bookW - 0.08, bookH - 0.12, 0.06);
    const blockGeo = new THREE.ExtrudeGeometry(blockShape, {
      depth: blockThickness,
      bevelEnabled: false,
    });
    const paperBlock = new THREE.Mesh(blockGeo, [paperMat, pageEdgeMat]);
    paperBlock.position.set(0.03, 0, -blockThickness / 2);
    paperBlock.castShadow = true;
    paperBlock.receiveShadow = true;
    spineGroup.add(paperBlock);

    // Inner spread illuminated page face (visible when cover opens)
    const innerSpreadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(paperColor),
      roughness: 0.85,
    });
    const innerRightPage = new THREE.Mesh(
      new THREE.PlaneGeometry(bookW - 0.12, bookH - 0.16),
      innerSpreadMat
    );
    innerRightPage.position.set((bookW - 0.06) / 2, 0, blockThickness / 2 + 0.005);
    spineGroup.add(innerRightPage);

    // Front Cover Pivot Group (swings open around spine x = 0)
    const frontCoverPivot = new THREE.Group();
    frontCoverPivot.position.set(0, 0, blockThickness / 2 + 0.01);
    spineGroup.add(frontCoverPivot);

    const frontCoverBody = new THREE.Mesh(coverGeo, leatherMat);
    frontCoverBody.castShadow = true;
    frontCoverBody.receiveShadow = true;
    frontCoverPivot.add(frontCoverBody);

    // Embossed High-DPI Front Cover Face Plate
    const coverArtPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(bookW - 0.06, bookH - 0.06),
      coverFaceMat
    );
    coverArtPlane.position.set(bookW / 2, 0, coverThickness + 0.016);
    frontCoverPivot.add(coverArtPlane);

    // Metallic gilded bookmark ribbon extending gently below bottom edge
    const ribbonMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.55, 0.012), foilMat);
    ribbonMesh.position.set(bookW * 0.65, -bookH / 2 - 0.18, 0);
    ribbonMesh.rotation.z = 0.08;
    spineGroup.add(ribbonMesh);

    // Turning Page Leaf Mesh (for animated page-turns)
    const turnPivot = new THREE.Group();
    turnPivot.position.set(0.04, 0, blockThickness / 2 + 0.018);
    spineGroup.add(turnPivot);
    const turnLeaf = new THREE.Mesh(
      new THREE.PlaneGeometry(bookW - 0.14, bookH - 0.18, 10, 1),
      paperMat
    );
    turnLeaf.position.set((bookW - 0.14) / 2, 0, 0);
    turnLeaf.visible = false;
    turnPivot.add(turnLeaf);

    // Subtle floating gold dust / star sparkles around the book
    const starCount = 26;
    const starGeo = new THREE.OctahedronGeometry(0.032, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.85,
    });
    const starsInstanced = new THREE.InstancedMesh(starGeo, starMat, starCount);
    starsInstanced.frustumCulled = false;
    const starStates = Array.from({ length: starCount }, (_, i) => ({
      x: (Math.random() - 0.5) * 4.4,
      y: (Math.random() - 0.35) * 3.0,
      z: (Math.random() - 0.5) * 2.2 - 0.3,
      phase: i * 0.5,
      scale: 0.5 + Math.random() * 0.8,
    }));
    scene.add(starsInstanced);

    // Click raycast on book to open
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerClick = (ev: MouseEvent) => {
      if (!onOpenRef.current || isOpenRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(bookRoot, true);
      if (hits.length > 0) {
        onOpenRef.current();
      }
    };
    renderer.domElement.addEventListener('click', onPointerClick);

    let turnProgress = -1;
    let activeTurnDir: 1 | -1 = 1;
    turnTriggerRef.current = (dir) => {
      activeTurnDir = dir;
      turnProgress = 0;
      turnLeaf.visible = true;
    };

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
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      controls.update();

      const opening = isOpenRef.current;
      // Cover swings open around spine
      const targetCoverRotY = opening ? -Math.PI * 0.92 : 0;
      frontCoverPivot.rotation.y = THREE.MathUtils.damp(
        frontCoverPivot.rotation.y,
        targetCoverRotY,
        4.2,
        dt
      );

      // Book centers smoothly when opening
      const targetRootX = opening ? 0.65 : 0;
      const targetRootRotY = opening ? 0 : Math.sin(elapsed * 0.6) * 0.14;
      bookRoot.position.x = THREE.MathUtils.damp(bookRoot.position.x, targetRootX, 4, dt);
      bookRoot.position.y = THREE.MathUtils.damp(
        bookRoot.position.y,
        opening ? 0 : Math.sin(elapsed * 1.1) * 0.06,
        4,
        dt
      );
      bookRoot.rotation.y = THREE.MathUtils.damp(bookRoot.rotation.y, targetRootRotY, 3.5, dt);

      // Page-turn leaf animation
      if (turnProgress >= 0) {
        turnProgress += dt * 1.9;
        if (turnProgress >= 1) {
          turnProgress = -1;
          turnLeaf.visible = false;
        } else {
          const tNorm = activeTurnDir === 1 ? turnProgress : 1 - turnProgress;
          turnPivot.rotation.y = -Math.PI * 0.92 * tNorm;
          turnPivot.position.z = blockThickness / 2 + 0.02 + Math.sin(tNorm * Math.PI) * 0.24;
        }
      }

      // Floating metallic stars
      for (let i = 0; i < starStates.length; i++) {
        const st = starStates[i];
        _tmpVec.set(st.x, st.y + Math.sin(elapsed * 1.2 + st.phase) * 0.12, st.z);
        dummy.position.copy(_tmpVec);
        dummy.rotation.set(elapsed * 0.5 + st.phase, elapsed * 0.7 + st.phase, 0);
        dummy.scale.setScalar(st.scale);
        dummy.updateMatrix();
        starsInstanced.setMatrixAt(i, dummy.matrix);
      }
      starsInstanced.instanceMatrix.needsUpdate = true;

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
      const w = container.clientWidth || 720;
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
      renderer.domElement.removeEventListener('click', onPointerClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      coverTex.dispose();
      edgeTex.dispose();
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
  }, [recipientName, recipientAge, bookTitle, birthdayDate, coverColor, paperColor, accentColor, darkBg, bgHex, lang, decorations, interactiveOrbit]);

  const validAge = parseValidAge(recipientAge);
  const isAr = lang === 'ar';

  if (webglUnavailable) {
    // Graceful luxury hardcover CSS fallback when WebGL is disabled or reduced motion is active
    return (
      <div
        className={`relative w-full ${heightClass} flex items-center justify-center p-6 rounded-2xl border overflow-hidden`}
        style={{
          backgroundColor: bgHex || (darkBg ? '#130F21' : '#F8F4EE'),
          borderColor: darkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        }}
      >
        <button
          type="button"
          onClick={() => onOpenClick?.()}
          className="relative w-64 sm:w-72 aspect-[3/4] rounded-r-2xl rounded-l-sm shadow-2xl p-6 flex flex-col items-center justify-between text-center border-2 transition-transform hover:-translate-y-1 cursor-pointer"
          style={{
            backgroundColor: coverColor,
            borderColor: accentColor,
            color: '#FFFDF9',
          }}
        >
          <div className="w-full flex items-center justify-between text-[11px] opacity-80">
            <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
            <span>{birthdayDate || ''}</span>
          </div>
          <div className="space-y-3">
            {validAge !== null && (
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 font-display text-2xl font-bold"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {formatAgeNumber(validAge, lang)}
              </div>
            )}
            <p className="font-display text-xl font-semibold" style={{ color: accentColor }}>
              {isAr ? 'عيد ميلاد سعيد' : 'Happy Birthday'}
            </p>
            <h3 className="font-display text-3xl font-bold">{recipientName}</h3>
            {bookTitle && <p className="text-xs opacity-80">{bookTitle}</p>}
          </div>
          <p className="text-[10px] tracking-widest opacity-70" style={{ color: accentColor }}>
            {isAr ? 'كتاب ذكريات لحظات الحب' : 'LOVE MOMENTS KEEPSAKE'}
          </p>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border`}
      style={{
        backgroundColor: bgHex || (darkBg ? '#130F21' : '#F8F4EE'),
        borderColor: darkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
