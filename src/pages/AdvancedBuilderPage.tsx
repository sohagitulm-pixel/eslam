import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  Eye,
  EyeOff,
  Flame,
  Monitor,
  Plus,
  Redo2,
  Save,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import QRCode from 'qrcode';
import { PRESET_SYNTH_TRACKS } from '../audio/AudioManager';
import { BirthdayBookViewer } from '../components/book/BirthdayBookViewer';
import { Birthday3DStage } from '../components/three/Birthday3DStage';
import { BirthdayBook3D } from '../components/three/BirthdayBook3D';
import { useApp } from '../context/AppContext';
import {
  BIRTHDAY_TEMPLATES,
  buildExperienceFromTemplate,
  CURATED_BOOK_PALETTES,
} from '../data/templates';
import {
  getExperienceById,
  saveExperience,
  saveFutureLetterSecret,
} from '../services/firestoreService';
import {
  BirthdayExperience,
  BodyFontOption,
  CakeDesign,
  CandleMode,
  CandleStyle,
  HeadingFontOption,
} from '../types/birthday';
import { sanitizeAgeInput } from '../utils/ageUtils';
import {
  compressImageFile,
  hashPasscode,
  readAudioOrVideoFile,
} from '../utils/proceduralArt';

type BuilderTab = 'sections' | 'design' | 'media' | 'games' | 'audio' | 'publish';
type PreviewStageTab = 'book' | 'cake' | 'pages';

