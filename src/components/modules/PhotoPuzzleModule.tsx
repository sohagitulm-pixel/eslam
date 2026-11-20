import React, { useEffect, useState } from 'react';
import { Shuffle, Sparkles } from 'lucide-react';
import { audioManager } from '../../audio/AudioManager';
import { getT } from '../../i18n/translations';
import { Language, PuzzleConfig, ThemePalette } from '../../types/birthday';

interface PhotoPuzzleModuleProps {
  puzzle: PuzzleConfig;
  palette: ThemePalette;
  lang: Language;
}

function createShuffledTiles(size: number): number[] {
  const total = size * size;
  const arr = Array.from({ length: total }, (_, i) => i);
  // Perform valid adjacent swaps so puzzle is guaranteed solvable
  let empty = total - 1;
  for (let step = 0; step < total * 18; step++) {
    const row = Math.floor(empty / size);
    const col = empty % size;
    const neighbors: number[] = [];
    if (row > 0) neighbors.push((row - 1) * size + col);
    if (row < size - 1) neighbors.push((row + 1) * size + col);
    if (col > 0) neighbors.push(row * size + (col - 1));
    if (col < size - 1) neighbors.push(row * size + (col + 1));
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [arr[empty], arr[pick]] = [arr[pick], arr[empty]];
    empty = pick;
  }
  return arr;
}

export const PhotoPuzzleModule: React.FC<PhotoPuzzleModuleProps> = ({
  puzzle,
  palette,
  lang,
}) => {
  const t = getT(lang);
  const [gridSize, setGridSize] = useState<3 | 4 | 5>(puzzle.gridSize || 3);
  const [tiles, setTiles] = useState<number[]>(() => createShuffledTiles(puzzle.gridSize || 3));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    if (solved) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [solved, gridSize]);

  const resetPuzzle = (newSize: 3 | 4 | 5 = gridSize) => {
    setGridSize(newSize);
    setTiles(createShuffledTiles(newSize));
    setMoves(0);
    setSeconds(0);
    setSolved(false);
  };

  const handleTileClick = (index: number) => {
    if (solved) return;
    const emptyVal = gridSize * gridSize - 1;
    const emptyIndex = tiles.indexOf(emptyVal);
    const r1 = Math.floor(index / gridSize);
    const c1 = index % gridSize;
    const r2 = Math.floor(emptyIndex / gridSize);
    const c2 = emptyIndex % gridSize;

    const isAdjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    if (!isAdjacent) return;

    const next = [...tiles];
    [next[index], next[emptyIndex]] = [next[emptyIndex], next[index]];
    setTiles(next);
    setMoves((m) => m + 1);

    const isComplete = next.every((val, idx) => val === idx);
    if (isComplete) {
      setSolved(true);
      audioManager.playSfx('puzzle-solve');
    }
  };

  const emptyVal = gridSize * gridSize - 1;

  return (
    <div
      className="max-w-xl mx-auto rounded-2xl border p-6 md:p-8 space-y-5"
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold" style={{ color: palette.text }}>
          {puzzle.title}
        </h3>
        <div className="flex items-center gap-1.5">
          {([3, 4, 5] as const).map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => resetPuzzle(sz)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono-tabular border cursor-pointer"
              style={{
                backgroundColor: gridSize === sz ? palette.primary : 'transparent',
                color: gridSize === sz ? '#FFFFFF' : palette.text,
                borderColor: gridSize === sz ? palette.primary : 'rgba(140,140,140,0.28)',
              }}
            >
              {sz}x{sz}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-mono-tabular" style={{ color: palette.muted }}>
        <span>
          {t.modules.puzzleMoves}: {moves} · {t.modules.puzzleTime}: {seconds}s
        </span>
        <button
          type="button"
          onClick={() => resetPuzzle(gridSize)}
          className="inline-flex items-center gap-1.5 hover:underline cursor-pointer"
          style={{ color: palette.primary }}
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>{t.modules.puzzleShuffle}</span>
        </button>
      </div>

      <div
        className="grid gap-1 mx-auto w-full max-w-[340px] aspect-square rounded-xl overflow-hidden p-1 border"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        }}
      >
        {tiles.map((tileVal, idx) => {
          const isEmpty = tileVal === emptyVal && !solved;
          const origRow = Math.floor(tileVal / gridSize);
          const origCol = tileVal % gridSize;
          const pctX = gridSize > 1 ? (origCol / (gridSize - 1)) * 100 : 0;
          const pctY = gridSize > 1 ? (origRow / (gridSize - 1)) * 100 : 0;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleTileClick(idx)}
              className="relative w-full h-full rounded-md overflow-hidden transition-transform active:scale-95 cursor-pointer"
              style={{
                backgroundColor: isEmpty ? 'transparent' : '#e5e0dc',
                backgroundImage: isEmpty ? 'none' : `url(${puzzle.imageUrl})`,
                backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                backgroundPosition: `${pctX}% ${pctY}%`,
              }}
              aria-label={`Puzzle tile ${tileVal + 1}`}
            />
          );
        })}
      </div>

      {solved && (
        <div
          className="p-4 rounded-xl border text-center space-y-1"
          style={{
            backgroundColor: `${palette.primary}15`,
            borderColor: `${palette.primary}40`,
          }}
        >
          <div className="flex items-center justify-center gap-1.5 text-sm font-semibold" style={{ color: palette.primary }}>
            <Sparkles className="w-4 h-4" />
            <span>{t.modules.puzzleSolved}</span>
          </div>
          <p className="text-sm" style={{ color: palette.text }}>
            {puzzle.hiddenMessage}
          </p>
        </div>
      )}
    </div>
  );
};
