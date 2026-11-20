import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  CopyPlus,
  Edit3,
  Eye,
  LogIn,
  LogOut,
  MessageSquare,
  Plus,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import {
  deleteExperienceById,
  deleteWish,
  getAllWishesForOwner,
  getUserExperiences,
  moderateWishStatus,
  saveExperience,
} from '../services/firestoreService';
import { BirthdayExperience, BirthdayWish } from '../types/birthday';

export const DashboardPage: React.FC = () => {
  const { t, lang, user, userProfile, authReady, signInWithGoogle, signOut, navigate, setActiveDraft, authError } =
    useApp();
  const isAr = lang === 'ar';

  const [experiences, setExperiences] = useState<BirthdayExperience[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ title: string; dataUrl: string; url: string } | null>(null);
  const [wishesModalExp, setWishesModalExp] = useState<BirthdayExperience | null>(null);
  const [wishes, setWishes] = useState<BirthdayWish[]>([]);

  const loadExperiences = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await getUserExperiences(user.uid);
      setExperiences(list);
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadExperiences();
    } else {
      setExperiences([]);
    }
  }, [user]);

  const handleTogglePublish = async (exp: BirthdayExperience) => {
    const updated = { ...exp, published: !exp.published };
    await saveExperience(updated, false);
    setExperiences((prev) => prev.map((x) => (x.id === exp.id ? updated : x)));
  };

  const handleDuplicate = async (exp: BirthdayExperience) => {
    if (!user) return;
    const copyId = `bday_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const clone: BirthdayExperience = {
      ...exp,
      id: copyId,
      ownerId: user.uid,
      title: `${exp.title} (Copy)`,
      published: false,
      viewCount: 0,
    };
    await saveExperience(clone, true);
    setExperiences((prev) => [clone, ...prev]);
  };

  const handleDelete = async (id: string) => {
    await deleteExperienceById(id);
    setExperiences((prev) => prev.filter((x) => x.id !== id));
  };

  const handleOpenQr = async (exp: BirthdayExperience) => {
    const url = `${window.location.origin}${window.location.pathname}#/b/${exp.id}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 260, margin: 2 });
    setQrModal({ title: exp.title, dataUrl, url });
  };

  const handleOpenWishes = async (exp: BirthdayExperience) => {
    setWishesModalExp(exp);
    if (!user) return;
    try {
      const list = await getAllWishesForOwner(exp.id, user.uid);
      setWishes(list);
    } catch {
      setWishes([]);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F6] text-sm text-stone-600">
        {t.common.loading}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-5">
          <h1 className="font-display text-3xl font-semibold text-stone-950">
            {t.dashboard.title}
          </h1>
          <p className="text-sm text-stone-600 leading-relaxed">{t.dashboard.signInPrompt}</p>
          {authError && <p className="text-xs text-red-600">{authError}</p>}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full py-3 px-5 rounded-xl bg-[#C83E5B] text-white text-sm font-semibold hover:bg-[#b0324d] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{isAr ? 'تسجيل الدخول بحساب جوجل' : 'Continue with Google'}</span>
          </button>
          <p className="text-xs text-stone-500">
            {isAr
              ? 'يمكنك أيضاً تجربة النماذج الحية أو البدء بالإنشاء السريع بدون تسجيل.'
              : 'You can also explore sample celebrations or try the Quick Creator without signing in.'}
          </p>
        </div>
      </div>
    );
  }

  const storageMb = ((userProfile?.storageUsedBytes || 0) / (1024 * 1024)).toFixed(2);

  return (
    <div className="min-h-screen bg-[#FAF8F6] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Top Profile & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-stone-200 rounded-2xl p-6">
          <div>
            <h1 className="font-display text-3xl font-semibold text-stone-950">{t.dashboard.title}</h1>
            <p className="text-sm text-stone-600 mt-1">
              {user.displayName || user.email} · {t.dashboard.storageUsed}:{' '}
              <span className="font-mono-tabular">{storageMb} / 25.00 MB</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="px-4 py-2.5 rounded-xl bg-[#C83E5B] text-white text-xs font-semibold hover:bg-[#b0324d] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.dashboard.newBirthday}</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.nav.signOut}</span>
            </button>
          </div>
        </div>

        {/* Experiences List */}
        {loading ? (
          <div className="text-center py-12 text-sm text-stone-500">{t.common.loading}</div>
        ) : experiences.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-4">
            <p className="text-sm text-stone-600">{t.dashboard.noExperiences}</p>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="px-5 py-2.5 rounded-xl bg-[#C83E5B] text-white text-sm font-medium cursor-pointer"
            >
              {t.dashboard.newBirthday}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp) => {
              const url = `${window.location.origin}${window.location.pathname}#/b/${exp.id}`;
              return (
                <div
                  key={exp.id}
                  className="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col"
                >
                  <div
                    className="h-36 p-5 flex flex-col justify-between border-b border-stone-100"
                    style={{ backgroundColor: exp.themeConfig.palette.bg }}
                  >
                    <div
                      className="flex items-center justify-between text-xs font-mono-tabular"
                      style={{ color: exp.themeConfig.palette.muted }}
                    >
                      <span>{exp.published ? t.dashboard.published : t.dashboard.draft}</span>
                      <span>
                        {exp.viewCount || 0} {t.dashboard.views}
                      </span>
                    </div>
                    <h3
                      className="font-display text-2xl font-semibold truncate"
                      style={{ color: exp.themeConfig.palette.text }}
                    >
                      {exp.title}
                    </h3>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="text-xs text-stone-500 font-mono-tabular">
                      {exp.recipientName} · {exp.birthdayDate} · {exp.visibility}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDraft(exp);
                          navigate(`/builder/${exp.id}`);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-800 hover:bg-stone-50 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{t.dashboard.edit}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/b/${exp.id}`)}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-800 hover:bg-stone-50 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t.dashboard.preview}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePublish(exp)}
                        className="px-3 py-1.5 rounded-lg bg-[#C83E5B] text-white text-xs font-medium hover:bg-[#b0324d] cursor-pointer"
                      >
                        {exp.published ? t.builder.unpublish : t.builder.publishNow}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(url);
                          setCopiedId(exp.id);
                          window.setTimeout(() => setCopiedId(null), 1600);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === exp.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === exp.id ? t.dashboard.copied : t.dashboard.copyLink}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenQr(exp)}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{t.dashboard.qrCode}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenWishes(exp)}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t.dashboard.moderateWishes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(exp)}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CopyPlus className="w-3.5 h-3.5" />
                        <span>{t.dashboard.duplicate}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(exp.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.dashboard.delete}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 border border-stone-200">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-stone-900 truncate">
                {qrModal.title}
              </h3>
              <button type="button" onClick={() => setQrModal(null)} className="p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={qrModal.dataUrl} alt="QR Code" className="w-52 h-52 mx-auto rounded-xl border border-stone-100" />
            <a
              href={qrModal.dataUrl}
              download="birthday-qr.png"
              className="block w-full py-2.5 rounded-xl bg-[#C83E5B] text-white text-xs font-semibold"
            >
              {t.common.downloadQr}
            </a>
          </div>
        </div>
      )}

      {/* Wishes Moderation Modal */}
      {wishesModalExp && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-stone-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-display text-2xl font-semibold text-stone-900">
                {t.dashboard.moderateWishes}: {wishesModalExp.recipientName}
              </h3>
              <button type="button" onClick={() => setWishesModalExp(null)} className="p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {wishes.length === 0 ? (
              <p className="text-sm text-stone-500 py-6 text-center">
                {isAr ? 'لا توجد أمنيات مرسلة حتى الآن.' : 'No guest wishes submitted yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {wishes.map((w) => (
                  <div key={w.id} className="p-4 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-stone-900">{w.authorName}</span>
                      <span className="capitalize">{w.status}</span>
                    </div>
                    <p className="text-sm text-stone-700">{w.message}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await moderateWishStatus(wishesModalExp.id, w.id, 'approved');
                          setWishes((prev) =>
                            prev.map((x) => (x.id === w.id ? { ...x, status: 'approved' } : x))
                          );
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs cursor-pointer"
                      >
                        {t.dashboard.approve}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await moderateWishStatus(wishesModalExp.id, w.id, 'rejected');
                          setWishes((prev) =>
                            prev.map((x) => (x.id === w.id ? { ...x, status: 'rejected' } : x))
                          );
                        }}
                        className="px-3 py-1 rounded-lg border border-stone-200 text-xs cursor-pointer"
                      >
                        {t.dashboard.reject}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteWish(wishesModalExp.id, w.id);
                          setWishes((prev) => prev.filter((x) => x.id !== w.id));
                        }}
                        className="px-3 py-1 rounded-lg border border-red-200 text-red-600 text-xs cursor-pointer"
                      >
                        {t.dashboard.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
