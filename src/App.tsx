import { useCallback, useEffect, useState } from "react";
import { useRoon } from "./hooks/useRoon";
import { BrowseView } from "./components/BrowseView";
import { QueueView } from "./components/QueueView";
import { NowPlaying } from "./components/NowPlaying";
import { ZoneSelector } from "./components/ZoneSelector";
import { GroupingDialog } from "./components/GroupingDialog";

type ActivePanel = "browse" | "queue" | "nowplaying";

export default function App() {
  const { state, actions } = useRoon();
  const [activePanel, setActivePanel] = useState<ActivePanel>("browse");
  const [showIpDialog, setShowIpDialog] = useState(false);
  const [ipInput, setIpInput] = useState("");
  const [portInput, setPortInput] = useState("9330");
  const [connecting, setConnecting] = useState(false);

  const cyclePanel = useCallback(
    (direction: 1 | -1) => {
      const panels: ActivePanel[] = ["browse", "queue", "nowplaying"];
      const idx = panels.indexOf(activePanel);
      const next = (idx + direction + panels.length) % panels.length;
      setActivePanel(panels[next]);
    },
    [activePanel]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.showZoneSelector || state.showGrouping || showIpDialog) return;

      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        cyclePanel(1);
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        cyclePanel(-1);
      }

      if (e.ctrlKey) {
        switch (e.key) {
          case "z":
            e.preventDefault();
            actions.showZoneSelector();
            break;
          case "g":
            e.preventDefault();
            actions.zoneGroupReq();
            break;
          case " ":
          case "p":
            e.preventDefault();
            actions.transportControl("play_pause");
            break;
          case "e":
            e.preventDefault();
            actions.pauseOnTrackEnd();
            break;
          case "ArrowUp":
            e.preventDefault();
            actions.changeVolume(1);
            break;
          case "ArrowDown":
            e.preventDefault();
            actions.changeVolume(-1);
            break;
          case "ArrowLeft":
            e.preventDefault();
            actions.transportControl("previous");
            break;
          case "ArrowRight":
            e.preventDefault();
            actions.transportControl("next");
            break;
          case "Delete":
            e.preventDefault();
            actions.queueClear();
            break;
          case "q":
            e.preventDefault();
            actions.queueModeNext();
            break;
          case "a":
            e.preventDefault();
            actions.queueModeAppend();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.showZoneSelector, state.showGrouping, showIpDialog, cyclePanel, actions]);

  const handleConnect = async () => {
    if (!ipInput.trim()) return;
    setConnecting(true);
    try {
      await actions.connectToIp(ipInput.trim(), portInput.trim() || undefined);
    } catch (e) {
      console.error("Connection failed:", e);
    }
    setConnecting(false);
    setShowIpDialog(false);
  };

  const version = "0.1.0";
  const subtitle = state.coreName ?? "Searching for Roon Server...";

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-300 overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-roon">Roon GUI</h1>
          <span className="text-xs text-zinc-600">v{version}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm ${state.coreName ? "text-zinc-400" : "text-amber-500"}`}>
            {subtitle}
          </span>
          {!state.coreName && (
            <button
              onClick={() => setShowIpDialog(true)}
              className="text-xs px-3 py-1 rounded border border-amber-600 text-amber-400 hover:bg-amber-600/20 transition-colors"
            >
              Connect by IP
            </button>
          )}
          <button
            onClick={actions.showZoneSelector}
            className="text-xs px-3 py-1 rounded border border-zinc-700 hover:border-roon hover:text-roon transition-colors"
            title="Select zone (Ctrl+Z)"
          >
            Zones
          </button>
          <button
            onClick={() => actions.zoneGroupReq()}
            className="text-xs px-3 py-1 rounded border border-zinc-700 hover:border-roon hover:text-roon transition-colors"
            title="Group zones (Ctrl+G)"
          >
            Group
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex gap-0 min-h-0 p-3">
        <div className="flex-1 min-w-0">
          <BrowseView
            title={state.browseTitle}
            items={state.browseItems}
            isActive={activePanel === "browse"}
            onSelect={actions.browseSelect}
            onSelectWithInput={actions.browseWithInput}
            onBack={actions.browseBack}
            onHome={actions.browseHome}
            onRefresh={actions.browseRefresh}
            onActivate={() => setActivePanel("browse")}
          />
        </div>
        <div className="w-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <QueueView
            items={state.queueItems}
            queueMode={state.queueMode}
            queueTimeRemaining={state.queueTimeRemaining}
            isActive={activePanel === "queue"}
            onSelect={actions.queueSelect}
            onActivate={() => setActivePanel("queue")}
          />
        </div>
      </main>

      {/* Now Playing */}
      <div className="px-3 pb-3 flex-shrink-0">
        <NowPlaying
          zone={state.selectedZone}
          seekPosition={state.seekPosition}
          matchedPreset={state.matchedPreset}
          pauseOnTrackEnd={state.pauseOnTrackEnd}
          coreName={state.coreName}
          isActive={activePanel === "nowplaying"}
          onControl={actions.transportControl}
          onMute={actions.mute}
          onVolumeChange={actions.changeVolume}
          onToggleRepeat={actions.toggleRepeat}
          onToggleShuffle={actions.toggleShuffle}
          onActivate={() => setActivePanel("nowplaying")}
        />
      </div>

      {/* Config dir info (shown when not connected) */}
      {!state.coreName && state.configDir && (
        <div className="px-5 pb-2 text-xs text-zinc-600">
          Config: {state.configDir}/config.json · Log: {state.configDir}/roon-gui.log
        </div>
      )}

      {/* IP Connection Dialog */}
      {showIpDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-roon rounded-xl shadow-2xl w-96 p-5">
            <h2 className="text-lg font-bold text-roon mb-4">Connect to Roon Server</h2>
            <p className="text-sm text-zinc-400 mb-4">
              If auto-discovery isn't finding your server, enter its IP address directly.
              You can find this in Roon → Settings → About.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Server IP Address</label>
                <input
                  type="text"
                  autoFocus
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-roon"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConnect();
                    if (e.key === "Escape") setShowIpDialog(false);
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Port (usually 9330)</label>
                <input
                  type="text"
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-roon"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConnect();
                    if (e.key === "Escape") setShowIpDialog(false);
                  }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConnect}
                  disabled={connecting || !ipInput.trim()}
                  className="flex-1 py-2 rounded bg-roon hover:bg-roon/80 text-white font-semibold disabled:opacity-40 transition-colors"
                >
                  {connecting ? "Connecting..." : "Connect"}
                </button>
                <button
                  onClick={() => setShowIpDialog(false)}
                  className="px-4 py-2 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ZoneSelector
        zones={state.zones}
        visible={state.showZoneSelector}
        onSelect={(type, id) => {
          actions.zoneSelect(type, id);
          actions.hideZoneSelector();
        }}
        onDelete={actions.zoneDeletePreset}
        onClose={actions.hideZoneSelector}
      />

      <GroupingDialog
        grouping={state.grouping}
        visible={state.showGrouping}
        zone={state.selectedZone}
        matchedPreset={state.matchedPreset}
        matchedDraftPreset={state.matchedDraftPreset}
        onGrouped={actions.zoneGrouped}
        onSavePreset={actions.zoneSavePreset}
        onMatchPreset={actions.zoneMatchPreset}
        onClose={actions.hideGroupingDialog}
      />
    </div>
  );
}
