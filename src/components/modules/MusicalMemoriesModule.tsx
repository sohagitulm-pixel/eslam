import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Music, Pause, Play, Square } from 'lucide-react';
import { audioManager, AudioStateSnapshot } from '../../audio/AudioManager';
import { Language, MemoryItem, ThemePalette } from '../../types/birthday';
import { getT } from '../../i18n/translations';

interface MusicalMemoriesModuleProps {
  memories: MemoryItem[];
  palette: ThemePalette;
  lang: Language;
  mode?: 'gallery' | 'timeline';
}

export const MusicalMemoriesModule: React.FC<MusicalMemoriesModuleProps> = ({
  memories,
  palette,
  lang,
  mode = 'gallery',
}) => {
  const t = getT(lang);
  const [audioSnap, setAudioSnap] = useState<AudioStateSnapshot>(() => audioManager.getState());
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [tiltState, setTiltState] = useState<Record<string, { rx: number; ry: number }>>({});

  useEffect(() => {
    return audioManager.subscribe(setAudioSnap);
  }, []);

  if (!memories.length) return null;

  const togglePlayMemory = (mem: MemoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const trackId = `mem-track-${mem.id}`;
    if (audioSnap.isPlaying && audioSnap.currentTrackId === trackId) {
      audioManager.pause();
    } else {
      audioManager.playTrack(
        trackId,
        mem.songTitle ? `${mem.songTitle}${mem.songArtist ? ` — ${mem.songArtist}` : ''}` : mem.title,
        mem.audioUrl || 'synth:morning-sunbeams'
      );
    }
  };

  if (mode === 'timeline') {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {memories.map((mem, idx) => (
          <div
            key={mem.id}
            className="flex flex-col sm:flex-row gap-5 p-5 rounded-2xl border transition-colors"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            }}
          >
            <div className="sm:w-44 h-36 rounded-xl overflow-hidden shrink-0 bg-stone-100">
              <img
                src={mem.photoUrl}
                alt={mem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-tabular" style={{ color: palette.muted }}>
                  <span>0{idx + 1}.</span>
                  <span aria-hidden="true">·</span>
                  <span>{mem.date}</span>
                  {mem.location && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{mem.location}</span>
                    </>
                  )}
                </div>
                <h4 className="font-display text-2xl font-semibold mt-1" style={{ color: palette.text }}>
                  {mem.title}
                </h4>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: palette.muted }}>
                  {mem.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {memories.map((mem) => {
        const trackId = `mem-track-${mem.id}`;
        const isThisPlaying = audioSnap.isPlaying && audioSnap.currentTrackId === trackId;
        const isRevealed = Boolean(revealedIds[mem.id]);
        const tilt = tiltState[mem.id] || { rx: 0, ry: 0 };

        return (
          <div
            key={mem.id}
            onClick={() =>
              setRevealedIds((prev) => ({ ...prev, [mem.id]: !prev[mem.id] }))
            }
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width - 0.5;
              const y = (e.clientY - rect.top) / rect.height - 0.5;
              setTiltState((prev) => ({
                ...prev,
                [mem.id]: { rx: -y * 8, ry: x * 8 },
              }));
            }}
            onMouseLeave={() =>
              setTiltState((prev) => ({ ...prev, [mem.id]: { rx: 0, ry: 0 } }))
            }
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="rounded-2xl border overflow-hidden cursor-pointer flex flex-col"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-stone-200">
              <img
                src={mem.photoUrl}
                alt={mem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute bottom-3 inset-x-4 text-white">
                <div className="flex items-center gap-2 text-xs text-white/85 font-mono-tabular">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{mem.date}</span>
                  {mem.location && (
                    <>
                      <span aria-hidden="true">·</span>
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{mem.location}</span>
                    </>
                  )}
                </div>
                <h4 className="font-display text-2xl font-semibold mt-0.5 text-white">
                  {mem.title}
                </h4>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <p
                className={`text-sm leading-relaxed transition-opacity duration-200 ${
                  isRevealed ? 'opacity-100' : 'opacity-85 md:opacity-95'
                }`}
                style={{ color: palette.muted }}
              >
                {mem.message}
              </p>

              {/* Explicit Song Controls (Never autoplays on hover) */}
              <div
                className="pt-3 border-t flex items-center justify-between gap-3"
                style={{ borderColor: palette.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {mem.coverArtUrl ? (
                    <img
                      src={mem.coverArtUrl}
                      alt={mem.songTitle || mem.title}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${palette.primary}1F`, color: palette.primary }}
                    >
                      <Music className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: palette.text }}>
                      {mem.songTitle || mem.title}
                    </p>
                    {mem.songArtist && (
                      <p className="text-[11px] truncate" style={{ color: palette.muted }}>
                        {mem.songArtist}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => togglePlayMemory(mem, e)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 whitespace-nowrap"
                    style={{ backgroundColor: palette.primary }}
                  >
                    {isThisPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isThisPlaying ? t.modules.pauseSong : t.modules.playSong}</span>
                  </button>
                  {isThisPlaying && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        audioManager.stop();
                      }}
                      aria-label={t.modules.stopSong}
                      className="p-1.5 rounded-lg border"
                      style={{
                        borderColor: palette.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                        color: palette.text,
                      }}
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
