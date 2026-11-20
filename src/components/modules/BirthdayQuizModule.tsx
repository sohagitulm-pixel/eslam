import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';
import { getT } from '../../i18n/translations';
import { Language, QuizQuestion, ThemePalette } from '../../types/birthday';

interface BirthdayQuizModuleProps {
  title: string;
  questions: QuizQuestion[];
  palette: ThemePalette;
  lang: Language;
}

export const BirthdayQuizModule: React.FC<BirthdayQuizModuleProps> = ({
  title,
  questions,
  palette,
  lang,
}) => {
  const t = getT(lang);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!questions.length) return null;

  const q = questions[idx];
  const isAr = lang === 'ar';

  const handleSelect = (optIdx: number) => {
    if (selected !== null) return;
    setSelected(optIdx);
    if (optIdx === q.correctIndex) {
      setScore((s) => s + 1);
      audioManager.playSfx('win');
    }
  };

  const handleNext = () => {
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
      setSelected(null);
    } else {
      setFinished(true);
      audioManager.playSfx('fireworks');
    }
  };

  const handleReset = () => {
    setIdx(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  return (
    <div
      className="max-w-2xl mx-auto rounded-2xl border p-6 md:p-8"
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <h3 className="font-display text-2xl font-semibold" style={{ color: palette.text }}>
          {title}
        </h3>
        <span className="text-xs font-mono-tabular" style={{ color: palette.muted }}>
          {finished ? `${score}/${questions.length}` : `${idx + 1} / ${questions.length}`}
        </span>
      </div>

      {finished ? (
        <div className="text-center py-6 space-y-4">
          <p className="text-sm uppercase tracking-wider" style={{ color: palette.muted }}>
            {t.modules.quizScore}
          </p>
          <p className="font-display text-5xl font-semibold font-mono-tabular" style={{ color: palette.primary }}>
            {score} / {questions.length}
          </p>
          <p className="text-sm max-w-md mx-auto" style={{ color: palette.muted }}>
            {score === questions.length
              ? isAr
                ? 'نتيجة مثالية! تعرف صاحب عيد الميلاد عن ظهر قلب.'
                : 'Perfect score! You know the birthday star better than anyone.'
              : isAr
              ? 'نتيجة رائعة! كل إجابة تضيف ذكرى جميلة للاحتفال.'
              : 'Lovely score! Every question celebrates another shared memory.'}
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white inline-flex items-center gap-2 cursor-pointer"
            style={{ backgroundColor: palette.primary }}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.modules.quizRetry}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {q.photoUrl && (
            <div className="aspect-[16/9] rounded-xl overflow-hidden bg-stone-200">
              <img
                src={q.photoUrl}
                alt={q.question}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <p className="text-lg font-medium" style={{ color: palette.text }}>
            {q.question}
          </p>

          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, optIdx) => {
              const isChosen = selected === optIdx;
              const isCorrect = optIdx === q.correctIndex;
              let borderCol = palette.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';
              let bgCol = 'transparent';
              if (selected !== null) {
                if (isCorrect) {
                  borderCol = '#16A34A';
                  bgCol = 'rgba(22, 163, 74, 0.1)';
                } else if (isChosen) {
                  borderCol = '#DC2626';
                  bgCol = 'rgba(220, 38, 38, 0.1)';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={selected !== null}
                  onClick={() => handleSelect(optIdx)}
                  className="w-full text-start px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  style={{ borderColor: borderCol, backgroundColor: bgCol, color: palette.text }}
                >
                  <span>{opt}</span>
                  {selected !== null && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {selected !== null && isChosen && !isCorrect && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs leading-relaxed" style={{ color: palette.muted }}>
                {q.funFact}
              </p>
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white shrink-0 cursor-pointer"
                style={{ backgroundColor: palette.primary }}
              >
                {t.modules.quizNext}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
