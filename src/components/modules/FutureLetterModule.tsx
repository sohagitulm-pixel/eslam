import React, { useEffect, useState } from 'react';
import { Lock, MailOpen } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';
import { getT } from '../../i18n/translations';
import { fetchFutureLetterSecret } from '../../services/firestoreService';
import { FutureLetterMeta, FutureLetterSecret, Language, ThemePalette } from '../../types/birthday';

interface FutureLetterModuleProps {
  experienceId: string;
  isSample: boolean;
  meta: FutureLetterMeta;
  palette: ThemePalette;
  lang: Language;
}

export const FutureLetterModule: React.FC<FutureLetterModuleProps> = ({
  experienceId,
  isSample,
  meta,
  palette,
  lang,
}) => {
  const t = getT(lang);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0, secs: 0, unlockedByClock: false });
  const [letter, setLetter] = useState<FutureLetterSecret | null>(null);
  const [opened, setOpened] = useState(false);
  const [serverLocked, setServerLocked] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const target = new Date(meta.unlockDateIso).getTime();
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, mins: 0, secs: 0, unlockedByClock: true });
      } else {
        setCountdown({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          mins: Math.floor((diff % 3600000) / 60000),
          secs: Math.floor((diff % 60000) / 1000),
          unlockedByClock: false,
        });
      }
    };
    updateClock();
    const id = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(id);
  }, [meta.unlockDateIso]);

  const handleOpenEnvelope = async () => {
    if (isSample) {
      if (!countdown.unlockedByClock) {
        setServerLocked(true);
        return;
      }
      setLetter({
        experienceId,
        ownerId: 'sample',
        unlockAt: meta.unlockDateIso,
        message:
          lang === 'ar'
            ? 'رسالة مستقبلية محمية حتى موعدها.'
            : 'A heartfelt time-capsule letter saved for your future milestone!',
        senderName: 'Love Moments',
      });
      setOpened(true);
      audioManager.playSfx('gift-open');
      return;
    }

    const res = await fetchFutureLetterSecret(experienceId);
    if (res.status === 'unlocked') {
      setLetter(res.letter);
      setOpened(true);
      setServerLocked(false);
      audioManager.playSfx('gift-open');
    } else {
      setServerLocked(true);
    }
  };

  if (!meta.enabled) return null;

  return (
    <div
      className="max-w-2xl mx-auto rounded-2xl border p-6 md:p-10 text-center space-y-6"
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border"
        style={{
          backgroundColor: `${palette.primary}15`,
          borderColor: `${palette.primary}35`,
          color: palette.primary,
        }}
      >
        {opened ? <MailOpen className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
      </div>

      <div>
        <h3 className="font-display text-3xl font-semibold" style={{ color: palette.text }}>
          {meta.title}
        </h3>
        <p className="text-xs font-mono-tabular mt-2" style={{ color: palette.muted }}>
          {t.modules.lockedUntil}: {new Date(meta.unlockDateIso).toLocaleDateString()}
        </p>
      </div>

      {!opened && (
        <>
          <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
            {[
              { label: lang === 'ar' ? 'يوم' : 'Days', val: countdown.days },
              { label: lang === 'ar' ? 'ساعة' : 'Hours', val: countdown.hours },
              { label: lang === 'ar' ? 'دقيقة' : 'Mins', val: countdown.mins },
              { label: lang === 'ar' ? 'ثانية' : 'Secs', val: countdown.secs },
            ].map((cell) => (
              <div
                key={cell.label}
                className="p-3 rounded-xl border"
                style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}
              >
                <p className="font-mono-tabular text-2xl font-semibold" style={{ color: palette.text }}>
                  {String(cell.val).padStart(2, '0')}
                </p>
                <p className="text-[11px]" style={{ color: palette.muted }}>
                  {cell.label}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs max-w-md mx-auto" style={{ color: palette.muted }}>
            {t.modules.letterLockedNote}
          </p>

          <button
            type="button"
            onClick={handleOpenEnvelope}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
            style={{ backgroundColor: palette.primary }}
          >
            {t.modules.openLetter}
          </button>

          {serverLocked && (
            <p className="text-xs font-medium" style={{ color: palette.primary }}>
              {t.modules.lockedUntil} {new Date(meta.unlockDateIso).toLocaleString()}
            </p>
          )}
        </>
      )}

      {opened && letter && (
        <div
          className="text-start p-6 rounded-xl border space-y-4"
          style={{
            backgroundColor: `${palette.primary}0B`,
            borderColor: `${palette.primary}30`,
          }}
        >
          <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: palette.text }}>
            {letter.message}
          </p>
          {letter.photoUrl && (
            <img
              src={letter.photoUrl}
              alt={meta.title}
              referrerPolicy="no-referrer"
              className="w-full max-h-64 object-cover rounded-xl"
            />
          )}
          {letter.audioUrl && <audio controls src={letter.audioUrl} className="w-full" />}
          <p className="text-sm font-semibold text-end" style={{ color: palette.primary }}>
            — {letter.senderName}
          </p>
        </div>
      )}
    </div>
  );
};
