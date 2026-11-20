// Procedural canvas-rendered artwork for sample memories, puzzles, and covers
// Ensures zero external broken URLs and crisp editorial visuals in all environments.

export type ArtMotif =
  | 'cake-celebration'
  | 'cafe-morning'
  | 'coastal-sunset'
  | 'garden-picnic'
  | 'gift-ribbon'
  | 'starry-lanterns';

const cache = new Map<string, string>();

export function generateProceduralArtwork(
  motif: ArtMotif,
  primary = '#C83E5B',
  secondary = '#F6D365',
  label = ''
): string {
  const key = `${motif}-${primary}-${secondary}-${label}`;
  if (cache.has(key)) return cache.get(key)!;

  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Rich editorial gradient sky/backdrop
  const grad = ctx.createLinearGradient(0, 0, 800, 600);
  if (motif === 'starry-lanterns') {
    grad.addColorStop(0, '#0F1021');
    grad.addColorStop(0.6, '#231942');
    grad.addColorStop(1, '#5E548E');
  } else if (motif === 'coastal-sunset') {
    grad.addColorStop(0, '#FDE2E4');
    grad.addColorStop(0.5, '#F9BEC7');
    grad.addColorStop(1, '#C83E5B');
  } else if (motif === 'garden-picnic') {
    grad.addColorStop(0, '#F1F7ED');
    grad.addColorStop(0.6, '#DCEAD5');
    grad.addColorStop(1, '#A3B18A');
  } else if (motif === 'cafe-morning') {
    grad.addColorStop(0, '#FFF8EE');
    grad.addColorStop(0.5, '#F5E4CC');
    grad.addColorStop(1, '#D4A373');
  } else {
    grad.addColorStop(0, '#FDF8F5');
    grad.addColorStop(0.55, '#F8E9E4');
    grad.addColorStop(1, primary);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 600);

  // Soft bokeh light circles
  for (let i = 0; i < 28; i++) {
    const x = ((i * 197) % 760) + 20;
    const y = ((i * 131) % 520) + 20;
    const r = 14 + (i % 6) * 14;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(255, 255, 255, 0.16)' : `${secondary}33`;
    ctx.fill();
  }

  // Motif centerpiece illustration
  ctx.save();
  ctx.translate(400, 320);

  if (motif === 'cake-celebration') {
    // Pedestal
    ctx.fillStyle = '#E6DCD2';
    ctx.fillRect(-130, 120, 260, 18);
    ctx.fillRect(-25, 138, 50, 45);
    ctx.fillRect(-90, 180, 180, 14);
    // Bottom tier
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(-115, 25, 230, 95, 12);
    ctx.fill();
    // Top tier
    ctx.fillStyle = '#FCEAEF';
    ctx.beginPath();
    ctx.roundRect(-80, -55, 160, 80, 10);
    ctx.fill();
    // Frosting drips
    ctx.fillStyle = primary;
    for (let x = -70; x <= 70; x += 28) {
      ctx.beginPath();
      ctx.arc(x, -52, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    // Candles
    for (const cx of [-36, 0, 36]) {
      ctx.fillStyle = '#E9C46A';
      ctx.fillRect(cx - 5, -108, 10, 53);
      ctx.beginPath();
      ctx.ellipse(cx, -122, 7, 13, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFB703';
      ctx.fill();
    }
  } else if (motif === 'coastal-sunset') {
    // Sun disc
    ctx.beginPath();
    ctx.arc(0, -45, 78, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF3B0';
    ctx.fill();
    // Horizon waves
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let row = 0; row < 5; row++) {
      ctx.fillRect(-260 + row * 25, 50 + row * 24, 520 - row * 50, 8);
    }
  } else if (motif === 'garden-picnic') {
    // Botanical wreath & rose petals
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(115, 0, 38, 18, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = a % 2 === 0 ? '#588157' : primary;
      ctx.globalAlpha = 0.82;
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();
  } else if (motif === 'cafe-morning') {
    // Coffee cup & saucer
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.ellipse(0, 62, 115, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-68, -32, 136, 92, [8, 8, 52, 52]);
    ctx.fill();
    ctx.strokeStyle = '#FFFDF9';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(72, 10, 26, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // Latte rose heart
    ctx.fillStyle = '#B07D52';
    ctx.beginPath();
    ctx.ellipse(0, -28, 54, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === 'starry-lanterns') {
    for (let i = -2; i <= 2; i++) {
      const lx = i * 105;
      const ly = Math.abs(i) * 28 - 40;
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.roundRect(lx - 26, ly - 38, 52, 74, 14);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.arc(lx, ly, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Luxury gift box
    ctx.fillStyle = '#FFFDF9';
    ctx.beginPath();
    ctx.roundRect(-100, -55, 200, 155, 10);
    ctx.fill();
    ctx.fillStyle = primary;
    ctx.fillRect(-16, -55, 32, 155);
    ctx.fillRect(-100, 6, 200, 26);
    // Ribbon bow
    ctx.beginPath();
    ctx.ellipse(-34, -74, 34, 18, -0.35, 0, Math.PI * 2);
    ctx.ellipse(34, -74, 34, 18, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Subtle editorial frame line
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 752, 552);

  if (label) {
    ctx.fillStyle = motif === 'starry-lanterns' ? 'rgba(255,255,255,0.85)' : 'rgba(25,22,29,0.72)';
    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 400, 545);
  }

  const url = canvas.toDataURL('image/jpeg', 0.86);
  cache.set(key, url);
  return url;
}

export async function compressImageFile(file: File, maxDimension = 1080, quality = 0.78): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (JPG, PNG, WebP) are allowed.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image exceeds maximum 10 MB upload size.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable.'));
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function readAudioOrVideoFile(file: File, maxBytes = 500_000): Promise<string> {
  const allowed = file.type.startsWith('audio/') || file.type.startsWith('video/');
  if (!allowed) {
    throw new Error('Only audio or video files are allowed.');
  }
  if (file.size > maxBytes) {
    throw new Error(`Media clip must be under ${Math.round(maxBytes / 1024)} KB for instant playback.`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read media file.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export async function hashPasscode(code: string): Promise<string> {
  const normalized = code.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(`love-moments::${normalized}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
