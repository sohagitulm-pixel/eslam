import React, { useEffect, useState } from 'react';
import { Flag, Flame, Lock, PartyPopper, Sparkles } from 'lucide-react';
import { audioManager } from '../audio/AudioManager';
import { AudioControllerBar } from '../components/modules/AudioControllerBar';
import { BirthdayQuizModule } from '../components/modules/BirthdayQuizModule';
import { FutureLetterModule } from '../components/modules/FutureLetterModule';
import { GiftBoxesModule } from '../components/modules/GiftBoxesModule';
import { MusicalMemoriesModule } from '../components/modules/MusicalMemoriesModule';
import { PhotoPuzzleModule } from '../components/modules/PhotoPuzzleModule';
import { ScratchCardsModule } from '../components/modules/ScratchCardsModule';
import { SpinWheelModule } from '../components/modules/SpinWheelModule';
import { WishingTreeAndWallModule } from '../components/modules/WishingTreeAndWallModule';
import { Birthday3DStage } from '../components/three/Birthday3DStage';
import { useApp } from '../context/AppContext';
import { SAMPLE_EXPERIENCES } from '../data/templates';
import { getT } from '../i18n/translations';
import {
  getExperienceById,
  incrementExperienceView,
  submitReport,
} from '../services/firestoreService';
import { BirthdayExperience, Language } from '../types/birthday';
import { hashPasscode } from '../utils/proceduralArt';

