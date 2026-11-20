import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';
import { getT } from '../../i18n/translations';
import { Language, ScratchCardItem, ThemePalette } from '../../types/birthday';

interface ScratchCardSingleProps {
  card: ScratchCardItem;
  palette: ThemePalette;
  lang: Language;
}

const ScratchCardSingle: React.FC<ScratchCardSingleProps> = ({ card, palette, lang }) => {
  const t = getT(lang);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [percent, setPercent] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, card.coverColor || palette.primary);
    grad.addColorStop(1, '#D4AF37');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.modules.scratchHint, canvas.width / 2, canvas.height / 2);
  }, [card.coverColor, palette.primary, t.modules.scratchHint]);

  const scratchAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    // Sample pixel alpha to compute reveal percentage efficiently
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 64) {
      total++;
      if (data[i] < 128) cleared++;
    }
    const pct = Math.min(100, Math.round((cleared / Math.max(1, total)) * 100));
    setPercent(pct);
    if (pct >= 55 && !revealed) {
      setRevealed(true);
      setPercent(100);
      audioManager.playSfx('win');
    }
  };

  return (
    <div
      className="rounded-2xl border p-5 space-y-3"
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-sm" style={{ color: palette.text }}>
          {card.title}
        </h4>
        <span className="text-xs font-mono-tabular" style={{ color: palette.muted }}>
          {percent}% {t.modules.scratchedPct}
        </span>
      </div>

      <div className="relative w-full h-52 rounded-xl overflow-hidden border border-stone-200/40 select-none">
        {/* Underlying Surprise Layer */}
        <div
          className="absolute inset-0 p-5 flex flex-col items-center justify-center text-center gap-3"
          style={{ backgroundColor: `${palette.primary}14` }}
        >
          {card.hiddenPhotoUrl && (
            <img
              src={card.hiddenPhotoUrl}
              alt={card.title}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-xl object-cover"
            />
          )}
          <p className="font-display text-xl font-semibold" style={{ color: palette.text }}>
            {card.hiddenMessage}
          </p>
          {revealed && (
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: palette.primary }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.modules.giftOpened}</span>
            </div>
          )}
        </div>

        {/* Foil Scratch Canvas */}
        {!revealed && (
          <canvas
            ref={canvasRef}
            width={480}
            height={220}
            onPointerDown={(e) => {
              drawingRef.current = true;
              scratchAt(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (drawingRef.current) scratchAt(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              drawingRef.current = false;
            }}
            onPointerLeave={() => {
              drawingRef.current = false;
            }}
            className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          />
        )}
      </div>
    </div>
  );
};

export const ScratchCardsModule: React.FC<{
  cards: ScratchCardItem[];
  palette: ThemePalette;
  lang: Language;
}> = ({ cards, palette, lang }) => {
  if (!cards.length) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {cards.map((card) => (
        <ScratchCardSingle key={card.id} card={card} palette={palette} lang={lang} />
      ))}
    </div>
  );
};
