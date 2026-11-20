import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flag,
  Flame,
  Gift,
  Heart,
  List,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';
import { getT } from '../../i18n/translations';
import { BirthdayExperience, Language, SectionType } from '../../types/birthday';
import {
  formatAgeNumber,
  formatOrdinalAgeLabel,
  getBodyFontFamily,
  getHeadingFontFamily,
  parseValidAge,
} from '../../utils/ageUtils';
import { AudioControllerBar } from '../modules/AudioControllerBar';
import { BirthdayQuizModule } from '../modules/BirthdayQuizModule';
import { FutureLetterModule } from '../modules/FutureLetterModule';
import { GiftBoxesModule } from '../modules/GiftBoxesModule';
import { MusicalMemoriesModule } from '../modules/MusicalMemoriesModule';
import { PhotoPuzzleModule } from '../modules/PhotoPuzzleModule';
import { ScratchCardsModule } from '../modules/ScratchCardsModule';
import { SpinWheelModule } from '../modules/SpinWheelModule';
import { WishingTreeAndWallModule } from '../modules/WishingTreeAndWallModule';
import { Birthday3DStage } from '../three/Birthday3DStage';
import { BirthdayBook3D } from '../three/BirthdayBook3D';

type BookChapterId =
  | 'cover'
  | 'intro'
  | 'cake'
  | 'memories'
  | 'gifts'
  | 'friends'
  | 'games'
  | 'final';

interface BookChapter {
  id: BookChapterId;
  titleEn: string;
  titleAr: string;
  order: number;
  memberTypes: SectionType[];
}

interface BirthdayBookViewerProps {
  experience: BirthdayExperience;
  viewLang: Language;
  onToggleLang?: () => void;
  isSample?: boolean;
  onOpenReport?: () => void;
  embeddedPreview?: boolean;
  initialOpen?: boolean;
}

