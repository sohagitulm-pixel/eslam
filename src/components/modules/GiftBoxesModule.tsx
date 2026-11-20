import React, { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';
import { getT } from '../../i18n/translations';
import { GiftBoxItem, Language, ThemePalette } from '../../types/birthday';
import { Birthday3DStage } from '../three/Birthday3DStage';

interface GiftBoxesModuleProps {
  gifts: GiftBoxItem[];
  palette: ThemePalette;
  lang: Language;
}

export const GiftBoxesModule: React.FC<GiftBoxesModuleProps> = ({
  gifts,
  palette,
  lang,
}) => {
  const t = getT(lang);
  const [opened, setOpened] = useState<boolean[]>(() => gifts.map(() => false));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!gifts.length) return null;

  const handleOpen = (idx: number) => {
    setOpened((prev) => prev.map((v, i) => (i === idx ? true : v)));
    setActiveIndex(idx);
    audioManager.playSfx('gift-open');
  };

  const activeGift = activeIndex !== null ? gifts[activeIndex] : null;

  return (
    <div className="space-y-6">
      <Birthday3DStage
        mode="gifts"
        primaryColor={palette.primary}
        secondaryColor={palette.secondary}
        accentColor={palette.accent}
        darkBg={palette.dark}
        bgHex={palette.bg}
        openedGifts={opened}
        onGiftClick={(idx) => {
          if (idx < gifts.length) handleOpen(idx);
        }}
        lang={lang}
        heightClass="h-[340px] md:h-[400px]"
        showDock={false}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {gifts.map((gift, idx) => {
          const isOpen = opened[idx];
          return (
            <div
              key={gift.id}
              className="p-5 rounded-2xl border transition-all"
              style={{
                backgroundColor: palette.surface,
                borderColor: isOpen
                  ? palette.primary
                  : palette.dark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.08)',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4" style={{ color: palette.primary }} />
                  <h4 className="font-semibold text-sm" style={{ color: palette.text }}>
                    {gift.label}
                  </h4>
                </div>
                <span className="text-xs font-mono-tabular" style={{ color: palette.muted }}>
                  {isOpen ? t.modules.giftOpened : `#0${idx + 1}`}
                </span>
              </div>

              {isOpen ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed" style={{ color: palette.text }}>
                    {gift.message}
                  </p>
                  {gift.revealType === 'photo' && gift.mediaUrl && (
                    <img
                      src={gift.mediaUrl}
                      alt={gift.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-36 object-cover rounded-xl"
                    />
                  )}
                  {gift.revealType === 'audio' && gift.mediaUrl && (
                    <audio controls src={gift.mediaUrl} className="w-full" />
                  )}
                  {gift.revealType === 'video' && gift.mediaUrl && (
                    <video controls src={gift.mediaUrl} className="w-full rounded-xl max-h-48" />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpen(idx)}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: palette.primary }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t.modules.openGift}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {activeGift && (
        <div
          className="p-4 rounded-xl border text-center text-sm"
          style={{
            backgroundColor: `${palette.primary}12`,
            borderColor: `${palette.primary}35`,
            color: palette.text,
          }}
        >
          {activeGift.label}: {activeGift.message}
        </div>
      )}
    </div>
  );
};
