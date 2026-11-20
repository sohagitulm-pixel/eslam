import React, { useEffect, useState } from 'react';
import { MessageSquareHeart, Mic, Send, Video } from 'lucide-react';
import { getT } from '../../i18n/translations';
import { getApprovedWishes, submitWish } from '../../services/firestoreService';
import { BirthdayWish, Language, ThemePalette } from '../../types/birthday';
import { readAudioOrVideoFile } from '../../utils/proceduralArt';
import { Birthday3DStage } from '../three/Birthday3DStage';

interface WishingTreeAndWallProps {
  experienceId: string;
  ownerId: string;
  isSample: boolean;
  moderationRequired: boolean;
  palette: ThemePalette;
  lang: Language;
  mode: 'tree' | 'wall';
}

const DEFAULT_SAMPLE_WISHES: BirthdayWish[] = [
  {
    id: 'sw-1',
    experienceId: 'sample',
    ownerId: 'sample',
    authorName: 'Sara M.',
    isAnonymous: false,
    type: 'wish',
    message: 'Wishing you a year filled with gentle mornings, travel, and endless laughter!',
    status: 'approved',
    leafColor: '#E9C46A',
  },
  {
    id: 'sw-2',
    experienceId: 'sample',
    ownerId: 'sample',
    authorName: 'نورة وعبدالله',
    isAnonymous: false,
    type: 'text',
    message: 'كل عام وأنتِ بخير وسعادة وصحة دائمة يا أغلى الناس!',
    status: 'approved',
    leafColor: '#C83E5B',
  },
  {
    id: 'sw-3',
    experienceId: 'sample',
    ownerId: 'sample',
    authorName: 'Daniel',
    isAnonymous: false,
    type: 'wish',
    message: 'Cheers to another milestone year — save me a slice of cake!',
    status: 'approved',
    leafColor: '#52B788',
  },
];

export const WishingTreeAndWallModule: React.FC<WishingTreeAndWallProps> = ({
  experienceId,
  ownerId,
  isSample,
  moderationRequired,
  palette,
  lang,
  mode,
}) => {
  const t = getT(lang);
  const [wishes, setWishes] = useState<BirthdayWish[]>(isSample ? DEFAULT_SAMPLE_WISHES : []);
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [wishType, setWishType] = useState<'wish' | 'text' | 'audio' | 'video'>(
    mode === 'tree' ? 'wish' : 'text'
  );
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isSample) return;
    getApprovedWishes(experienceId)
      .then((list) => setWishes(list))
      .catch(() => {});
  }, [experienceId, isSample]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const dataUrl = await readAudioOrVideoFile(file, 450_000);
      setMediaUrl(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid media file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    setStatusNotice(null);

    try {
      if (isSample) {
        const localWish: BirthdayWish = {
          id: `local-${Date.now()}`,
          experienceId,
          ownerId,
          authorName: isAnonymous ? (lang === 'ar' ? 'صديق مجهول' : 'Anonymous Friend') : authorName || 'Friend',
          isAnonymous,
          type: wishType,
          message: message.trim(),
          mediaUrl: mediaUrl || undefined,
          status: 'approved',
          leafColor: palette.primary,
        };
        setWishes((prev) => [localWish, ...prev]);
        setStatusNotice(t.modules.wishApproved);
      } else {
        const saved = await submitWish({
          experienceId,
          ownerId,
          authorName: authorName.trim() || 'Friend',
          isAnonymous,
          type: wishType,
          message: message.trim(),
          mediaUrl: mediaUrl || undefined,
          leafColor: palette.primary,
          moderationRequired,
        });
        if (saved.status === 'approved') {
          setWishes((prev) => [saved, ...prev]);
          setStatusNotice(t.modules.wishApproved);
        } else {
          setStatusNotice(t.modules.wishPending);
        }
      }
      setMessage('');
      setMediaUrl('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save wish right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {mode === 'tree' && (
        <Birthday3DStage
          mode="tree"
          primaryColor={palette.primary}
          secondaryColor={palette.secondary}
          accentColor={palette.accent}
          darkBg={palette.dark}
          bgHex={palette.bg}
          wishCount={wishes.length}
          lang={lang}
          heightClass="h-[360px] md:h-[420px]"
          showDock={false}
        />
      )}

      {/* Wish Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto rounded-2xl border p-6 space-y-4"
        style={{
          backgroundColor: palette.surface,
          borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        }}
      >
        <h4 className="font-display text-2xl font-semibold" style={{ color: palette.text }}>
          {mode === 'tree' ? t.modules.addWish : t.modules.addVideoWall}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            value={authorName}
            disabled={isAnonymous}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder={t.modules.yourName}
            maxLength={80}
            className="px-4 py-2.5 rounded-xl border text-sm bg-transparent"
            style={{
              borderColor: palette.dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
              color: palette.text,
            }}
          />

          <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: palette.muted }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="accent-[#C83E5B] w-4 h-4"
            />
            <span>{t.modules.postAnonymously}</span>
          </label>
        </div>

        {mode === 'wall' && (
          <div className="flex flex-wrap gap-2">
            {(['text', 'audio', 'video'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setWishType(kind)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: wishType === kind ? palette.primary : 'transparent',
                  color: wishType === kind ? '#FFFFFF' : palette.text,
                  borderColor: wishType === kind
                    ? palette.primary
                    : palette.dark
                    ? 'rgba(255,255,255,0.16)'
                    : 'rgba(0,0,0,0.12)',
                }}
              >
                {kind === 'text' && <MessageSquareHeart className="w-3.5 h-3.5" />}
                {kind === 'audio' && <Mic className="w-3.5 h-3.5" />}
                {kind === 'video' && <Video className="w-3.5 h-3.5" />}
                <span className="capitalize">{kind}</span>
              </button>
            ))}
          </div>
        )}

        {(wishType === 'audio' || wishType === 'video') && (
          <div>
            <input
              type="file"
              accept={wishType === 'audio' ? 'audio/*' : 'video/*'}
              onChange={handleFileChange}
              className="text-xs"
              style={{ color: palette.muted }}
            />
          </div>
        )}

        <textarea
          rows={3}
          required
          maxLength={1200}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.modules.wishPlaceholder}
          className="w-full px-4 py-3 rounded-xl border text-sm bg-transparent"
          style={{
            borderColor: palette.dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
            color: palette.text,
          }}
        />

        {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
        {statusNotice && <p className="text-xs text-emerald-600">{statusNotice}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white inline-flex items-center gap-2 cursor-pointer"
          style={{ backgroundColor: palette.primary }}
        >
          <Send className="w-4 h-4" />
          <span>{t.modules.submitWish}</span>
        </button>
      </form>

      {/* Hanging Wishes / Wall Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {wishes.map((w) => (
          <div
            key={w.id}
            className="p-5 rounded-2xl border space-y-3"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: palette.muted }}>
              <span className="font-semibold" style={{ color: palette.text }}>
                {w.authorName}
              </span>
              <span className="capitalize">{w.type}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: palette.muted }}>
              {w.message}
            </p>
            {w.mediaUrl && w.type === 'audio' && <audio controls src={w.mediaUrl} className="w-full" />}
            {w.mediaUrl && w.type === 'video' && (
              <video controls src={w.mediaUrl} className="w-full rounded-xl max-h-48" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