export const ExperienceViewerPage: React.FC<{ experienceId: string }> = ({
  experienceId,
}) => {
  const { activeDraft, user, navigate } = useApp();
  const [experience, setExperience] = useState<BirthdayExperience | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [candlesLit, setCandlesLit] = useState(true);
  const [cakeWishInput, setCakeWishInput] = useState('');
  const [fireworkTrigger, setFireworkTrigger] = useState(0);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [unlockedPasscode, setUnlockedPasscode] = useState(false);
  const [passcodeErr, setPasscodeErr] = useState(false);
  const [viewLang, setViewLang] = useState<Language>('en');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDone, setReportDone] = useState(false);

  const isSample = experienceId.startsWith('sample-');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      if (isSample) {
        const found = SAMPLE_EXPERIENCES.find((s) => s.id === experienceId) || SAMPLE_EXPERIENCES[0];
        if (active) {
          setExperience(found);
          setViewLang(found.language);
          setLoading(false);
        }
        return;
      }

      if (activeDraft && activeDraft.id === experienceId) {
        if (active) {
          setExperience(activeDraft);
          setViewLang(activeDraft.language);
          setLoading(false);
        }
        return;
      }

      try {
        const docExp = await getExperienceById(experienceId);
        if (active && docExp) {
          setExperience(docExp);
          setViewLang(docExp.language);
          if (docExp.published) {
            incrementExperienceView(docExp, docExp.language);
          }
        }
      } catch {
        // Handled cleanly via null check below
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
      audioManager.stop();
    };
  }, [experienceId, activeDraft, isSample]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F6] text-stone-600 text-sm">
        Loading birthday celebration...
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F6] px-6 text-center gap-4">
        <h2 className="font-display text-3xl font-semibold text-stone-900">
          Birthday celebration not found or private
        </h2>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-[#C83E5B] text-white text-sm font-medium cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const palette = experience.themeConfig.palette;
  const t = getT(viewLang);
  const isAr = viewLang === 'ar';

  // Passcode Protection Check
  const isOwner = Boolean(user && user.uid === experience.ownerId);
  if (experience.passcodeEnabled && experience.passcodeHash && !unlockedPasscode && !isOwner) {
    const handleUnlock = async (e: React.FormEvent) => {
      e.preventDefault();
      const hashed = await hashPasscode(passcodeInput);
      if (hashed === experience.passcodeHash) {
        setUnlockedPasscode(true);
        setPasscodeErr(false);
      } else {
        setPasscodeErr(true);
      }
    };

    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: palette.bg, color: palette.text }}
      >
        <form
          onSubmit={handleUnlock}
          className="max-w-md w-full rounded-2xl border p-8 text-center space-y-5"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <Lock className="w-8 h-8 mx-auto" style={{ color: palette.primary }} />
          <h2 className="font-display text-3xl font-semibold">{t.common.enterPasscode}</h2>
          {experience.passcodeHint && (
            <p className="text-xs" style={{ color: palette.muted }}>
              {experience.passcodeHint}
            </p>
          )}
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border text-sm bg-transparent"
            style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.14)' }}
          />
          {passcodeErr && <p className="text-xs text-red-500">{t.common.wrongPasscode}</p>}
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
            style={{ backgroundColor: palette.primary }}
          >
            {t.common.unlock}
          </button>
        </form>
      </div>
    );
  }

  const handleStartSurprise = () => {
    setStarted(true);
    audioManager.playSfx('fireworks');
    if (!experience.audioConfig.muted) {
      audioManager.playTrack(
        experience.audioConfig.bgTrackId,
        experience.audioConfig.bgTrackTitle,
        experience.audioConfig.customAudioUrl
      );
    }
  };

  const handleBlowCandles = () => {
    if (!candlesLit) return;
    setCandlesLit(false);
    setFireworkTrigger((n) => n + 1);
    audioManager.playSfx('candle-blow');
    window.setTimeout(() => audioManager.playSfx('fireworks'), 350);
  };

  // Welcome Curtain (Guarantees audio starts strictly after explicit user click!)
  if (!started) {
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ backgroundColor: palette.bg, color: palette.text }}
      >
        <div
          className="max-w-xl w-full rounded-3xl border p-8 md:p-12 text-center space-y-6"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <p className="text-xs font-medium" style={{ color: palette.primary }}>
            {t.brand} · {experience.birthdayDate}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold [text-wrap:balance]">
            {experience.themeConfig.headlineText}
          </h1>
          {experience.recipientAge && (
            <p className="font-mono-tabular text-sm" style={{ color: palette.muted }}>
              {isAr ? `الاحتفال بعامك الـ ${experience.recipientAge}` : `Celebrating Year ${experience.recipientAge}`}
            </p>
          )}
          <button
            type="button"
            onClick={handleStartSurprise}
            className="px-8 py-3.5 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2.5 cursor-pointer"
            style={{ backgroundColor: palette.primary }}
          >
            <PartyPopper className="w-4 h-4" />
            <span>{t.modules.startSurprise}</span>
          </button>
          <p className="text-xs" style={{ color: palette.muted }}>
            {t.modules.tapToBegin}
          </p>
        </div>
      </div>
    );
  }

  const orderedSections = [...experience.sections]
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    try {
      await submitReport({
        experienceId: experience.id,
        experienceTitle: experience.title,
        reason: reportReason.trim(),
        reporterUid: user?.uid,
      });
      setReportDone(true);
    } catch {
      setReportDone(true);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen pb-24"
      style={{ backgroundColor: palette.bg, color: palette.text }}
    >
      {/* Clean Experience Sub-Toolbar */}
      <div
        className="sticky top-16 z-20 border-b px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4"
        style={{
          backgroundColor: palette.surface,
          borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display text-lg font-semibold truncate">
            {experience.title}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setViewLang((l) => (l === 'en' ? 'ar' : 'en'))}
            className="text-xs font-medium hover:underline cursor-pointer"
            style={{ color: palette.primary }}
          >
            {viewLang === 'en' ? 'العربية' : 'English'}
          </button>
          {!isSample && (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="text-xs inline-flex items-center gap-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{t.modules.reportBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sequential Birthday Journey Sections */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20 pt-10">
        {orderedSections.map((sec) => {
          const secTitle = isAr ? sec.titleAr : sec.titleEn;

          if (sec.type === 'welcome' || sec.type === 'intro') {
            return (
              <section key={sec.id} className="text-center max-w-3xl mx-auto space-y-5">
                <p className="text-xs font-medium" style={{ color: palette.primary }}>
                  {secTitle}
                </p>
                <h2 className="font-display text-4xl sm:text-5xl font-semibold [text-wrap:balance]">
                  {sec.type === 'welcome'
                    ? experience.themeConfig.headlineText
                    : isAr
                    ? `إهداء خاص إلى ${experience.recipientName}`
                    : `A Birthday Dedication to ${experience.recipientName}`}
                </h2>
                {sec.type === 'intro' && (
                  <p className="text-base leading-relaxed" style={{ color: palette.muted }}>
                    {experience.themeConfig.introMessage}
                  </p>
                )}
              </section>
            );
          }

          if (sec.type === 'cake') {
            return (
              <section key={sec.id} className="space-y-6">
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold">{secTitle}</h2>
                  <p className="text-sm" style={{ color: palette.muted }}>
                    {experience.themeConfig.cakeWishPrompt}
                  </p>
                </div>

                <Birthday3DStage
                  mode="cake"
                  cakeDesign={experience.themeConfig.cakeDesign}
                  primaryColor={palette.primary}
                  secondaryColor={palette.secondary}
                  accentColor={palette.accent}
                  darkBg={palette.dark}
                  bgHex={palette.bg}
                  effects={experience.effectsConfig}
                  candlesLit={candlesLit}
                  onBlowCandles={handleBlowCandles}
                  onRelightCandles={() => setCandlesLit(true)}
                  fireworkTrigger={fireworkTrigger}
                  recipientName={experience.recipientName}
                  recipientAge={experience.recipientAge}
                  lang={viewLang}
                  heightClass="h-[420px] md:h-[500px]"
                />

                <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={cakeWishInput}
                    onChange={(e) => setCakeWishInput(e.target.value)}
                    placeholder={t.modules.yourWishPrompt}
                    className="flex-1 px-4 py-2.5 rounded-xl border text-sm bg-transparent"
                    style={{
                      borderColor: palette.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={candlesLit ? handleBlowCandles : () => setCandlesLit(true)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    style={{ backgroundColor: palette.primary }}
                  >
                    <Flame className="w-4 h-4" />
                    <span>{candlesLit ? t.modules.blowCandles : t.modules.relightCandles}</span>
                  </button>
                </div>
                {!candlesLit && (
                  <p className="text-center text-sm font-medium" style={{ color: palette.primary }}>
                    {t.modules.candlesOut} {cakeWishInput ? `— "${cakeWishInput}"` : ''}
                  </p>
                )}
              </section>
            );
          }

          if (sec.type === 'memories') {
            return (
              <section key={sec.id} className="space-y-6">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-center">{secTitle}</h2>
                <MusicalMemoriesModule memories={experience.memories} palette={palette} lang={viewLang} mode="gallery" />
              </section>
            );
          }

          if (sec.type === 'timeline') {
            return (
              <section key={sec.id} className="space-y-6">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-center">{secTitle}</h2>
                <MusicalMemoriesModule memories={experience.memories} palette={palette} lang={viewLang} mode="timeline" />
              </section>
            );
          }

          if (sec.type === 'gifts') {
            return (
              <section key={sec.id} className="space-y-6">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-center">{secTitle}</h2>
                <GiftBoxesModule gifts={experience.gifts} palette={palette} lang={viewLang} />
              </section>
            );
          }

          if (sec.type === 'scratch') {
            return (
              <section key={sec.id} className="space-y-6">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-center">{secTitle}</h2>
                <ScratchCardsModule cards={experience.scratchCards} palette={palette} lang={viewLang} />
              </section>
            );
          }

          if (sec.type === 'quiz') {
            return (
              <section key={sec.id} className="space-y-6">
                <BirthdayQuizModule
                  title={experience.quiz.title}
                  questions={experience.quiz.questions}
                  palette={palette}
                  lang={viewLang}
                />
              </section>
            );
          }

          if (sec.type === 'wheel') {
            return (
              <section key={sec.id} className="space-y-6">
                <SpinWheelModule
                  title={experience.wheel.title}
                  items={experience.wheel.items}
                  palette={palette}
                  lang={viewLang}
                />
              </section>
            );
          }

          if (sec.type === 'wishes') {
            return (
              <section key={sec.id} className="space-y-6">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-center">{secTitle}</h2>
                <WishingTreeAndWallModule
                  experienceId={experience.id}
                  ownerId={experience.ownerId}
                  isSample={isSample || experience.ownerId === 'guest_draft'}
                  moderationRequired={Boolean(experience.moderationRequired)}
                  palette={palette}
                  lang={viewLang}
                  mode="tree"
                />
              </section>
            );
          }

          if (sec.type === 'videoWall') {
            return (
              <section key={sec.id} className="space-y-6">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-center">{secTitle}</h2>
                <WishingTreeAndWallModule
                  experienceId={experience.id}
                  ownerId={experience.ownerId}
                  isSample={isSample || experience.ownerId === 'guest_draft'}
                  moderationRequired={Boolean(experience.moderationRequired)}
                  palette={palette}
                  lang={viewLang}
                  mode="wall"
                />
              </section>
            );
          }

          if (sec.type === 'puzzle') {
            return (
              <section key={sec.id} className="space-y-6">
                <PhotoPuzzleModule puzzle={experience.puzzle} palette={palette} lang={viewLang} />
              </section>
            );
          }

          if (sec.type === 'futureLetter') {
            return (
              <section key={sec.id} className="space-y-6">
                <FutureLetterModule
                  experienceId={experience.id}
                  isSample={isSample || experience.ownerId === 'guest_draft'}
                  meta={experience.futureLetterMeta}
                  palette={palette}
                  lang={viewLang}
                />
              </section>
            );
          }

          if (sec.type === 'finalMessage') {
            return (
              <section key={sec.id} className="max-w-2xl mx-auto text-center space-y-4">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold">
                  {experience.finalMessage.title}
                </h2>
                <p className="text-base leading-relaxed" style={{ color: palette.muted }}>
                  {experience.finalMessage.body}
                </p>
                <p className="text-sm font-semibold" style={{ color: palette.primary }}>
                  — {experience.finalMessage.senderName}
                </p>
              </section>
            );
          }

          if (sec.type === 'grandFinale') {
            return (
              <section key={sec.id} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold">{secTitle}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setFireworkTrigger((n) => n + 1);
                      audioManager.playSfx('fireworks');
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white inline-flex items-center gap-2 cursor-pointer"
                    style={{ backgroundColor: palette.primary }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isAr ? 'إطلاق الألعاب النارية' : 'Launch Birthday Fireworks'}</span>
                  </button>
                </div>
                <Birthday3DStage
                  mode="finale"
                  cakeDesign={experience.themeConfig.cakeDesign}
                  primaryColor={palette.primary}
                  secondaryColor={palette.secondary}
                  accentColor={palette.accent}
                  darkBg={palette.dark}
                  bgHex={palette.bg}
                  effects={experience.effectsConfig}
                  candlesLit={candlesLit}
                  onBlowCandles={handleBlowCandles}
                  onRelightCandles={() => setCandlesLit(true)}
                  fireworkTrigger={fireworkTrigger}
                  lang={viewLang}
                  heightClass="h-[380px] md:h-[460px]"
                />
              </section>
            );
          }

          return null;
        })}
      </div>

      {/* Persistent Centralized Audio Controller */}
      <AudioControllerBar
        defaultTrackId={experience.audioConfig.bgTrackId}
        defaultTrackTitle={experience.audioConfig.bgTrackTitle}
        customAudioUrl={experience.audioConfig.customAudioUrl}
        lang={viewLang}
        dark={palette.dark}
      />

      {/* Moderation Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <form
            onSubmit={handleReportSubmit}
            className="bg-white text-stone-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-stone-200"
          >
            <h3 className="font-display text-2xl font-semibold">
              {isAr ? 'الإبلاغ عن محتوى غير لائق' : 'Report Inappropriate Content'}
            </h3>
            {reportDone ? (
              <p className="text-sm text-emerald-700">
                {isAr ? 'شكراً لك، تم إرسال البلاغ للمراجعة.' : 'Thank you. Your report has been submitted for admin review.'}
              </p>
            ) : (
              <>
                <textarea
                  rows={3}
                  required
                  minLength={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder={isAr ? 'اذكر سبب البلاغ...' : 'Describe the issue...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#C83E5B] text-white text-xs font-medium cursor-pointer"
                  >
                    {t.modules.reportBtn}
                  </button>
                </div>
              </>
            )}
            {reportDone && (
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="w-full py-2 rounded-lg bg-stone-900 text-white text-xs font-medium cursor-pointer"
              >
                {t.common.close}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
