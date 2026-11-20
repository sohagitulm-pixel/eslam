import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BIRTHDAY_TEMPLATES } from '../data/templates';
import {
  adminFetchAllData,
  adminSavePlatformSettings,
  adminUpdateReportStatus,
  DEFAULT_PLATFORM_SETTINGS,
  deleteExperienceById,
  saveExperience,
} from '../services/firestoreService';
import {
  BirthdayExperience,
  ContentReport,
  PlatformSettings,
  UserProfile,
} from '../types/birthday';

type AdminTab = 'overview' | 'reports' | 'experiences' | 'templates' | 'settings';

export const AdminDashboardPage: React.FC = () => {
  const { t, isAdmin, navigate } = useApp();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [experiences, setExperiences] = useState<BirthdayExperience[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    adminFetchAllData()
      .then((res) => {
        setUsers(res.users);
        setExperiences(res.experiences);
        setReports(res.reports);
        setSettings(res.settings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-4">
          <Shield className="w-8 h-8 mx-auto text-[#C83E5B]" />
          <h2 className="font-display text-2xl font-semibold text-stone-900">
            Admin Access Required
          </h2>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl bg-[#C83E5B] text-white text-xs font-semibold cursor-pointer"
          >
            {t.common.backHome}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950">
            {t.admin.title}
          </h1>
          <p className="text-sm text-stone-600 mt-1">{t.admin.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 bg-stone-200/70 rounded-xl w-fit">
          {(
            [
              ['overview', t.admin.tabOverview],
              ['reports', t.admin.tabReports],
              ['experiences', t.admin.tabExperiences],
              ['templates', t.admin.tabTemplates],
              ['settings', t.admin.tabSettings],
            ] as [AdminTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                tab === id ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-stone-500">{t.common.loading}</div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Registered Users', val: users.length },
                  { label: 'Birthday Experiences', val: experiences.length },
                  { label: 'Published Pages', val: experiences.filter((e) => e.published).length },
                  { label: 'Open Moderation Reports', val: reports.filter((r) => r.status === 'open').length },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white border border-stone-200 rounded-2xl p-6">
                    <p className="text-xs text-stone-500">{stat.label}</p>
                    <p className="font-mono-tabular text-3xl font-semibold text-stone-950 mt-2">
                      {stat.val}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'reports' && (
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                {reports.length === 0 ? (
                  <p className="p-8 text-center text-sm text-stone-500">No content reports in queue.</p>
                ) : (
                  <table className="w-full text-sm text-start">
                    <thead className="bg-stone-50 border-b border-stone-200 text-xs text-stone-500">
                      <tr>
                        <th className="py-3 px-4 text-start">Experience</th>
                        <th className="py-3 px-4 text-start">Reason</th>
                        <th className="py-3 px-4 text-start">Status</th>
                        <th className="py-3 px-4 text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {reports.map((rep) => (
                        <tr key={rep.id}>
                          <td className="py-3 px-4 font-medium">{rep.experienceTitle}</td>
                          <td className="py-3 px-4 text-stone-600">{rep.reason}</td>
                          <td className="py-3 px-4 capitalize text-xs">{rep.status}</td>
                          <td className="py-3 px-4 text-end space-x-2">
                            <button
                              type="button"
                              onClick={async () => {
                                await adminUpdateReportStatus(rep.id, 'resolved');
                                setReports((prev) =>
                                  prev.map((r) => (r.id === rep.id ? { ...r, status: 'resolved' } : r))
                                );
                              }}
                              className="px-3 py-1 rounded-lg bg-[#C83E5B] text-white text-xs cursor-pointer"
                            >
                              {t.admin.resolve}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await adminUpdateReportStatus(rep.id, 'dismissed');
                                setReports((prev) =>
                                  prev.map((r) => (r.id === rep.id ? { ...r, status: 'dismissed' } : r))
                                );
                              }}
                              className="px-3 py-1 rounded-lg border border-stone-200 text-xs cursor-pointer"
                            >
                              {t.admin.dismiss}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'experiences' && (
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200 text-xs text-stone-500">
                    <tr>
                      <th className="py-3 px-4 text-start">Title</th>
                      <th className="py-3 px-4 text-start">Recipient</th>
                      <th className="py-3 px-4 text-start">Visibility</th>
                      <th className="py-3 px-4 text-end">Views</th>
                      <th className="py-3 px-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {experiences.map((exp) => (
                      <tr key={exp.id}>
                        <td className="py-3 px-4 font-medium">{exp.title}</td>
                        <td className="py-3 px-4 text-stone-600">{exp.recipientName}</td>
                        <td className="py-3 px-4 text-xs capitalize">
                          {exp.published ? exp.visibility : 'draft'}
                        </td>
                        <td className="py-3 px-4 text-end font-mono-tabular">{exp.viewCount || 0}</td>
                        <td className="py-3 px-4 text-end space-x-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const next = { ...exp, published: !exp.published };
                              await saveExperience(next, false);
                              setExperiences((prev) => prev.map((x) => (x.id === exp.id ? next : x)));
                            }}
                            className="px-3 py-1 rounded-lg border border-stone-200 text-xs cursor-pointer"
                          >
                            {exp.published ? t.builder.unpublish : t.builder.publishNow}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteExperienceById(exp.id);
                              setExperiences((prev) => prev.filter((x) => x.id !== exp.id));
                            }}
                            className="px-3 py-1 rounded-lg border border-red-200 text-red-600 text-xs cursor-pointer"
                          >
                            {t.dashboard.delete}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'templates' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BIRTHDAY_TEMPLATES.map((tpl) => (
                  <div key={tpl.id} className="bg-white border border-stone-200 rounded-xl p-4 space-y-1">
                    <p className="font-semibold text-sm text-stone-900">{tpl.nameEn}</p>
                    <p className="text-xs text-stone-500">{tpl.nameAr} · {tpl.category}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'settings' && (
              <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-lg space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Max Photos per Experience
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={settings.maxPhotosPerExperience}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, maxPhotosPerExperience: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Max Upload File Size (MB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={settings.maxFileSizeMb}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, maxFileSizeMb: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Max Free Storage per User (MB)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={settings.maxStoragePerUserMb}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, maxStoragePerUserMb: Number(e.target.value) }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm font-mono-tabular"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.moderationRequiredDefault}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, moderationRequiredDefault: e.target.checked }))
                    }
                    className="accent-[#C83E5B]"
                  />
                  <span>Require moderation on guest wishes by default</span>
                </label>

                <button
                  type="button"
                  onClick={async () => {
                    await adminSavePlatformSettings(settings);
                    setSavedNotice(true);
                    window.setTimeout(() => setSavedNotice(false), 2000);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#C83E5B] text-white text-xs font-semibold cursor-pointer"
                >
                  {t.admin.saveSettings}
                </button>
                {savedNotice && <p className="text-xs text-emerald-700">Platform settings saved.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
