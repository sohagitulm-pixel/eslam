import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { audioManager } from '../audio/AudioManager';
import { BirthdayBookViewer } from '../components/book/BirthdayBookViewer';
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
        Loading birthday book...
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F6] px-6 text-center gap-4">
        <h2 className="font-display text-3xl font-semibold text-stone-900">
          Birthday book not found or private
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
    <>
      <BirthdayBookViewer
        experience={experience}
        viewLang={viewLang}
        onToggleLang={() => setViewLang((l) => (l === 'en' ? 'ar' : 'en'))}
        isSample={isSample}
        onOpenReport={() => setReportOpen(true)}
      />

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
                {isAr
                  ? 'شكراً لك، تم إرسال البلاغ للمراجعة.'
                  : 'Thank you. Your report has been submitted for admin review.'}
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
    </>
  );
};
