import type { ZonePayload, VolumePayload } from "../types/roon";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatVolume(volume: VolumePayload | null | undefined): string {
  if (!volume) return "Fixed";
  if (volume.scale === "incremental") return "Incrmnt";
  if (volume.is_muted) return "Muted";
  if (volume.value === null) return "";
  if (volume.scale === "decibel") {
    return volume.step && volume.step < 1
      ? `${volume.value.toFixed(1)}dB`
      : `${Math.round(volume.value)}dB`;
  }
  return `${Math.round(volume.value)}`;
}

interface Props {
  zone: ZonePayload | null;
  seekPosition: number | null;
  matchedPreset: string | null;
  pauseOnTrackEnd: boolean;
  coreName: string | null;
  isActive: boolean;
  onControl: (action: string) => void;
  onMute: (action: string) => void;
  onVolumeChange: (steps: number) => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onActivate: () => void;
}

export function NowPlaying({
  zone,
  seekPosition,
  matchedPreset,
  pauseOnTrackEnd,
  coreName,
  isActive,
  onControl,
  onMute,
  onVolumeChange,
  onToggleRepeat,
  onToggleShuffle,
  onActivate,
}: Props) {
  if (!coreName) {
    return (
      <div className="border border-zinc-700 rounded-lg p-4 text-center text-zinc-500">
        <p>Not paired to a Roon Server (or no server found)</p>
        <p className="text-sm mt-1">
          Use a Roon Remote and go to Settings → Extensions to enable Roon TUI
        </p>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="border border-zinc-700 rounded-lg p-4 text-center text-zinc-500">
        No zone selected — press Ctrl+Z to select one
      </div>
    );
  }

  const np = zone.now_playing;
  const elapsed = seekPosition ?? np?.seek_position ?? 0;
  const duration = np?.length ?? 0;
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  const displayName = matchedPreset
    ? `${matchedPreset} (${zone.display_name})`
    : zone.display_name;

  const stateLabel =
    zone.state === "loading"
      ? "Loading"
      : zone.state === "paused"
        ? "Paused"
        : zone.state === "playing"
          ? pauseOnTrackEnd
            ? "Pause at End"
            : "Playing"
          : "Stopped";

  const mainVolume = zone.outputs[0]?.volume;
  const borderColor = isActive ? "border-roon" : "border-zinc-700";

  return (
    <div
      className={`border ${borderColor} rounded-lg overflow-hidden flex-shrink-0`}
      tabIndex={0}
      onFocus={onActivate}
      onKeyDown={(e) => {
        if (!isActive) return;
        switch (e.key) {
          case "m":
            onMute("mute");
            break;
          case "u":
            onMute("unmute");
            break;
          case "+":
          case "=":
            onVolumeChange(1);
            break;
          case "-":
            onVolumeChange(-1);
            break;
          case "r":
            onToggleRepeat();
            break;
          case "s":
            onToggleShuffle();
            break;
        }
      }}
    >
      <div className="flex items-stretch">
        {/* Track info */}
        <div className="flex-1 px-5 py-3 min-w-0">
          {np ? (
            <div className="space-y-0.5">
              <div className="font-semibold text-white truncate">{np.line1}</div>
              <div className="text-sm text-zinc-300 truncate">{np.line2}</div>
              <div className="text-sm text-zinc-500 italic truncate">{np.line3}</div>
            </div>
          ) : (
            <div className="text-zinc-500 py-2">Go find something to play!</div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 px-4">
          <button
            onClick={() => onControl("previous")}
            disabled={!zone.is_previous_allowed}
            className="p-2 rounded-full hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            title="Previous"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button
            onClick={() => onControl("play_pause")}
            className="p-3 rounded-full bg-roon hover:bg-roon/80 transition-colors"
            title="Play/Pause"
          >
            {zone.state === "playing" ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onControl("next")}
            disabled={!zone.is_next_allowed}
            className="p-2 rounded-full hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            title="Next"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Status */}
        <div className="flex flex-col items-end justify-center px-5 py-2 min-w-[140px] text-sm text-zinc-400 gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs">Vol</span>
            <span>{formatVolume(mainVolume)}</span>
            <div className="flex gap-0.5">
              <button
                onClick={() => onVolumeChange(-1)}
                className="px-1 hover:text-white transition-colors"
              >
                −
              </button>
              <button
                onClick={() => onVolumeChange(1)}
                className="px-1 hover:text-white transition-colors"
              >
                +
              </button>
            </div>
          </div>
          <button
            onClick={onToggleRepeat}
            className={`text-xs hover:text-white transition-colors ${zone.settings.repeat !== "off" ? "text-roon" : ""}`}
          >
            Repeat {zone.settings.repeat === "off" ? "Off" : zone.settings.repeat === "all" ? "All" : "One"}
          </button>
          <button
            onClick={onToggleShuffle}
            className={`text-xs hover:text-white transition-colors ${zone.settings.shuffle ? "text-roon" : ""}`}
          >
            Shuffle {zone.settings.shuffle ? "On" : "Off"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-roon rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-zinc-500">
          <span>{formatTime(elapsed)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}</span>
          <div className="flex items-center gap-3">
            <span className={`${stateLabel === "Playing" ? "text-roon" : ""}`}>
              {stateLabel}
            </span>
            <span className="text-zinc-600">{displayName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