export const AdvancedBuilderPage: React.FC<{ experienceId: string }> = ({
  experienceId,
}) => {
  const { t, lang, user, activeDraft, setActiveDraft, navigate, signInWithGoogle } = useApp();
  const isAr = lang === 'ar';

  const [exp, setExp] = useState<BirthdayExperience | null>(null);
  const [history, setHistory] = useState<BirthdayExperience[]>([]);
  const [future, setFuture] = useState<BirthdayExperience[]>([]);
  const [tab, setTab] = useState<BuilderTab>('sections');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewStage, setPreviewStage] = useState<PreviewStageTab>('cake');
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Future letter & passcode transient inputs
  const [futureSecretMsg, setFutureSecretMsg] = useState(
    isAr
      ? 'كل عام وأنت بخير! هذه رسالة محفوظة للمستقبل.'
      : 'Happy future birthday! Remember how much you are celebrated today.'
  );
  const [passcodeInput, setPasscodeInput] = useState('');

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (activeDraft && activeDraft.id === experienceId) {
        if (active) setExp(activeDraft);
        return;
      }
      try {
        const fetched = await getExperienceById(experienceId);
        if (active && fetched) {
          setExp(fetched);
          setActiveDraft(fetched);
          return;
        }
      } catch {
        // Fallback to fresh template draft if not found
      }
      if (active) {
        const fallback = buildExperienceFromTemplate({
          id: experienceId,
          ownerId: user?.uid || 'guest_draft',
          template: BIRTHDAY_TEMPLATES[0],
          recipientName: isAr ? 'صاحب العيد' : 'Alex',
          language: lang,
        });
        setExp(fallback);
        setActiveDraft(fallback);
      }
    };
    init();
  }, [experienceId]);

  const shareUrl = `${window.location.origin}${window.location.pathname}#/b/${experienceId}`;

  useEffect(() => {
    if (tab === 'publish') {
      QRCode.toDataURL(shareUrl, { width: 220, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [tab, shareUrl]);

  const commitChange = useCallback(
    (updater: (prev: BirthdayExperience) => BirthdayExperience) => {
      setExp((prev) => {
        if (!prev) return prev;
        setHistory((h) => [...h.slice(-19), prev]);
        setFuture([]);
        const next = updater(prev);
        setActiveDraft(next);
        return next;
      });
    },
    [setActiveDraft]
  );

  const handleUndo = () => {
    if (!history.length || !exp) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [exp, ...f]);
    setExp(prev);
    setActiveDraft(prev);
  };

  const handleRedo = () => {
    if (!future.length || !exp) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, exp]);
    setExp(next);
    setActiveDraft(next);
  };

  const handleSaveCloud = async (nextPublishState?: boolean) => {
    if (!exp) return;
    setActiveDraft(exp);

    if (!user) {
      setStatusMsg(
        isAr
          ? 'تم حفظ المسودة محلياً. سجّل الدخول بحساب جوجل للنشر والمشاركة.'
          : 'Draft saved locally. Sign in with Google to publish and share online.'
      );
      return;
    }

    setSavingState('saving');
    setStatusMsg(null);
    try {
      const toSave: BirthdayExperience = {
        ...exp,
        ownerId: user.uid,
        published: nextPublishState !== undefined ? nextPublishState : exp.published,
      };
      if (passcodeInput.trim()) {
        toSave.passcodeEnabled = true;
        toSave.passcodeHash = await hashPasscode(passcodeInput.trim());
      }
      const existing = await getExperienceById(toSave.id).catch(() => null);
      await saveExperience(toSave, !existing);
      await saveFutureLetterSecret({
        experienceId: toSave.id,
        ownerId: user.uid,
        unlockDateIso: toSave.futureLetterMeta.unlockDateIso,
        message: futureSecretMsg,
        senderName: toSave.finalMessage.senderName,
      });
      setExp(toSave);
      setActiveDraft(toSave);
      setSavingState('saved');
      window.setTimeout(() => setSavingState('idle'), 2000);
    } catch (err) {
      setSavingState('idle');
      setStatusMsg(err instanceof Error ? err.message : 'Unable to save to cloud');
    }
  };

  // Auto-save to cloud every 25 seconds if signed in and modified
  useEffect(() => {
    if (!user || !exp) return;
    const timer = window.setTimeout(() => {
      handleSaveCloud();
    }, 25000);
    return () => window.clearTimeout(timer);
  }, [exp, user]);

  if (!exp) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-stone-600">
        {t.common.loading}
      </div>
    );
  }

  const moveSection = (index: number, delta: -1 | 1) => {
    commitChange((prev) => {
      const sorted = [...prev.sections].sort((a, b) => a.order - b.order);
      const target = index + delta;
      if (target < 0 || target >= sorted.length) return prev;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      return {
        ...prev,
        sections: sorted.map((s, idx) => ({ ...s, order: idx })),
      };
    });
  };

  const moveMemory = (index: number, delta: -1 | 1) => {
    commitChange((prev) => {
      const list = [...prev.memories];
      const target = index + delta;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, memories: list };
    });
  };

  const palette = exp.themeConfig.palette;

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex flex-col">
      {/* Builder Top Toolbar */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-display text-xl font-semibold text-stone-950 truncate">
            {t.builder.title}: {exp.recipientName}
          </h1>
          <span className="text-xs font-mono-tabular text-stone-500">
            {savingState === 'saving'
              ? t.builder.saving
              : savingState === 'saved'
              ? t.builder.saved
              : exp.published
              ? t.dashboard.published
              : t.dashboard.draft}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!history.length}
            aria-label={t.builder.undo}
            className="p-2 rounded-lg border border-stone-200 text-stone-700 disabled:opacity-40 cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!future.length}
            aria-label={t.builder.redo}
            className="p-2 rounded-lg border border-stone-200 text-stone-700 disabled:opacity-40 cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg">
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`p-1.5 rounded-md cursor-pointer ${
                previewMode === 'desktop' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'
              }`}
              aria-label={t.builder.desktopPreview}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`p-1.5 rounded-md cursor-pointer ${
                previewMode === 'mobile' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'
              }`}
              aria-label={t.builder.mobilePreview}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSaveCloud()}
            className="px-3.5 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-800 hover:bg-stone-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.builder.saveDraft}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/b/${exp.id}`)}
            className="px-3.5 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-800 hover:bg-stone-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.builder.previewExp}</span>
          </button>

          <button
            type="button"
            onClick={() => (user ? handleSaveCloud(!exp.published) : signInWithGoogle())}
            className="px-4 py-2 rounded-lg bg-[#C83E5B] text-white text-xs font-medium hover:bg-[#b0324d] cursor-pointer"
          >
            {user ? (exp.published ? t.builder.unpublish : t.builder.publishNow) : t.nav.signIn}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-900">
          {statusMsg}
        </div>
      )}

      {/* Workspace Split: Controls Left + Live Preview Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Editor Panel */}
        <div className="lg:col-span-5 bg-white border-e border-stone-200 flex flex-col">
          {/* Tab Switcher */}
          <div className="px-4 pt-3 pb-2 border-b border-stone-200 flex flex-wrap gap-1">
            {(
              [
                ['sections', t.builder.sectionsTab],
                ['design', t.builder.designTab],
                ['media', t.builder.mediaTab],
                ['games', t.builder.gamesTab],
                ['audio', t.builder.audioTab],
                ['publish', t.builder.publishTab],
              ] as [BuilderTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                  tab === id
                    ? 'bg-[#C83E5B] text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Body */}
          <div className="p-5 overflow-y-auto space-y-5 max-h-[calc(100vh-180px)]">
            {tab === 'sections' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {t.creator.recipientName}
                    </label>
                    <input
                      type="text"
                      value={exp.recipientName}
                      onChange={(e) =>
                        commitChange((prev) => ({ ...prev, recipientName: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {t.creator.recipientAge} (1–120)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      value={exp.recipientAge || ''}
                      placeholder={isAr ? 'مثال: 25' : 'e.g., 25'}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          recipientAge: sanitizeAgeInput(e.target.value),
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-stone-700">
                    {t.book.bookTitleLabel}
                  </label>
                  <input
                    type="text"
                    value={exp.themeConfig.bookTitle || ''}
                    placeholder={isAr ? `كتاب ذكريات ${exp.recipientName}` : `${exp.recipientName}'s Birthday Book`}
                    onChange={(e) =>
                      commitChange((prev) => ({
                        ...prev,
                        themeConfig: { ...prev.themeConfig, bookTitle: e.target.value },
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                  />
                  <label className="block text-xs font-semibold text-stone-700">
                    {t.creator.headline}
                  </label>
                  <input
                    type="text"
                    value={exp.themeConfig.headlineText}
                    onChange={(e) =>
                      commitChange((prev) => ({
                        ...prev,
                        themeConfig: { ...prev.themeConfig, headlineText: e.target.value },
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                  />
                  <label className="block text-xs font-semibold text-stone-700">
                    {t.creator.message}
                  </label>
                  <textarea
                    rows={3}
                    value={exp.themeConfig.introMessage}
                    onChange={(e) =>
                      commitChange((prev) => ({
                        ...prev,
                        themeConfig: { ...prev.themeConfig, introMessage: e.target.value },
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                  />
                </div>

                <div className="pt-2 border-t border-stone-200">
                  <p className="text-xs font-semibold text-stone-700 mb-3">
                    {t.builder.addSection}
                  </p>
                  <div className="space-y-2">
                    {[...exp.sections]
                      .sort((a, b) => a.order - b.order)
                      .map((sec, idx, arr) => (
                        <div
                          key={sec.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-stone-200 bg-[#FAF8F6]"
                        >
                          <span className="text-xs font-medium text-stone-800 truncate">
                            {isAr ? sec.titleAr : sec.titleEn}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveSection(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 1)}
                              disabled={idx === arr.length - 1}
                              className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                commitChange((prev) => ({
                                  ...prev,
                                  sections: prev.sections.map((s) =>
                                    s.id === sec.id ? { ...s, visible: !s.visible } : s
                                  ),
                                }))
                              }
                              className="p-1 text-stone-600 hover:text-[#C83E5B] cursor-pointer"
                            >
                              {sec.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'design' && (
              <div className="space-y-5">
                {/* Curated 6 Book Palettes */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-2">
                    {t.book.curatedPalettesLabel}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CURATED_BOOK_PALETTES.map((cp) => {
                      const active = exp.themeConfig.bookStyle === cp.key;
                      return (
                        <button
                          key={cp.key}
                          type="button"
                          onClick={() =>
                            commitChange((prev) => ({
                              ...prev,
                              themeConfig: {
                                ...prev.themeConfig,
                                bookStyle: cp.key,
                                palette: { ...cp.palette },
                                bookCoverColor: cp.bookCoverColor,
                                paperColor: cp.paperColor,
                                cakeDesign: cp.cakeDesign,
                                cakeColors: { ...cp.cakeColors },
                                candleStyle: cp.candleStyle,
                              },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-start cursor-pointer transition-colors ${
                            active ? 'border-[#C83E5B] ring-1 ring-[#C83E5B]' : 'border-stone-200 hover:border-stone-300'
                          }`}
                          style={{ backgroundColor: cp.palette.bg }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cp.bookCoverColor }} />
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cp.palette.primary }} />
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cp.palette.accent }} />
                          </div>
                          <p className="text-[11px] font-semibold truncate" style={{ color: cp.palette.text }}>
                            {isAr ? cp.nameAr : cp.nameEn}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 15 Templates Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    {t.creator.preferredDesign}
                  </label>
                  <select
                    value={exp.templateId}
                    onChange={(e) => {
                      const tpl = BIRTHDAY_TEMPLATES.find((x) => x.id === e.target.value);
                      if (!tpl) return;
                      commitChange((prev) => ({
                        ...prev,
                        templateId: tpl.id,
                        themeConfig: {
                          ...prev.themeConfig,
                          palette: { ...tpl.palette },
                          cakeDesign: tpl.cakeDesign,
                          bookCoverColor: tpl.bookCoverColor || tpl.palette.primary,
                          paperColor: tpl.paperColor || (tpl.palette.dark ? tpl.palette.surface : '#FCF8F0'),
                          candleStyle: tpl.candleStyle || 'classic-ivory',
                        },
                        effectsConfig: { ...tpl.effectsConfig },
                      }));
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm bg-white"
                  >
                    {BIRTHDAY_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {isAr ? tpl.nameAr : tpl.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Book & Page Colors */}
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[10px] text-stone-600 mb-1 truncate">{t.book.bookCoverColorLabel}</label>
                    <input
                      type="color"
                      value={exp.themeConfig.bookCoverColor || palette.primary}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          themeConfig: { ...prev.themeConfig, bookCoverColor: e.target.value },
                        }))
                      }
                      className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-600 mb-1 truncate">{t.book.paperColorLabel}</label>
                    <input
                      type="color"
                      value={exp.themeConfig.paperColor || '#FCF8F0'}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          themeConfig: { ...prev.themeConfig, paperColor: e.target.value },
                        }))
                      }
                      className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-600 mb-1 truncate">Primary</label>
                    <input
                      type="color"
                      value={palette.primary}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          themeConfig: {
                            ...prev.themeConfig,
                            palette: { ...prev.themeConfig.palette, primary: e.target.value },
                          },
                        }))
                      }
                      className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-600 mb-1 truncate">Accent</label>
                    <input
                      type="color"
                      value={palette.accent}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          themeConfig: {
                            ...prev.themeConfig,
                            palette: { ...prev.themeConfig.palette, accent: e.target.value },
                          },
                        }))
                      }
                      className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-600 mb-1 truncate">Page BG</label>
                    <input
                      type="color"
                      value={palette.bg}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          themeConfig: {
                            ...prev.themeConfig,
                            palette: { ...prev.themeConfig.palette, bg: e.target.value },
                          },
                        }))
                      }
                      className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Typography Pair */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {t.book.headingFontLabel}
                    </label>
                    <select
                      value={exp.themeConfig.headingFont || 'cormorant'}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          themeConfig: {
                            ...prev.themeConfig,
                            headingFont: e.target.value as HeadingFontOption,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white"
                    >
                      <option value="cormorant">Cormorant Garamond</option>
                      <option value="playfair">Playfair Display</option>
                      <option value="jakarta">Plus Jakarta Sans</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {t.book.bodyFontLabel}
                    </label>
                    <select
                      value={exp.themeConfig.bodyFont || 'jakarta'}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          themeConfig: {
                            ...prev.themeConfig,
                            bodyFont: e.target.value as BodyFontOption,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white"
                    >
                      <option value="jakarta">Plus Jakarta Sans</option>
                      <option value="lora">Lora Editorial</option>
                      <option value="cairo">Cairo Arabic/Sans</option>
                    </select>
                  </div>
                </div>

                {/* Cake Design & Colors */}
                <div className="pt-3 border-t border-stone-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      {t.builder.cakeStyle}
                    </label>
                    <select
                      value={exp.themeConfig.cakeDesign}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          themeConfig: {
                            ...prev.themeConfig,
                            cakeDesign: e.target.value as CakeDesign,
                          },
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm bg-white"
                    >
                      {(Object.keys(t.book.cakeStyles) as CakeDesign[]).map((key) => (
                        <option key={key} value={key}>
                          {t.book.cakeStyles[key]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-stone-600 mb-1.5">{t.book.cakeColorsLabel}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(['tier1', 'tier2', 'frosting', 'accent'] as const).map((ck) => (
                        <div key={ck}>
                          <label className="block text-[10px] text-stone-500 capitalize mb-0.5">{ck}</label>
                          <input
                            type="color"
                            value={exp.themeConfig.cakeColors?.[ck] || (ck === 'accent' ? palette.accent : '#FFFDF9')}
                            onChange={(e) =>
                              commitChange((prev) => ({
                                ...prev,
                                themeConfig: {
                                  ...prev.themeConfig,
                                  cakeColors: {
                                    tier1: prev.themeConfig.cakeColors?.tier1 || '#FFFDF9',
                                    tier2: prev.themeConfig.cakeColors?.tier2 || palette.secondary,
                                    frosting: prev.themeConfig.cakeColors?.frosting || '#FFFFFF',
                                    accent: prev.themeConfig.cakeColors?.accent || palette.accent,
                                    [ck]: e.target.value,
                                  },
                                },
                              }))
                            }
                            className="w-full h-8 rounded-lg border border-stone-200 cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Candle Mode & Candle Style */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        {t.book.candleModeLabel}
                      </label>
                      <select
                        value={exp.themeConfig.candleMode || 'auto'}
                        onChange={(e) =>
                          commitChange((prev) => ({
                            ...prev,
                            themeConfig: {
                              ...prev.themeConfig,
                              candleMode: e.target.value as CandleMode,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white"
                      >
                        {(Object.keys(t.book.candleModes) as CandleMode[]).map((cm) => (
                          <option key={cm} value={cm}>
                            {t.book.candleModes[cm]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        {t.book.candleStyleLabel}
                      </label>
                      <select
                        value={exp.themeConfig.candleStyle || 'classic-ivory'}
                        onChange={(e) =>
                          commitChange((prev) => ({
                            ...prev,
                            themeConfig: {
                              ...prev.themeConfig,
                              candleStyle: e.target.value as CandleStyle,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white"
                      >
                        {(Object.keys(t.book.candleStyles) as CandleStyle[]).map((cs) => (
                          <option key={cs} value={cs}>
                            {t.book.candleStyles[cs]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ornaments & 3D Effects */}
                <div className="pt-3 border-t border-stone-200 space-y-3">
                  <p className="text-xs font-semibold text-stone-700">{t.book.decorationsLabel}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['corners', 'stars', 'florals', 'ribbons'] as const).map((dk) => {
                      const currentDec = exp.themeConfig.decorations || {
                        corners: true,
                        stars: true,
                        florals: true,
                        ribbons: true,
                      };
                      return (
                        <label key={dk} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentDec[dk]}
                            onChange={(e) =>
                              commitChange((prev) => ({
                                ...prev,
                                themeConfig: {
                                  ...prev.themeConfig,
                                  decorations: {
                                    ...(prev.themeConfig.decorations || {
                                      corners: true,
                                      stars: true,
                                      florals: true,
                                      ribbons: true,
                                    }),
                                    [dk]: e.target.checked,
                                  },
                                },
                              }))
                            }
                            className="accent-[#C83E5B]"
                          />
                          <span className="capitalize">{dk}</span>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-xs font-semibold text-stone-700 pt-2">{t.builder.effects3D}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      ['roses', 'petals', 'balloons', 'hearts', 'fireworks', 'confetti', 'sparkles'] as const
                    ).map((key) => (
                      <label key={key} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exp.effectsConfig[key]}
                          onChange={(e) =>
                            commitChange((prev) => ({
                              ...prev,
                              effectsConfig: { ...prev.effectsConfig, [key]: e.target.checked },
                            }))
                          }
                          className="accent-[#C83E5B]"
                        />
                        <span className="capitalize">{key}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="flex justify-between text-xs text-stone-600 mb-1">
                      <span>{t.builder.speed}</span>
                      <span className="font-mono-tabular">{exp.effectsConfig.speed.toFixed(1)}x</span>
                    </label>
                    <input
                      type="range"
                      min={0.4}
                      max={1.8}
                      step={0.1}
                      value={exp.effectsConfig.speed}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          effectsConfig: { ...prev.effectsConfig, speed: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#C83E5B]"
                    />
                  </div>

                  <div>
                    <label className="flex justify-between text-xs text-stone-600 mb-1">
                      <span>{t.builder.density}</span>
                      <span className="font-mono-tabular">{exp.effectsConfig.density.toFixed(1)}x</span>
                    </label>
                    <input
                      type="range"
                      min={0.4}
                      max={1.8}
                      step={0.1}
                      value={exp.effectsConfig.density}
                      onChange={(e) =>
                        commitChange((prev) => ({
                          ...prev,
                          effectsConfig: { ...prev.effectsConfig, density: parseFloat(e.target.value) },
                        }))
                      }
                      className="w-full accent-[#C83E5B]"
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === 'media' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-stone-700">
                    Musical Memories ({exp.memories.length}/15)
                  </h3>
                  <label className="px-3 py-1.5 rounded-lg bg-[#C83E5B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إضافة صورة' : 'Add Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const url = await compressImageFile(file, 900, 0.75);
                          commitChange((prev) => ({
                            ...prev,
                            memories: [
                              ...prev.memories,
                              {
                                id: `mem-${Date.now()}`,
                                title: file.name.replace(/\.[^/.]+$/, ''),
                                message: isAr ? 'ذكرى جميلة لا تُنسى.' : 'A cherished birthday memory.',
                                date: new Date().toISOString().slice(0, 10),
                                photoUrl: url,
                                songTitle: 'Birthday Melody',
                                audioUrl: 'synth:morning-sunbeams',
                              },
                            ],
                          }));
                        } catch (err) {
                          setStatusMsg(err instanceof Error ? err.message : 'Image upload failed');
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  {exp.memories.map((mem, idx) => (
                    <div key={mem.id} className="p-3.5 rounded-xl border border-stone-200 space-y-2.5 bg-[#FAF8F6]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={mem.photoUrl} alt={mem.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          <input
                            type="text"
                            value={mem.title}
                            onChange={(e) =>
                              commitChange((prev) => ({
                                ...prev,
                                memories: prev.memories.map((m) =>
                                  m.id === mem.id ? { ...m, title: e.target.value } : m
                                ),
                              }))
                            }
                            className="text-xs font-semibold bg-white px-2.5 py-1 rounded-lg border border-stone-200 w-full"
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => moveMemory(idx, -1)} className="p-1 text-stone-500 cursor-pointer">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => moveMemory(idx, 1)} className="p-1 text-stone-500 cursor-pointer">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              commitChange((prev) => ({
                                ...prev,
                                memories: prev.memories.filter((m) => m.id !== mem.id),
                              }))
                            }
                            className="p-1 text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        value={mem.message}
                        onChange={(e) =>
                          commitChange((prev) => ({
                            ...prev,
                            memories: prev.memories.map((m) =>
                              m.id === mem.id ? { ...m, message: e.target.value } : m
                            ),
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={mem.songTitle || ''}
                          placeholder="Song title"
                          onChange={(e) =>
                            commitChange((prev) => ({
                              ...prev,
                              memories: prev.memories.map((m) =>
                                m.id === mem.id ? { ...m, songTitle: e.target.value } : m
                              ),
                            }))
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
                        />
                        <label className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[11px] text-stone-600 flex items-center gap-1.5 cursor-pointer truncate">
                          <Upload className="w-3 h-3 shrink-0" />
                          <span>{isAr ? 'رفع صوت' : 'Upload Song'}</span>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const audioData = await readAudioOrVideoFile(file, 450_000);
                                commitChange((prev) => ({
                                  ...prev,
                                  memories: prev.memories.map((m) =>
                                    m.id === mem.id
                                      ? { ...m, audioUrl: audioData, songTitle: file.name }
                                      : m
                                  ),
                                }));
                              } catch (err) {
                                setStatusMsg(err instanceof Error ? err.message : 'Audio too large');
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'games' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-700">
                    {isAr ? 'رسالة من المستقبل (مقفلة حتى التاريخ المحدد)' : 'Letter from the Future (Server-Locked)'}
                  </p>
                  <input
                    type="date"
                    value={exp.futureLetterMeta.unlockDateIso.slice(0, 10)}
                    onChange={(e) =>
                      commitChange((prev) => ({
                        ...prev,
                        futureLetterMeta: {
                          ...prev.futureLetterMeta,
                          unlockDateIso: new Date(`${e.target.value}T00:00:00Z`).toISOString(),
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                  />
                  <textarea
                    rows={3}
                    value={futureSecretMsg}
                    onChange={(e) => setFutureSecretMsg(e.target.value)}
                    placeholder="Write the secret letter unlocked in the future..."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                  />
                </div>

                <div className="pt-3 border-t border-stone-200 space-y-2">
                  <p className="text-xs font-semibold text-stone-700">Photo Puzzle Difficulty</p>
                  <div className="flex gap-2">
                    {([3, 4, 5] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() =>
                          commitChange((prev) => ({
                            ...prev,
                            puzzle: { ...prev.puzzle, gridSize: sz },
                          }))
                        }
                        className={`flex-1 py-2 rounded-lg border text-xs font-mono-tabular cursor-pointer ${
                          exp.puzzle.gridSize === sz
                            ? 'bg-[#C83E5B] text-white border-[#C83E5B]'
                            : 'border-stone-200'
                        }`}
                      >
                        {sz}x{sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-200 space-y-2">
                  <p className="text-xs font-semibold text-stone-700">Spin the Wheel Prizes</p>
                  {exp.wheel.items.map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) =>
                          commitChange((prev) => ({
                            ...prev,
                            wheel: {
                              ...prev.wheel,
                              items: prev.wheel.items.map((w) =>
                                w.id === item.id ? { ...w, label: e.target.value } : w
                              ),
                            },
                          }))
                        }
                        className="w-1/3 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs"
                      />
                      <input
                        type="text"
                        value={item.rewardMessage}
                        onChange={(e) =>
                          commitChange((prev) => ({
                            ...prev,
                            wheel: {
                              ...prev.wheel,
                              items: prev.wheel.items.map((w) =>
                                w.id === item.id ? { ...w, rewardMessage: e.target.value } : w
                              ),
                            },
                          }))
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'audio' && (
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-stone-700">
                  Background Music Preset
                </label>
                <select
                  value={exp.audioConfig.bgTrackId}
                  onChange={(e) => {
                    const tr = PRESET_SYNTH_TRACKS.find((x) => x.id === e.target.value);
                    if (!tr) return;
                    commitChange((prev) => ({
                      ...prev,
                      audioConfig: {
                        ...prev.audioConfig,
                        bgTrackId: tr.id,
                        bgTrackTitle: isAr ? tr.titleAr : tr.titleEn,
                        customAudioUrl: undefined,
                      },
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
                >
                  {PRESET_SYNTH_TRACKS.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {isAr ? tr.titleAr : tr.titleEn}
                    </option>
                  ))}
                </select>

                <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-stone-300 text-xs font-medium text-stone-700 cursor-pointer hover:bg-stone-50">
                  <Upload className="w-4 h-4" />
                  <span>{isAr ? 'أو رفع ملف موسيقى خاص (MP3/WAV)' : 'Or upload custom audio (MP3/WAV)'}</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await readAudioOrVideoFile(file, 450_000);
                        commitChange((prev) => ({
                          ...prev,
                          audioConfig: {
                            ...prev.audioConfig,
                            bgTrackId: 'custom',
                            bgTrackTitle: file.name,
                            customAudioUrl: url,
                          },
                        }));
                      } catch (err) {
                        setStatusMsg(err instanceof Error ? err.message : 'Audio upload error');
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {tab === 'publish' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    {t.builder.visibility}
                  </label>
                  <select
                    value={exp.visibility}
                    onChange={(e) =>
                      commitChange((prev) => ({
                        ...prev,
                        visibility: e.target.value as 'public' | 'unlisted' | 'private',
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm bg-white"
                  >
                    <option value="public">{t.builder.publicVis}</option>
                    <option value="unlisted">{t.builder.unlistedVis}</option>
                    <option value="private">{t.builder.privateVis}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    {t.builder.passcodeLabel}
                  </label>
                  <input
                    type="text"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder={isAr ? 'اتركه فارغاً بدون كلمة مرور' : 'Leave blank for no passcode'}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(exp.moderationRequired)}
                    onChange={(e) =>
                      commitChange((prev) => ({ ...prev, moderationRequired: e.target.checked }))
                    }
                    className="accent-[#C83E5B]"
                  />
                  <span>{t.builder.moderationLabel}</span>
                </label>

                <div className="pt-3 border-t border-stone-200 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-xs font-mono-tabular"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(shareUrl);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1800);
                      }}
                      className="px-3 py-2 rounded-lg border border-stone-200 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? t.dashboard.copied : t.dashboard.copyLink}</span>
                    </button>
                  </div>

                  {qrDataUrl && (
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-stone-200 bg-[#FAF8F6]">
                      <img src={qrDataUrl} alt="Birthday QR Code" className="w-36 h-36 rounded-lg" />
                      <a
                        href={qrDataUrl}
                        download={`${exp.recipientName}-birthday-qr.png`}
                        className="text-xs font-medium text-[#C83E5B] hover:underline"
                      >
                        {t.common.downloadQr}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Live Preview Canvas */}
        <div className="lg:col-span-7 p-4 sm:p-6 flex flex-col items-center gap-4 bg-stone-100/70">
          {/* Preview Stage Switcher */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-stone-200 shadow-xs">
            <button
              type="button"
              onClick={() => setPreviewStage('cake')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                previewStage === 'cake' ? 'bg-[#C83E5B] text-white' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{isAr ? 'الكعكة والشموع' : '3D Cake & Candles'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewStage('book')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                previewStage === 'book' ? 'bg-[#C83E5B] text-white' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isAr ? 'غلاف الكتاب 3D' : '3D Book Cover'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewStage('pages')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                previewStage === 'pages' ? 'bg-[#C83E5B] text-white' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isAr ? 'صفحات الكتاب' : 'Open Book Pages'}</span>
            </button>
          </div>

          <div
            className={`transition-all duration-300 rounded-2xl border border-stone-200 overflow-hidden shadow-sm ${
              previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-4xl'
            }`}
            style={{ backgroundColor: palette.bg, color: palette.text }}
          >
            {previewStage === 'pages' ? (
              <BirthdayBookViewer
                experience={exp}
                viewLang={exp.language}
                embeddedPreview
                initialOpen
              />
            ) : previewStage === 'book' ? (
              <div className="p-6 space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-xs font-medium" style={{ color: palette.primary }}>
                    {exp.themeConfig.bookTitle || exp.title}
                  </p>
                  <h2 className="font-display text-2xl font-semibold">
                    {exp.themeConfig.headlineText}
                  </h2>
                </div>
                <BirthdayBook3D
                  recipientName={exp.recipientName}
                  recipientAge={exp.recipientAge}
                  bookTitle={exp.themeConfig.bookTitle}
                  birthdayDate={exp.birthdayDate}
                  coverColor={exp.themeConfig.bookCoverColor || palette.primary}
                  paperColor={exp.themeConfig.paperColor || '#FCF8F0'}
                  accentColor={palette.accent}
                  darkBg={palette.dark}
                  bgHex={palette.bg}
                  lang={exp.language}
                  decorations={exp.themeConfig.decorations}
                  heightClass={previewMode === 'mobile' ? 'h-[340px]' : 'h-[420px]'}
                />
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="text-center space-y-1.5">
                  <p className="text-xs font-medium" style={{ color: palette.primary }}>
                    {exp.title}
                  </p>
                  <h2 className="font-display text-3xl font-semibold">
                    {exp.themeConfig.headlineText}
                  </h2>
                  <p className="text-xs max-w-md mx-auto leading-relaxed" style={{ color: palette.muted }}>
                    {exp.themeConfig.introMessage}
                  </p>
                </div>

                <Birthday3DStage
                  mode="cake"
                  cakeDesign={exp.themeConfig.cakeDesign}
                  primaryColor={palette.primary}
                  secondaryColor={palette.secondary}
                  accentColor={palette.accent}
                  cakeColors={exp.themeConfig.cakeColors}
                  candleMode={exp.themeConfig.candleMode}
                  candleStyle={exp.themeConfig.candleStyle}
                  darkBg={palette.dark}
                  bgHex={palette.bg}
                  effects={exp.effectsConfig}
                  recipientName={exp.recipientName}
                  recipientAge={exp.recipientAge}
                  lang={exp.language}
                  heightClass={previewMode === 'mobile' ? 'h-[320px]' : 'h-[400px]'}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
