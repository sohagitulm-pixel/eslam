import React, { useState } from 'react';
import { Eye, Sparkles, X } from 'lucide-react';
import { Birthday3DStage } from '../components/three/Birthday3DStage';
import { useApp } from '../context/AppContext';
import { BIRTHDAY_TEMPLATES } from '../data/templates';
import { BirthdayTemplate } from '../types/birthday';

export const TemplatesPage: React.FC = () => {
  const { t, lang, navigate } = useApp();
  const [category, setCategory] = useState<string>('all');
  const [previewTpl, setPreviewTpl] = useState<BirthdayTemplate | null>(null);
  const isAr = lang === 'ar';

  const list =
    category === 'all'
      ? BIRTHDAY_TEMPLATES
      : BIRTHDAY_TEMPLATES.filter((tpl) => tpl.category === category);

  return (
    <div className="min-h-screen bg-[#FAF8F6] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-8">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-stone-950">
            {t.templatesSection.title}
          </h1>
          <p className="text-sm text-stone-600 mt-3">{t.templatesSection.subtitle}</p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/70 rounded-xl w-fit mb-10">
          {(['all', 'romantic', 'luxury', 'floral', 'playful', 'editorial', 'night'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                category === cat ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              {t.templatesSection.categories[cat]}
            </button>
          ))}
        </div>

        {/* All 15 Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((tpl, index) => (
            <div
              key={tpl.id}
              className="rounded-2xl border border-stone-200 overflow-hidden bg-white flex flex-col"
            >
              <div
                className="h-48 p-5 flex flex-col justify-between border-b border-stone-100"
                style={{ backgroundColor: tpl.palette.bg }}
              >
                <div className="flex items-center justify-between text-xs" style={{ color: tpl.palette.muted }}>
                  <span>
                    {String(index + 1).padStart(2, '0')}. · {t.templatesSection.categories[tpl.category]}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: tpl.palette.primary }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: tpl.palette.secondary }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: tpl.palette.accent }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-display text-2xl font-semibold" style={{ color: tpl.palette.text }}>
                    {isAr ? tpl.nameAr : tpl.nameEn}
                  </h3>
                  <p className="text-xs" style={{ color: tpl.palette.muted }}>
                    {t.book.cakeStyles[tpl.cakeDesign] || tpl.cakeDesign} · {tpl.effectsConfig.roses ? '3D Roses' : '3D Balloons'} ·{' '}
                    {tpl.effectsConfig.fireworks ? 'Fireworks' : 'Sparkles'}
                  </p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <p className="text-sm text-stone-600 leading-relaxed">
                  {isAr ? tpl.descriptionAr : tpl.descriptionEn}
                </p>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPreviewTpl(tpl)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 text-xs font-medium text-stone-800 hover:bg-stone-50 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.templatesSection.livePreview}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/create?template=${tpl.id}`)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#C83E5B] text-white text-xs font-medium hover:bg-[#b0324d] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.templatesSection.useTemplate}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive 3D Template Preview Modal */}
      {previewTpl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden border border-stone-200">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-semibold text-stone-950">
                  {isAr ? previewTpl.nameAr : previewTpl.nameEn}
                </h3>
                <p className="text-xs text-stone-500">
                  {isAr ? previewTpl.descriptionAr : previewTpl.descriptionEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTpl(null)}
                className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <Birthday3DStage
                mode="hero"
                cakeDesign={previewTpl.cakeDesign}
                candleStyle={previewTpl.candleStyle}
                primaryColor={previewTpl.palette.primary}
                secondaryColor={previewTpl.palette.secondary}
                accentColor={previewTpl.palette.accent}
                darkBg={previewTpl.palette.dark}
                bgHex={previewTpl.palette.bg}
                effects={previewTpl.effectsConfig}
                recipientName={isAr ? previewTpl.nameAr : previewTpl.nameEn}
                lang={lang}
                heightClass="h-[380px] md:h-[440px]"
              />
            </div>
            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreviewTpl(null)}
                className="px-4 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 cursor-pointer"
              >
                {t.common.close}
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = previewTpl.id;
                  setPreviewTpl(null);
                  navigate(`/create?template=${id}`);
                }}
                className="px-5 py-2 rounded-lg bg-[#C83E5B] text-white text-xs font-medium hover:bg-[#b0324d] cursor-pointer"
              >
                {t.templatesSection.useTemplate}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
