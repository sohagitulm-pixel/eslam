import React, { useState } from 'react';
import { Sparkles, Upload, Wand2 } from 'lucide-react';
import { PRESET_SYNTH_TRACKS } from '../audio/AudioManager';
import { useApp } from '../context/AppContext';
import { BIRTHDAY_TEMPLATES, buildExperienceFromTemplate } from '../data/templates';
import { saveExperience, saveFutureLetterSecret } from '../services/firestoreService';
import { Language, RelationshipType } from '../types/birthday';
import { formatAgeNumber, parseValidAge, sanitizeAgeInput } from '../utils/ageUtils';
import { compressImageFile } from '../utils/proceduralArt';

export const QuickCreatorPage: React.FC<{ initialTemplateId?: string }> = ({
  initialTemplateId,
}) => {
  const { t, lang, user, navigate, setActiveDraft } = useApp();
  const isAr = lang === 'ar';

  const [recipientName, setRecipientName] = useState('');
  const [recipientAge, setRecipientAge] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('friend');
  const [birthdayDate, setBirthdayDate] = useState(new Date().toISOString().slice(0, 10));
  const [pageLanguage, setPageLanguage] = useState<Language>(lang);
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState(user?.displayName || '');
  const [templateId, setTemplateId] = useState(initialTemplateId || BIRTHDAY_TEMPLATES[0].id);
  const [bgTrackId, setBgTrackId] = useState(PRESET_SYNTH_TRACKS[0].id);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 6);
    if (!files.length) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const compressed = await Promise.all(files.map((f) => compressImageFile(f, 960, 0.76)));
      setUploadedPhotos((prev) => [...prev, ...compressed].slice(0, 10));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async (openInBuilder: boolean) => {
    if (!recipientName.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم صاحب عيد الميلاد.' : 'Please enter the birthday person’s name.');
      return;
    }

    const cleanAge = sanitizeAgeInput(recipientAge);

    setSaving(true);
    setErrorMsg(null);
    const tpl = BIRTHDAY_TEMPLATES.find((x) => x.id === templateId) || BIRTHDAY_TEMPLATES[0];
    const expId = `bday_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const exp = buildExperienceFromTemplate({
      id: expId,
      ownerId: user?.uid || 'guest_draft',
      template: tpl,
      recipientName: recipientName.trim(),
      recipientAge: cleanAge,
      relationship,
      birthdayDate,
      language: pageLanguage,
      message: message.trim() || undefined,
      senderName: senderName.trim() || undefined,
      uploadedPhotos,
      bgTrackId,
    });

    setActiveDraft(exp);

    if (user) {
      try {
        await saveExperience(exp, true);
        await saveFutureLetterSecret({
          experienceId: exp.id,
          ownerId: user.uid,
          unlockDateIso: exp.futureLetterMeta.unlockDateIso,
          message: exp.finalMessage.body,
          senderName: exp.finalMessage.senderName,
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Saved locally; sign in verified to sync.');
      }
    }

    setSaving(false);
    if (openInBuilder) {
      navigate(`/builder/${exp.id}`);
    } else {
      navigate(`/b/${exp.id}`);
    }
  };

  const validAgePreview = parseValidAge(recipientAge);

  return (
    <div className="min-h-screen bg-[#FAF8F6] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold text-stone-950">
              {t.creator.quickTitle}
            </h1>
            <p className="text-sm text-stone-600 mt-1.5">{t.creator.quickSubtitle}</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-xl">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-white text-xs font-medium text-stone-950 shadow-xs"
            >
              {t.creator.modeQuick}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-950 cursor-pointer"
            >
              {t.creator.modeAdvanced}
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t.creator.recipientName} *
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                maxLength={100}
                placeholder={isAr ? 'مثال: سارة أو كريم' : 'e.g., Layla or Omar'}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#C83E5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t.creator.recipientAge} (1–120)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={recipientAge}
                onChange={(e) => setRecipientAge(sanitizeAgeInput(e.target.value))}
                maxLength={3}
                placeholder={isAr ? 'مثال: 25 (اتركه فارغاً للإخفاء)' : 'e.g., 25 (optional)'}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-mono-tabular focus:outline-none focus:border-[#C83E5B]"
              />
              {validAgePreview !== null && (
                <p className="text-[11px] text-stone-500 mt-1">
                  {validAgePreview <= 20
                    ? isAr
                      ? `سيظهر على الكعكة ${formatAgeNumber(validAgePreview, lang)} شمعة مضيئة`
                      : `${validAgePreview} individual candles will glow on the cake`
                    : isAr
                    ? `ستظهر شموع أرقام ثلاثية الأبعاد (${formatAgeNumber(validAgePreview, lang)})`
                    : `3D numeral candles (${validAgePreview}) will adorn the cake`}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t.creator.relationship}
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as RelationshipType)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:border-[#C83E5B]"
              >
                {(Object.keys(t.creator.relationships) as RelationshipType[]).map((rel) => (
                  <option key={rel} value={rel}>
                    {t.creator.relationships[rel]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t.creator.birthdayDate}
              </label>
              <input
                type="date"
                value={birthdayDate}
                onChange={(e) => setBirthdayDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#C83E5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t.creator.senderName}
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                maxLength={80}
                placeholder={isAr ? 'اسمك' : 'Your name'}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#C83E5B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t.creator.pageLanguage}
              </label>
              <div className="flex gap-2">
                {(['en', 'ar'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setPageLanguage(l)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-medium cursor-pointer ${
                      pageLanguage === l
                        ? 'bg-[#C83E5B] text-white border-[#C83E5B]'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {l === 'en' ? 'English (LTR)' : 'العربية (RTL)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              {t.creator.message}
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1500}
              placeholder={
                isAr
                  ? 'اكتب رسالة عيد ميلاد نابعة من القلب...'
                  : 'Write a warm birthday message for the celebration...'
              }
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#C83E5B]"
            />
          </div>

          {/* Template Picker */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              {t.creator.preferredDesign}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {BIRTHDAY_TEMPLATES.map((tpl) => {
                const active = templateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateId(tpl.id)}
                    className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                      active ? 'border-[#C83E5B] ring-1 ring-[#C83E5B]' : 'border-stone-200 hover:border-stone-300'
                    }`}
                    style={{ backgroundColor: tpl.palette.bg }}
                  >
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tpl.palette.primary }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tpl.palette.secondary }} />
                    </div>
                    <p className="text-[11px] font-semibold line-clamp-2" style={{ color: tpl.palette.text }}>
                      {isAr ? tpl.nameAr : tpl.nameEn}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Music & Photos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t.creator.musicLabel}
              </label>
              <select
                value={bgTrackId}
                onChange={(e) => setBgTrackId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
              >
                {PRESET_SYNTH_TRACKS.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {isAr ? tr.titleAr : tr.titleEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                {t.creator.photosLabel}
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-stone-300 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploading ? t.common.loading : isAr ? 'اختيار صور من الجهاز' : 'Select photos'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {uploadedPhotos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {uploadedPhotos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Upload ${i + 1}`}
                      className="w-12 h-12 rounded-lg object-cover border border-stone-200"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleGenerate(false)}
              className="px-6 py-3 rounded-xl bg-[#C83E5B] text-white text-sm font-semibold hover:bg-[#b0324d] inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.creator.generateBtn}</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleGenerate(true)}
              className="px-6 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm font-semibold hover:bg-stone-50 inline-flex items-center gap-2 cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>{t.creator.openBuilderBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
