import React, { useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';
import { getT } from '../../i18n/translations';
import { Language, ThemePalette, WheelItem } from '../../types/birthday';

interface SpinWheelModuleProps {
  title: string;
  items: WheelItem[];
  palette: ThemePalette;
  lang: Language;
}

export const SpinWheelModule: React.FC<SpinWheelModuleProps> = ({
  title,
  items,
  palette,
  lang,
}) => {
  const t = getT(lang);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const rotRef = useRef(0);

  if (!items.length) return null;

  const sliceAngle = 360 / items.length;

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setWinner(null);

    const extraSpins = 360 * 5 + Math.floor(Math.random() * 360);
    const target = rotRef.current + extraSpins;
    rotRef.current = target;
    setRotation(target);

    // Tick sound effects during spin
    const ticks = [150, 350, 600, 900, 1250, 1650, 2100, 2600];
    ticks.forEach((delay) => {
      window.setTimeout(() => audioManager.playSfx('wheel-tick'), delay);
    });

    window.setTimeout(() => {
      const normalized = ((target % 360) + 360) % 360;
      const pointerAngle = (360 - normalized + 270) % 360;
      const winIndex = Math.floor(pointerAngle / sliceAngle) % items.length;
      setWinner(items[winIndex]);
      setSpinning(false);
      audioManager.playSfx('win');
    }, 3400);
  };

  return (
    <div
      className="max-w-3xl mx-auto rounded-2xl border p-6 md:p-8 flex flex-col items-center gap-6"
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <h3 className="font-display text-2xl font-semibold text-center" style={{ color: palette.text }}>
        {title}
      </h3>

      <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
        {/* Top Pointer */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent"
          style={{ borderTopColor: palette.primary }}
        />

        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-sm"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 3.4s cubic-bezier(0.15, 0.85, 0.2, 1)' : 'none',
          }}
        >
          {items.map((item, i) => {
            const startRad = ((i * sliceAngle - 90) * Math.PI) / 180;
            const endRad = (((i + 1) * sliceAngle - 90) * Math.PI) / 180;
            const x1 = 100 + 96 * Math.cos(startRad);
            const y1 = 100 + 96 * Math.sin(startRad);
            const x2 = 100 + 96 * Math.cos(endRad);
            const y2 = 100 + 96 * Math.sin(endRad);
            const largeArc = sliceAngle > 180 ? 1 : 0;
            const midAngle = (i + 0.5) * sliceAngle - 90;

            return (
              <g key={item.id}>
                <path
                  d={`M 100 100 L ${x1} ${y1} A 96 96 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={item.color}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <text
                  x="100"
                  y="100"
                  fill="#FFFFFF"
                  fontSize="8.5"
                  fontWeight="600"
                  textAnchor="middle"
                  transform={`rotate(${midAngle}, 100, 100) translate(56, 3)`}
                >
                  {item.label.slice(0, 14)}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="14" fill="#FFFFFF" stroke={palette.primary} strokeWidth="3" />
        </svg>
      </div>

      <button
        type="button"
        disabled={spinning}
        onClick={handleSpin}
        className="px-6 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-60"
        style={{ backgroundColor: palette.primary }}
      >
        {spinning ? t.modules.spinning : t.modules.spinWheel}
      </button>

      {winner && (
        <div
          className="w-full p-5 rounded-xl border text-center space-y-1"
          style={{
            backgroundColor: `${palette.primary}14`,
            borderColor: `${palette.primary}40`,
          }}
        >
          <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: palette.primary }}>
            <Sparkles className="w-4 h-4" />
            <span>{winner.label}</span>
          </div>
          <p className="text-sm" style={{ color: palette.text }}>
            {winner.rewardMessage}
          </p>
        </div>
      )}
    </div>
  );
};
