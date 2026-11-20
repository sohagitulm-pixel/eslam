import React, { useEffect, useState } from 'react';
import { Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { audioManager, AudioStateSnapshot } from '../../audio/AudioManager';
import { Language } from '../../types/birthday';

interface AudioControllerBarProps {
  defaultTrackId: string;
  defaultTrackTitle: string;
  customAudioUrl?: string;
  lang: Language;
  dark?: boolean;
}

export const AudioControllerBar: React.FC<AudioControllerBarProps> = ({
  defaultTrackId,
  defaultTrackTitle,
  customAudioUrl,
  lang,
  dark = false,
}) => {
  const [snap, setSnap] = useState<AudioStateSnapshot>(() => audioManager.getState());

  useEffect(() => {
    return audioManager.subscribe(setSnap);
  }, []);

  const isAr = lang === 'ar';

  const handleTogglePlay = () => {
    if (snap.isPlaying) {
      audioManager.pause();
    } else if (snap.currentTrackId) {
      audioManager.playTrack(snap.currentTrackId, snap.currentTrackTitle);
    } else {
      audioManager.playTrack(defaultTrackId, defaultTrackTitle, customAudioUrl);
    }
  };

  return (
    <div
      className={`fixed bottom-4 ${isAr ? 'left-4' : 'right-4'} z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-sm max-w-[92vw] ${
        dark
          ? 'bg-[#171422]/95 border-white/15 text-white'
          : 'bg-white/95 border-stone-200 text-stone-900'
      }`}
    >
      <button
        type="button"
        onClick={handleTogglePlay}
        aria-label={snap.isPlaying ? 'Pause music' : 'Play music'}
        className="w-9 h-9 rounded-lg bg-[#C83E5B] text-white flex items-center justify-center shrink-0 hover:bg-[#b0324d] transition-colors"
      >
        {snap.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      {snap.currentTrackId && (
        <button
          type="button"
          onClick={() => audioManager.stop()}
          aria-label="Stop music"
          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
            dark ? 'border-white/15 hover:bg-white/10' : 'border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="min-w-[110px] max-w-[170px]">
        <p className="text-xs font-medium truncate">
          {snap.currentTrackTitle || defaultTrackTitle}
        </p>
        <div className={`w-full h-1 rounded-full mt-1.5 overflow-hidden ${dark ? 'bg-white/15' : 'bg-stone-200'}`}>
          <div
            className="h-full bg-[#C83E5B] transition-all duration-200"
            style={{ width: `${Math.round((snap.progress || 0) * 100)}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => audioManager.toggleMute()}
        aria-label="Toggle mute"
        className={`p-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-stone-100'}`}
      >
        {snap.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={snap.muted ? 0 : snap.volume}
        onChange={(e) => audioManager.setVolume(parseFloat(e.target.value))}
        aria-label="Volume"
        className="hidden sm:block w-16 accent-[#C83E5B] cursor-pointer"
      />
    </div>
  );
};
