import React, { useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, Eye, Flame, Sparkles } from 'lucide-react';
import { Birthday3DStage } from '../components/three/Birthday3DStage';
import { BirthdayBook3D } from '../components/three/BirthdayBook3D';
import { useApp } from '../context/AppContext';
import { BIRTHDAY_TEMPLATES, SAMPLE_EXPERIENCES } from '../data/templates';
import { BirthdayTemplate } from '../types/birthday';

export const HomePage: React.FC = () => {
  const { t, lang, navigate } = useApp();
  const [heroCandlesLit, setHeroCandlesLit] = useState(true);
  const [heroStageView, setHeroStageView] = useState<'book' | 'cake'>('book');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [previewSampleIdx, setPreviewSampleIdx] = useState(0);

  const isAr = lang === 'ar';
  const featuredTemplates =
    selectedCat === 'all'
      ? BIRTHDAY_TEMPLATES.slice(0, 6)
      : BIRTHDAY_TEMPLATES.filter((tpl) => tpl.category === selectedCat).slice(0, 6);

  const activeSample = SAMPLE_EXPERIENCES[previewSampleIdx] || SAMPLE_EXPERIENCES[0];

  const handleUseTemplate = (tpl: BirthdayTemplate) => {
    navigate(`/create?template=${tpl.id}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-stone-900">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16 md:pt-14 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <p className="text-xs font-medium text-[#C83E5B]">
              {t.hero.eyebrow}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl xl:text-[54px] font-semibold leading-[1.1] tracking-tight text-stone-950 [text-wrap:balance]">
              {t.hero.headline}
            </h1>
            <p className="text-base text-stone-600 leading-relaxed max-w-xl">
              {t.hero.subheadline}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="px-6 py-3 rounded-xl bg-[#C83E5B] text-white text-sm font-semibold hover:bg-[#b0324d] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{t.hero.ctaPrimary}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/b/${activeSample.id}`)}
                className="px-6 py-3 rounded-xl bg-white border border-stone-200 text-stone-800 text-sm font-semibold hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.hero.ctaSecondary}
              </button>
            </div>

            <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-500">
              <span>{t.hero.statsLabel1}</span>
              <span aria-hidden="true">·</span>
              <span>{t.hero.statsLabel2}</span>
              <span aria-hidden="true">·</span>
              <span>{t.hero.statsLabel3}</span>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setHeroStageView('book')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    heroStageView === 'book'
                      ? 'bg-white text-stone-950 shadow-xs'
                      : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isAr ? 'كتاب الذكريات 3D' : '3D Memory Book'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHeroStageView('cake')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    heroStageView === 'cake'
                      ? 'bg-white text-stone-950 shadow-xs'
                      : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>{isAr ? 'كعكة عيد الميلاد 3D' : '3D Birthday Cake'}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/b/${activeSample.id}`)}
                className="text-xs font-medium text-[#C83E5B] hover:underline cursor-pointer"
              >
                {t.book.openBook}
              </button>
            </div>

            {heroStageView === 'book' ? (
              <BirthdayBook3D
                recipientName={activeSample.recipientName}
                recipientAge={activeSample.recipientAge}
                bookTitle={activeSample.themeConfig.bookTitle}
                birthdayDate={activeSample.birthdayDate}
                coverColor={activeSample.themeConfig.bookCoverColor || '#7A1F33'}
                paperColor={activeSample.themeConfig.paperColor || '#FBF7EE'}
                accentColor="#DFC07C"
                lang={lang}
                onOpenClick={() => navigate(`/b/${activeSample.id}`)}
                heightClass="h-[380px] md:h-[470px]"
              />
            ) : (
              <Birthday3DStage
                mode="hero"
                cakeDesign="luxury-tiered"
                primaryColor="#C83E5B"
                secondaryColor="#F3B6C2"
                accentColor="#E9C46A"
                candlesLit={heroCandlesLit}
                onBlowCandles={() => setHeroCandlesLit(false)}
                onRelightCandles={() => setHeroCandlesLit(true)}
                recipientName={activeSample.recipientName}
                recipientAge={activeSample.recipientAge}
                lang={lang}
                heightClass="h-[380px] md:h-[470px]"
              />
            )}
          </div>
        </div>
      </section>

      {/* Live Sample Preview Strip */}
      <section className="border-y border-stone-200 bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950">
                {isAr ? 'معاينة حية لصفحة عيد ميلاد' : 'Live Interactive Birthday Preview'}
              </h2>
              <p className="text-sm text-stone-600 mt-2 max-w-2xl">
                {isAr
                  ? 'استكشف صفحة عيد ميلاد كاملة قبل التسجيل — شاملة الكعكة ثلاثية الأبعاد، الصور الموسيقية، والألعاب.'
                  : 'Explore a complete sample birthday experience without registering — test the 3D cake, music gallery, scratch cards, and wishing tree.'}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl shrink-0 self-start">
              {SAMPLE_EXPERIENCES.map((sample, idx) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => setPreviewSampleIdx(idx)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    previewSampleIdx === idx
                      ? 'bg-white text-stone-950 shadow-xs'
                      : 'text-stone-600 hover:text-stone-950'
                  }`}
                >
                  {sample.recipientName} ({sample.language.toUpperCase()})
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            style={{
              backgroundColor: activeSample.themeConfig.palette.bg,
              borderColor: 'rgba(0,0,0,0.08)',
            }}
          >
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-medium" style={{ color: activeSample.themeConfig.palette.primary }}>
                {activeSample.language === 'ar' ? 'نموذج احتفال حي' : 'Live Sample Celebration'} ·{' '}
                {activeSample.sections.filter((s) => s.visible).length}{' '}
                {isAr ? 'أقسام تفاعلية' : 'interactive chapters'}
              </p>
              <h3
                className="font-display text-3xl font-semibold"
                style={{ color: activeSample.themeConfig.palette.text }}
              >
                {activeSample.themeConfig.headlineText}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: activeSample.themeConfig.palette.muted }}>
                {activeSample.themeConfig.introMessage}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/b/${activeSample.id}`)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white inline-flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: activeSample.themeConfig.palette.primary }}
                >
                  <Eye className="w-4 h-4" />
                  <span>{t.templatesSection.livePreview}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/create?template=${activeSample.templateId}`)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium border bg-white text-stone-900 border-stone-200 hover:bg-stone-50 cursor-pointer"
                >
                  {t.templatesSection.useTemplate}
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {activeSample.memories.slice(0, 3).map((mem) => (
                <div
                  key={mem.id}
                  className="rounded-xl overflow-hidden border bg-white border-stone-200/80"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                    <img
                      src={mem.photoUrl}
                      alt={mem.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-stone-900 truncate">{mem.title}</p>
                    <p className="text-[11px] text-stone-500 font-mono-tabular mt-0.5">{mem.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950">
            {t.howItWorks.title}
          </h2>
          <p className="text-sm text-stone-600 mt-2">{t.howItWorks.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.howItWorks.steps.map((step) => (
            <div key={step.num} className="bg-white border border-stone-200 rounded-2xl p-6 space-y-3">
              <p className="font-mono-tabular text-sm font-semibold text-[#C83E5B]">{step.num}</p>
              <h3 className="text-lg font-semibold text-stone-950">{step.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Birthday Template Gallery Preview */}
      <section className="border-y border-stone-200 bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950">
                {t.templatesSection.title}
              </h2>
              <p className="text-sm text-stone-600 mt-2 max-w-2xl">
                {t.templatesSection.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/templates')}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-900 hover:bg-stone-50 whitespace-nowrap self-start cursor-pointer"
            >
              {t.templatesSection.viewAll}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-xl w-fit mb-8">
            {(['all', 'romantic', 'luxury', 'floral', 'playful', 'editorial', 'night'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCat === cat
                    ? 'bg-white text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                {t.templatesSection.categories[cat]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-2xl border border-stone-200 overflow-hidden bg-[#FAF8F6] flex flex-col"
              >
                <div
                  className="h-44 p-5 flex flex-col justify-between relative"
                  style={{ backgroundColor: tpl.palette.bg }}
                >
                  <div className="flex items-center justify-between text-xs" style={{ color: tpl.palette.muted }}>
                    <span>{t.templatesSection.categories[tpl.category]}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.palette.primary }} />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.palette.secondary }} />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.palette.accent }} />
                    </div>
                  </div>
                  <div>
                    <p
                      className="font-display text-2xl font-semibold"
                      style={{ color: tpl.palette.text }}
                    >
                      {isAr ? tpl.nameAr : tpl.nameEn}
                    </p>
                  </div>
                </div>
                <div className="p-5 bg-white flex-1 flex flex-col justify-between gap-4">
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {isAr ? tpl.descriptionAr : tpl.descriptionEn}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/templates')}
                      className="flex-1 py-2 px-3 rounded-lg border border-stone-200 text-xs font-medium text-stone-800 hover:bg-stone-50 cursor-pointer"
                    >
                      {t.templatesSection.livePreview}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(tpl)}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#C83E5B] text-white text-xs font-medium hover:bg-[#b0324d] cursor-pointer"
                    >
                      {t.templatesSection.useTemplate}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950">
            {t.featuresSection.title}
          </h2>
          <p className="text-sm text-stone-600 mt-2">{t.featuresSection.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {t.featuresSection.items.map((item, idx) => (
            <div key={idx} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-2">
              <p className="text-xs font-mono-tabular text-[#C83E5B]">
                {String(idx + 1).padStart(2, '0')}.
              </p>
              <h3 className="text-sm font-semibold text-stone-950">{item.title}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free Platform Transparency */}
      <section className="border-y border-stone-200 bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#C83E5B]">
              <Sparkles className="w-4 h-4" />
              <span>{t.hero.statsLabel3}</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950">
              {t.freeSection.title}
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">{t.freeSection.subtitle}</p>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="px-5 py-2.5 rounded-xl bg-[#C83E5B] text-white text-sm font-medium hover:bg-[#b0324d] cursor-pointer"
            >
              {t.hero.ctaPrimary}
            </button>
          </div>
          <div className="md:col-span-6 bg-[#FAF8F6] border border-stone-200 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-semibold text-stone-950">{t.freeSection.limitsTitle}</h3>
            <ul className="space-y-2.5 text-sm text-stone-600">
              <li>01 · {t.freeSection.limit1}</li>
              <li>02 · {t.freeSection.limit2}</li>
              <li>03 · {t.freeSection.limit3}</li>
              <li>04 · {t.freeSection.limit4}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950 mb-8 text-center">
          {t.faq.title}
        </h2>
        <div className="space-y-3">
          {t.faq.items.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-start flex items-center justify-between gap-4 font-medium text-sm text-stone-950 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-stone-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            <span className="font-display text-lg font-semibold text-stone-900">{t.brand}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{t.footer.tagline}</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => navigate('/templates')} className="hover:text-stone-900 cursor-pointer">
              {t.footer.templates}
            </button>
            <button type="button" onClick={() => navigate('/create')} className="hover:text-stone-900 cursor-pointer">
              {t.footer.quickCreate}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} className="hover:text-stone-900 cursor-pointer">
              {t.footer.dashboard}
            </button>
            <span>{t.footer.rights}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