const CornerOrnament: React.FC<{ color: string; className?: string }> = ({ color, className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    className={`w-8 h-8 pointer-events-none opacity-65 ${className}`}
    fill="none"
    aria-hidden="true"
  >
    <path d="M4 40V8C4 5.8 5.8 4 8 4H40" stroke={color} strokeWidth="1.6" />
    <path d="M10 28V12C10 10.9 10.9 10 12 10H28" stroke={color} strokeWidth="1.1" strokeOpacity="0.7" />
    <circle cx="15" cy="15" r="2.2" fill={color} fillOpacity="0.75" />
  </svg>
);

export const BirthdayBookViewer: React.FC<BirthdayBookViewerProps> = ({
  experience,
  viewLang,
  onToggleLang,
  isSample = false,
  onOpenReport,
  embeddedPreview = false,
  initialOpen = false,
}) => {
  const [bookOpen, setBookOpen] = useState(initialOpen);
  const [openingAnim, setOpeningAnim] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  const [turnDir, setTurnDir] = useState<1 | -1>(1);
  const [turnKey, setTurnKey] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);

  // Cake & Make-a-Wish states
  const [candlesLit, setCandlesLit] = useState(true);
  const [wishInput, setWishInput] = useState('');
  const [wishCountdown, setWishCountdown] = useState<number | null>(null);
  const [wishRevealed, setWishRevealed] = useState(false);
  const [fireworkTrigger, setFireworkTrigger] = useState(0);

  // Sub-tabs inside consolidated book chapters
  const [memoriesView, setMemoriesView] = useState<'gallery' | 'timeline'>('gallery');
  const [friendsTab, setFriendsTab] = useState<'tree' | 'wall' | 'letter'>('tree');
  const [gamesTab, setGamesTab] = useState<'scratch' | 'quiz' | 'wheel' | 'puzzle'>('scratch');

  const touchStartXRef = useRef<number | null>(null);

  const isAr = viewLang === 'ar';
  const t = getT(viewLang);
  const tc = experience.themeConfig;
  const palette = tc.palette;
  const bookCoverColor = tc.bookCoverColor || (palette.dark ? '#231A3E' : palette.primary);
  const paperColor = tc.paperColor || (palette.dark ? palette.surface : '#FCF8F0');
  const goldAccent = palette.accent || '#D4AF37';
  const decorations = tc.decorations || {
    corners: true,
    stars: true,
    florals: true,
    ribbons: true,
  };

  const headingFont = getHeadingFontFamily(tc.headingFont, viewLang);
  const bodyFont = getBodyFontFamily(tc.bodyFont, viewLang);
  const validAge = parseValidAge(experience.recipientAge);

  // Build dynamic ordered chapters from experience.sections
  const chapters = useMemo<BookChapter[]>(() => {
    const visibleMap = new Map<SectionType, { visible: boolean; order: number }>();
    experience.sections.forEach((s) => {
      visibleMap.set(s.type, { visible: s.visible, order: s.order });
    });

    const isVis = (type: SectionType) => visibleMap.get(type)?.visible ?? true;
    const minOrder = (types: SectionType[], fallback: number) => {
      const orders = types
        .filter((tp) => isVis(tp))
        .map((tp) => visibleMap.get(tp)?.order ?? fallback);
      return orders.length ? Math.min(...orders) : fallback;
    };

    const result: BookChapter[] = [];

    // Page 1: Dedication / Cover Spread (always included as Page 1 if welcome is visible or as fallback)
    if (isVis('welcome') || experience.sections.every((s) => !s.visible)) {
      result.push({
        id: 'cover',
        titleEn: 'Cover Dedication',
        titleAr: 'صفحة الإهداء',
        order: -1,
        memberTypes: ['welcome'],
      });
    }

    if (isVis('intro')) {
      result.push({
        id: 'intro',
        titleEn: 'Opening Message',
        titleAr: 'الرسالة الافتتاحية',
        order: minOrder(['intro'], 1),
        memberTypes: ['intro'],
      });
    }

    if (isVis('cake')) {
      result.push({
        id: 'cake',
        titleEn: 'The Birthday Cake',
        titleAr: 'كعكة عيد الميلاد',
        order: minOrder(['cake'], 2),
        memberTypes: ['cake'],
      });
    }

    if (isVis('memories') || isVis('timeline')) {
      result.push({
        id: 'memories',
        titleEn: 'Memory Gallery',
        titleAr: 'ألبوم الذكريات',
        order: minOrder(['memories', 'timeline'], 3),
        memberTypes: ['memories', 'timeline'],
      });
    }

    if (isVis('gifts')) {
      result.push({
        id: 'gifts',
        titleEn: 'Special Gifts',
        titleAr: 'الهدايا الخاصة',
        order: minOrder(['gifts'], 5),
        memberTypes: ['gifts'],
      });
    }

    if (isVis('wishes') || isVis('videoWall') || isVis('futureLetter')) {
      result.push({
        id: 'friends',
        titleEn: 'Friends & Family',
        titleAr: 'الأصدقاء والعائلة',
        order: minOrder(['wishes', 'videoWall', 'futureLetter'], 9),
        memberTypes: ['wishes', 'videoWall', 'futureLetter'],
      });
    }

    if (isVis('scratch') || isVis('quiz') || isVis('wheel') || isVis('puzzle')) {
      result.push({
        id: 'games',
        titleEn: 'Surprises & Games',
        titleAr: 'المفاجآت والألعاب',
        order: minOrder(['scratch', 'quiz', 'wheel', 'puzzle'], 6),
        memberTypes: ['scratch', 'quiz', 'wheel', 'puzzle'],
      });
    }

    if (isVis('finalMessage') || isVis('grandFinale') || result.length === 0) {
      result.push({
        id: 'final',
        titleEn: 'Final Message',
        titleAr: 'الرسالة الختامية',
        order: minOrder(['finalMessage', 'grandFinale'], 99),
        memberTypes: ['finalMessage', 'grandFinale'],
      });
    }

    return result.sort((a, b) => a.order - b.order);
  }, [experience.sections]);

  // Clamp page index when chapters change dynamically (e.g., inside Visual Builder)
  useEffect(() => {
    if (pageIdx >= chapters.length) {
      setPageIdx(Math.max(0, chapters.length - 1));
    }
  }, [chapters.length, pageIdx]);

  // Ensure default sub-tabs point to enabled sections
  useEffect(() => {
    const vis = (tKey: SectionType) =>
      experience.sections.find((s) => s.type === tKey)?.visible ?? true;
    if (!vis('memories') && vis('timeline')) setMemoriesView('timeline');
    if (!vis('wishes')) {
      if (vis('videoWall')) setFriendsTab('wall');
      else if (vis('futureLetter')) setFriendsTab('letter');
    }
    if (!vis('scratch')) {
      if (vis('quiz')) setGamesTab('quiz');
      else if (vis('wheel')) setGamesTab('wheel');
      else if (vis('puzzle')) setGamesTab('puzzle');
    }
  }, [experience.sections]);

  const activeChapter = chapters[pageIdx] || chapters[0];

  const goToPage = useCallback(
    (targetIdx: number) => {
      if (targetIdx < 0 || targetIdx >= chapters.length || targetIdx === pageIdx) return;
      setTurnDir(targetIdx > pageIdx ? 1 : -1);
      setTurnKey((k) => k + 1);
      setPageIdx(targetIdx);
      setTocOpen(false);
    },
    [chapters.length, pageIdx]
  );

  const goNext = useCallback(() => goToPage(pageIdx + 1), [goToPage, pageIdx]);
  const goPrev = useCallback(() => goToPage(pageIdx - 1), [goToPage, pageIdx]);

  // Keyboard Arrow Navigation (respects RTL direction!)
  useEffect(() => {
    if (!bookOpen || embeddedPreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        if (isAr) goPrev();
        else goNext();
      } else if (e.key === 'ArrowLeft') {
        if (isAr) goNext();
        else goPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bookOpen, embeddedPreview, isAr, goNext, goPrev]);

  // Open Birthday Book Choreography
  const handleOpenBook = () => {
    if (openingAnim) return;
    setOpeningAnim(true);
    setPageIdx(0);
    if (!embeddedPreview) {
      audioManager.playSfx('fireworks');
      if (!experience.audioConfig.muted) {
        audioManager.playTrack(
          experience.audioConfig.bgTrackId,
          experience.audioConfig.bgTrackTitle,
          experience.audioConfig.customAudioUrl
        );
      }
    }
    window.setTimeout(() => {
      setBookOpen(true);
      setOpeningAnim(false);
    }, 780);
  };

  // Make a Wish & Blow Out Candles with 3-2-1 Countdown
  const executeBlowOut = useCallback(() => {
    setCandlesLit(false);
    setWishCountdown(null);
    setWishRevealed(true);
    setFireworkTrigger((n) => n + 1);
    audioManager.playSfx('candle-blow');
    window.setTimeout(() => audioManager.playSfx('fireworks'), 380);
  }, []);

  const handleStartWishCountdown = () => {
    if (!candlesLit || wishCountdown !== null) return;
    setWishCountdown(3);
  };

  useEffect(() => {
    if (wishCountdown === null) return;
    if (wishCountdown <= 0) {
      executeBlowOut();
      return;
    }
    const timer = window.setTimeout(() => {
      setWishCountdown((c) => (c !== null ? c - 1 : null));
    }, 850);
    return () => window.clearTimeout(timer);
  }, [wishCountdown, executeBlowOut]);

  const handleRelight = () => {
    setCandlesLit(true);
    setWishRevealed(false);
    setWishCountdown(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) < 48) return;
    if (deltaX < 0) {
      if (isAr) goPrev();
      else goNext();
    } else {
      if (isAr) goNext();
      else goPrev();
    }
  };

  // --- CLOSED HARDCOVER 3D BOOK STAGE ---
  if (!bookOpen) {
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className={`${embeddedPreview ? 'py-6 px-3' : 'min-h-[calc(100vh-4rem)] py-10 px-4'} flex flex-col items-center justify-center`}
        style={{ backgroundColor: palette.bg, color: palette.text, fontFamily: bodyFont }}
      >
        <div className="max-w-4xl w-full space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide" style={{ color: palette.primary }}>
              {t.book.coverTitle} · {experience.birthdayDate || t.brand}
            </p>
            <h1
              className="text-3xl sm:text-5xl font-semibold [text-wrap:balance]"
              style={{ fontFamily: headingFont }}
            >
              {tc.bookTitle || tc.headlineText}
            </h1>
            {validAge !== null && (
              <p className="font-mono-tabular text-sm" style={{ color: palette.muted }}>
                {formatOrdinalAgeLabel(validAge, viewLang)}
              </p>
            )}
          </div>

          <div className="max-w-2xl mx-auto">
            <BirthdayBook3D
              recipientName={experience.recipientName}
              recipientAge={experience.recipientAge}
              bookTitle={tc.bookTitle}
              birthdayDate={experience.birthdayDate}
              coverColor={bookCoverColor}
              paperColor={paperColor}
              accentColor={goldAccent}
              darkBg={palette.dark}
              bgHex={palette.bg}
              lang={viewLang}
              isOpen={openingAnim}
              decorations={decorations}
              onOpenClick={handleOpenBook}
              heightClass={embeddedPreview ? 'h-[340px]' : 'h-[400px] sm:h-[470px]'}
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleOpenBook}
              disabled={openingAnim}
              className="px-8 py-3.5 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2.5 shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-75"
              style={{ backgroundColor: palette.primary }}
            >
              <BookOpen className="w-4 h-4" />
              <span>{t.book.openBook}</span>
            </button>
            <p className="text-xs" style={{ color: palette.muted }}>
              {t.modules.tapToBegin}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Helpers for chapter internal visibility checks
  const secVisible = (type: SectionType) =>
    experience.sections.find((s) => s.type === type)?.visible ?? true;

  // --- OPEN 3D BIRTHDAY MEMORY BOOK VIEWER ---
  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`${embeddedPreview ? 'py-4 px-2' : 'min-h-[calc(100vh-4rem)] pt-4 pb-28 px-3 sm:px-6'}`}
      style={{ backgroundColor: palette.bg, color: palette.text, fontFamily: bodyFont }}
    >
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Top Book Navigation Header */}
        <div
          className="rounded-xl border px-4 py-2.5 flex items-center justify-between gap-3 relative"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setBookOpen(false)}
              className="px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-80"
              style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)' }}
            >
              <BookOpen className="w-3.5 h-3.5" style={{ color: palette.primary }} />
              <span className="hidden sm:inline">{t.book.closeBook}</span>
            </button>
            <span
              className="text-base sm:text-lg font-semibold truncate"
              style={{ fontFamily: headingFont }}
            >
              {tc.bookTitle || experience.title}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Table of Contents Menu Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                style={{
                  borderColor: palette.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)',
                }}
              >
                <List className="w-3.5 h-3.5" />
                <span>{t.book.contents}</span>
              </button>

              {tocOpen && (
                <div
                  className={`absolute top-full mt-2 ${isAr ? 'left-0' : 'right-0'} w-64 rounded-xl border shadow-xl p-2 z-40`}
                  style={{
                    backgroundColor: palette.surface,
                    borderColor: palette.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)',
                  }}
                >
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b mb-1" style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                    <span className="text-xs font-semibold">{t.book.contents}</span>
                    <button type="button" onClick={() => setTocOpen(false)} className="p-0.5 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {chapters.map((ch, idx) => {
                      const active = idx === pageIdx;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => goToPage(idx)}
                          className="w-full text-start px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors"
                          style={{
                            backgroundColor: active ? `${palette.primary}18` : 'transparent',
                            color: active ? palette.primary : palette.text,
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          <span className="truncate">{isAr ? ch.titleAr : ch.titleEn}</span>
                          <span className="font-mono-tabular opacity-70">
                            {formatAgeNumber(idx + 1, viewLang)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {onToggleLang && (
              <button
                type="button"
                onClick={onToggleLang}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:underline"
                style={{ color: palette.primary }}
              >
                {viewLang === 'en' ? 'العربية' : 'English'}
              </button>
            )}

            {!isSample && onOpenReport && (
              <button
                type="button"
                onClick={onOpenReport}
                aria-label={t.modules.reportBtn}
                className="p-1.5 rounded-lg opacity-70 hover:opacity-100 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Physical Hardcover Book Frame */}
        <div
          className="book-perspective rounded-[24px] p-2 sm:p-3.5 shadow-xl relative"
          style={{
            backgroundColor: bookCoverColor,
            boxShadow: '0 24px 55px -16px rgba(18, 12, 16, 0.35)',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Optional Decorative Bookmark Ribbon */}
          {decorations.ribbons && (
            <div
              className={`hidden sm:block absolute -bottom-3 ${isAr ? 'left-12' : 'right-12'} w-5 h-9 rounded-b-sm shadow-md z-10`}
              style={{
                backgroundColor: goldAccent,
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
              }}
              aria-hidden="true"
            />
          )}

          {/* Stacked Paper Edges + Open Page Container */}
          <div
            key={`${activeChapter.id}-${turnKey}`}
            className={`relative rounded-2xl overflow-hidden book-paper-texture border ${
              turnDir === 1 ? 'animate-page-forward' : 'animate-page-backward'
            }`}
            style={{
              backgroundColor: paperColor,
              borderColor: palette.dark ? 'rgba(255,255,255,0.14)' : 'rgba(130,98,64,0.22)',
              boxShadow:
                'inset 14px 0 28px -18px rgba(40,25,15,0.25), inset -14px 0 28px -18px rgba(40,25,15,0.2)',
            }}
          >
            {/* Corner Ornaments */}
            {decorations.corners && (
              <>
                <CornerOrnament color={goldAccent} className="absolute top-3 left-3" />
                <CornerOrnament color={goldAccent} className="absolute top-3 right-3 rotate-90" />
                <CornerOrnament color={goldAccent} className="absolute bottom-3 left-3 -rotate-90" />
                <CornerOrnament color={goldAccent} className="absolute bottom-3 right-3 rotate-180" />
              </>
            )}

            {/* Inner Page Header Metadata */}
            <div className="px-6 sm:px-10 pt-6 pb-3 flex items-center justify-between text-xs border-b" style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.08)' : 'rgba(130,98,64,0.14)' }}>
              <span className="font-medium" style={{ color: palette.primary }}>
                {isAr ? activeChapter.titleAr : activeChapter.titleEn}
              </span>
              <span className="font-mono-tabular" style={{ color: palette.muted }}>
                {formatAgeNumber(pageIdx + 1, viewLang)} / {formatAgeNumber(chapters.length, viewLang)}
              </span>
            </div>

            {/* Active Book Page Body */}
            <div className="p-5 sm:p-10 min-h-[430px] flex flex-col justify-center">
              {/* PAGE 1 — COVER DEDICATION SPREAD */}
              {activeChapter.id === 'cover' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div
                    className="md:col-span-5 rounded-2xl p-8 text-center space-y-4 border relative book-spine-crease-left"
                    style={{
                      backgroundColor: bookCoverColor,
                      color: '#FFFDF9',
                      borderColor: goldAccent,
                    }}
                  >
                    <p className="text-xs tracking-widest uppercase" style={{ color: goldAccent }}>
                      {t.book.coverTitle}
                    </p>
                    {validAge !== null && (
                      <div
                        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 text-3xl font-bold"
                        style={{
                          borderColor: goldAccent,
                          color: goldAccent,
                          fontFamily: headingFont,
                        }}
                      >
                        {formatAgeNumber(validAge, viewLang)}
                      </div>
                    )}
                    <h2 className="text-3xl sm:text-4xl font-semibold" style={{ fontFamily: headingFont }}>
                      {experience.recipientName}
                    </h2>
                    {experience.birthdayDate && (
                      <p className="font-mono-tabular text-xs opacity-80">{experience.birthdayDate}</p>
                    )}
                  </div>

                  <div className="md:col-span-7 space-y-5 text-center md:text-start">
                    <p className="text-xs font-medium" style={{ color: palette.primary }}>
                      {t.book.coverSubtitle}
                    </p>
                    <h1
                      className="text-3xl sm:text-5xl font-semibold leading-tight [text-wrap:balance]"
                      style={{ fontFamily: headingFont }}
                    >
                      {tc.headlineText}
                    </h1>
                    {validAge !== null && (
                      <p className="text-sm font-medium" style={{ color: palette.muted }}>
                        {formatOrdinalAgeLabel(validAge, viewLang)}
                      </p>
                    )}
                    <p className="text-sm sm:text-base leading-relaxed" style={{ color: palette.muted }}>
                      {tc.introMessage}
                    </p>
                    {chapters.length > 1 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={goNext}
                          className="px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                          style={{ backgroundColor: palette.primary }}
                        >
                          <span>{t.book.nextPage}</span>
                          <ChevronRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PAGE 2 — OPENING MESSAGE */}
              {activeChapter.id === 'intro' && (
                <div className="max-w-2xl mx-auto text-center space-y-6 py-4">
                  {decorations.florals && (
                    <div className="flex items-center justify-center gap-3" style={{ color: palette.primary }}>
                      <span className="h-px w-12 bg-current opacity-40" />
                      <Heart className="w-5 h-5" />
                      <span className="h-px w-12 bg-current opacity-40" />
                    </div>
                  )}
                  <h2
                    className="text-3xl sm:text-5xl font-semibold [text-wrap:balance]"
                    style={{ fontFamily: headingFont }}
                  >
                    {isAr
                      ? `إهداء خاص إلى ${experience.recipientName}`
                      : `A Birthday Dedication to ${experience.recipientName}`}
                  </h2>
                  <p className="text-base sm:text-lg leading-loose" style={{ color: palette.muted }}>
                    {tc.introMessage}
                  </p>
                  <p className="text-sm font-semibold pt-2" style={{ color: palette.primary }}>
                    — {experience.finalMessage.senderName}
                  </p>
                </div>
              )}

              {/* PAGE 3 — THE BIRTHDAY CAKE & MAKE A WISH */}
              {activeChapter.id === 'cake' && (
                <div className="space-y-6">
                  <div className="text-center max-w-xl mx-auto space-y-2">
                    <h2
                      className="text-3xl sm:text-4xl font-semibold"
                      style={{ fontFamily: headingFont }}
                    >
                      {isAr ? 'كعكة عيد الميلاد والأمنيات' : 'The Birthday Cake & Wish'}
                    </h2>
                    <p className="text-sm" style={{ color: palette.muted }}>
                      {tc.cakeWishPrompt}
                    </p>
                  </div>

                  <div className="relative">
                    <Birthday3DStage
                      mode="cake"
                      cakeDesign={tc.cakeDesign}
                      primaryColor={palette.primary}
                      secondaryColor={palette.secondary}
                      accentColor={palette.accent}
                      cakeColors={tc.cakeColors}
                      candleMode={tc.candleMode}
                      candleStyle={tc.candleStyle}
                      darkBg={palette.dark}
                      bgHex={palette.bg}
                      effects={experience.effectsConfig}
                      candlesLit={candlesLit}
                      onBlowCandles={handleStartWishCountdown}
                      onRelightCandles={handleRelight}
                      fireworkTrigger={fireworkTrigger}
                      recipientName={experience.recipientName}
                      recipientAge={experience.recipientAge}
                      lang={viewLang}
                      heightClass={embeddedPreview ? 'h-[320px]' : 'h-[380px] md:h-[460px]'}
                    />

                    {/* Wish 3-2-1 Countdown Overlay (zero backdrop-blur over WebGL!) */}
                    {wishCountdown !== null && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#140E1A]/80 rounded-2xl text-white p-6 text-center space-y-3">
                        <p className="text-sm font-medium text-amber-200">{t.book.countingDown}</p>
                        <div
                          className="text-7xl font-bold font-mono-tabular"
                          style={{ fontFamily: headingFont }}
                        >
                          {formatAgeNumber(Math.max(1, wishCountdown), viewLang)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interactive Make A Wish Bar */}
                  <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={wishInput}
                      onChange={(e) => setWishInput(e.target.value)}
                      placeholder={t.modules.yourWishPrompt}
                      className="flex-1 px-4 py-2.5 rounded-xl border text-sm bg-transparent"
                      style={{
                        borderColor: palette.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.14)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={candlesLit ? handleStartWishCountdown : handleRelight}
                      disabled={wishCountdown !== null}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
                      style={{ backgroundColor: palette.primary }}
                    >
                      <Flame className="w-4 h-4" />
                      <span>{candlesLit ? t.book.makeAWishBtn : t.modules.relightCandles}</span>
                    </button>
                  </div>

                  {wishRevealed && !candlesLit && (
                    <div
                      className="max-w-xl mx-auto rounded-xl border p-4 text-center space-y-1"
                      style={{
                        borderColor: goldAccent,
                        backgroundColor: `${palette.primary}12`,
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: palette.primary }}>
                        {t.book.wishGranted}
                      </p>
                      {wishInput.trim() && (
                        <p className="text-sm italic" style={{ color: palette.text }}>
                          “{wishInput.trim()}”
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PAGE 4 — MEMORY GALLERY */}
              {activeChapter.id === 'memories' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2
                      className="text-3xl font-semibold"
                      style={{ fontFamily: headingFont }}
                    >
                      {isAr ? 'ألبوم الذكريات والموسيقى' : 'Memory Gallery & Soundtrack'}
                    </h2>
                    {secVisible('memories') && secVisible('timeline') && (
                      <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' }}>
                        <button
                          type="button"
                          onClick={() => setMemoriesView('gallery')}
                          className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: memoriesView === 'gallery' ? palette.primary : 'transparent',
                            color: memoriesView === 'gallery' ? '#fff' : palette.text,
                          }}
                        >
                          {isAr ? 'معرض الصور' : 'Album'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMemoriesView('timeline')}
                          className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: memoriesView === 'timeline' ? palette.primary : 'transparent',
                            color: memoriesView === 'timeline' ? '#fff' : palette.text,
                          }}
                        >
                          {isAr ? 'الخط الزمني' : 'Timeline'}
                        </button>
                      </div>
                    )}
                  </div>
                  <MusicalMemoriesModule
                    memories={experience.memories}
                    palette={palette}
                    lang={viewLang}
                    mode={memoriesView}
                  />
                </div>
              )}

              {/* PAGE 5 — SPECIAL GIFTS */}
              {activeChapter.id === 'gifts' && (
                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <Gift className="w-6 h-6 mx-auto" style={{ color: palette.primary }} />
                    <h2
                      className="text-3xl font-semibold"
                      style={{ fontFamily: headingFont }}
                    >
                      {isAr ? 'هدايا عيد الميلاد الخاصة' : 'Special Birthday Gifts'}
                    </h2>
                  </div>
                  <GiftBoxesModule gifts={experience.gifts} palette={palette} lang={viewLang} />
                </div>
              )}

              {/* PAGE 6 — FRIENDS AND FAMILY */}
              {activeChapter.id === 'friends' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" style={{ color: palette.primary }} />
                      <h2
                        className="text-3xl font-semibold"
                        style={{ fontFamily: headingFont }}
                      >
                        {isAr ? 'رسائل الأصدقاء والعائلة' : 'Friends & Family Wishes'}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl border" style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' }}>
                      {secVisible('wishes') && (
                        <button
                          type="button"
                          onClick={() => setFriendsTab('tree')}
                          className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: friendsTab === 'tree' ? palette.primary : 'transparent',
                            color: friendsTab === 'tree' ? '#fff' : palette.text,
                          }}
                        >
                          {isAr ? 'شجرة الأمنيات' : 'Wishing Tree'}
                        </button>
                      )}
                      {secVisible('videoWall') && (
                        <button
                          type="button"
                          onClick={() => setFriendsTab('wall')}
                          className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: friendsTab === 'wall' ? palette.primary : 'transparent',
                            color: friendsTab === 'wall' ? '#fff' : palette.text,
                          }}
                        >
                          {isAr ? 'دفتر التهاني' : 'Greetings Wall'}
                        </button>
                      )}
                      {secVisible('futureLetter') && (
                        <button
                          type="button"
                          onClick={() => setFriendsTab('letter')}
                          className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: friendsTab === 'letter' ? palette.primary : 'transparent',
                            color: friendsTab === 'letter' ? '#fff' : palette.text,
                          }}
                        >
                          {isAr ? 'رسالة المستقبل' : 'Future Letter'}
                        </button>
                      )}
                    </div>
                  </div>

                  {friendsTab === 'tree' && (
                    <WishingTreeAndWallModule
                      experienceId={experience.id}
                      ownerId={experience.ownerId}
                      isSample={isSample || experience.ownerId === 'guest_draft'}
                      moderationRequired={Boolean(experience.moderationRequired)}
                      palette={palette}
                      lang={viewLang}
                      mode="tree"
                    />
                  )}
                  {friendsTab === 'wall' && (
                    <WishingTreeAndWallModule
                      experienceId={experience.id}
                      ownerId={experience.ownerId}
                      isSample={isSample || experience.ownerId === 'guest_draft'}
                      moderationRequired={Boolean(experience.moderationRequired)}
                      palette={palette}
                      lang={viewLang}
                      mode="wall"
                    />
                  )}
                  {friendsTab === 'letter' && (
                    <FutureLetterModule
                      experienceId={experience.id}
                      isSample={isSample || experience.ownerId === 'guest_draft'}
                      meta={experience.futureLetterMeta}
                      palette={palette}
                      lang={viewLang}
                    />
                  )}
                </div>
              )}

              {/* PAGE 7 — SURPRISES & GAMES */}
              {activeChapter.id === 'games' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2
                      className="text-3xl font-semibold"
                      style={{ fontFamily: headingFont }}
                    >
                      {isAr ? 'مفاجآت وألعاب الاحتفال' : 'Surprises & Birthday Games'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl border" style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' }}>
                      {secVisible('scratch') && (
                        <button
                          type="button"
                          onClick={() => setGamesTab('scratch')}
                          className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: gamesTab === 'scratch' ? palette.primary : 'transparent',
                            color: gamesTab === 'scratch' ? '#fff' : palette.text,
                          }}
                        >
                          {isAr ? 'بطاقات الخدش' : 'Scratch Cards'}
                        </button>
                      )}
                      {secVisible('quiz') && (
                        <button
                          type="button"
                          onClick={() => setGamesTab('quiz')}
                          className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: gamesTab === 'quiz' ? palette.primary : 'transparent',
                            color: gamesTab === 'quiz' ? '#fff' : palette.text,
                          }}
                        >
                          {isAr ? 'الاختبار' : 'Quiz'}
                        </button>
                      )}
                      {secVisible('wheel') && (
                        <button
                          type="button"
                          onClick={() => setGamesTab('wheel')}
                          className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: gamesTab === 'wheel' ? palette.primary : 'transparent',
                            color: gamesTab === 'wheel' ? '#fff' : palette.text,
                          }}
                        >
                          {isAr ? 'عجلة الحظ' : 'Spin Wheel'}
                        </button>
                      )}
                      {secVisible('puzzle') && (
                        <button
                          type="button"
                          onClick={() => setGamesTab('puzzle')}
                          className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: gamesTab === 'puzzle' ? palette.primary : 'transparent',
                            color: gamesTab === 'puzzle' ? '#fff' : palette.text,
                          }}
                        >
                          {isAr ? 'بازل الصور' : 'Photo Puzzle'}
                        </button>
                      )}
                    </div>
                  </div>

                  {gamesTab === 'scratch' && (
                    <ScratchCardsModule cards={experience.scratchCards} palette={palette} lang={viewLang} />
                  )}
                  {gamesTab === 'quiz' && (
                    <BirthdayQuizModule
                      title={experience.quiz.title}
                      questions={experience.quiz.questions}
                      palette={palette}
                      lang={viewLang}
                    />
                  )}
                  {gamesTab === 'wheel' && (
                    <SpinWheelModule
                      title={experience.wheel.title}
                      items={experience.wheel.items}
                      palette={palette}
                      lang={viewLang}
                    />
                  )}
                  {gamesTab === 'puzzle' && (
                    <PhotoPuzzleModule puzzle={experience.puzzle} palette={palette} lang={viewLang} />
                  )}
                </div>
              )}

              {/* PAGE 8 — FINAL MESSAGE & GRAND FINALE */}
              {activeChapter.id === 'final' && (
                <div className="space-y-8">
                  <div className="max-w-2xl mx-auto text-center space-y-4">
                    <h2
                      className="text-3xl sm:text-5xl font-semibold [text-wrap:balance]"
                      style={{ fontFamily: headingFont }}
                    >
                      {experience.finalMessage.title}
                    </h2>
                    <p className="text-base leading-relaxed" style={{ color: palette.muted }}>
                      {experience.finalMessage.body}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: palette.primary }}>
                      — {experience.finalMessage.senderName}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
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
                      <button
                        type="button"
                        onClick={() => goToPage(0)}
                        className="px-5 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
                        style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }}
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{isAr ? 'العودة للصفحة الأولى' : 'Read from Page 1'}</span>
                      </button>
                    </div>
                  </div>

                  {secVisible('grandFinale') && (
                    <Birthday3DStage
                      mode="finale"
                      cakeDesign={tc.cakeDesign}
                      primaryColor={palette.primary}
                      secondaryColor={palette.secondary}
                      accentColor={palette.accent}
                      cakeColors={tc.cakeColors}
                      candleMode={tc.candleMode}
                      candleStyle={tc.candleStyle}
                      darkBg={palette.dark}
                      bgHex={palette.bg}
                      effects={experience.effectsConfig}
                      candlesLit={candlesLit}
                      onBlowCandles={handleStartWishCountdown}
                      onRelightCandles={handleRelight}
                      fireworkTrigger={fireworkTrigger}
                      recipientName={experience.recipientName}
                      recipientAge={experience.recipientAge}
                      lang={viewLang}
                      heightClass={embeddedPreview ? 'h-[300px]' : 'h-[360px] md:h-[420px]'}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Bottom Book Page-Turning Controls */}
            <div
              className="px-5 sm:px-10 py-4 border-t flex flex-wrap items-center justify-between gap-4"
              style={{
                borderColor: palette.dark ? 'rgba(255,255,255,0.08)' : 'rgba(130,98,64,0.14)',
                backgroundColor: palette.dark ? 'rgba(0,0,0,0.14)' : 'rgba(160,120,80,0.04)',
              }}
            >
              <button
                type="button"
                onClick={goPrev}
                disabled={pageIdx === 0}
                className="px-4 py-2 rounded-xl border text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-35 cursor-pointer disabled:cursor-default"
                style={{
                  borderColor: palette.dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
                }}
              >
                <ChevronLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                <span>{t.book.prevPage}</span>
              </button>

              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1.5">
                  {chapters.map((ch, idx) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => goToPage(idx)}
                      aria-label={`${t.book.pageOf} ${idx + 1}`}
                      className="h-2 rounded-full transition-all cursor-pointer"
                      style={{
                        width: idx === pageIdx ? 22 : 8,
                        backgroundColor:
                          idx === pageIdx
                            ? palette.primary
                            : palette.dark
                            ? 'rgba(255,255,255,0.22)'
                            : 'rgba(0,0,0,0.16)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-mono-tabular" style={{ color: palette.muted }}>
                  {t.book.pageOf} {formatAgeNumber(pageIdx + 1, viewLang)} {t.book.of}{' '}
                  {formatAgeNumber(chapters.length, viewLang)} · {t.book.tapToTurnHint}
                </p>
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={pageIdx >= chapters.length - 1}
                className="px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-35 cursor-pointer disabled:cursor-default"
                style={{ backgroundColor: palette.primary }}
              >
                <span>{t.book.nextPage}</span>
                <ChevronRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Audio Controller (rendered on full viewer page) */}
      {!embeddedPreview && (
        <AudioControllerBar
          defaultTrackId={experience.audioConfig.bgTrackId}
          defaultTrackTitle={experience.audioConfig.bgTrackTitle}
          customAudioUrl={experience.audioConfig.customAudioUrl}
          lang={viewLang}
          dark={palette.dark}
        />
      )}
    </div>
  );
};
