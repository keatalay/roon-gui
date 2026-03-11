import { useCallback, useEffect, useRef, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type {
  BrowseItem,
  QueueItemPayload,
  ZonePayload,
  SeekPayload,
  ZoneListEntry,
  GroupingEntry,
  RoonState,
} from "../types/roon";

const initialState: RoonState & { configDir: string | null } = {
  coreName: null,
  browseTitle: null,
  browseItems: [],
  queueItems: [],
  selectedZone: null,
  seekPosition: null,
  queueTimeRemaining: 0,
  zones: [],
  grouping: null,
  queueMode: null,
  matchedPreset: null,
  matchedDraftPreset: null,
  pauseOnTrackEnd: false,
  showZoneSelector: false,
  showGrouping: false,
  configDir: null,
};

export function useRoon() {
  const [state, setState] = useState<RoonState & { configDir: string | null }>(initialState);
  const unlisteners = useRef<UnlistenFn[]>([]);

  useEffect(() => {
    invoke<string>("get_config_dir").then((dir) => {
      setState((s) => ({ ...s, configDir: dir }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const setup = async () => {
      const listeners = await Promise.all([
        listen<string>("roon://config-dir", (e) => {
          setState((s) => ({ ...s, configDir: e.payload }));
        }),

        listen<string | null>("roon://core-name", (e) => {
          setState((s) => ({
            ...s,
            coreName: e.payload,
            ...(e.payload === null
              ? {
                  selectedZone: null,
                  browseItems: [],
                  queueItems: [],
                  browseTitle: null,
                }
              : {}),
          }));
        }),

        listen<string>("roon://browse-title", (e) => {
          setState((s) => ({ ...s, browseTitle: e.payload }));
        }),

        listen<BrowseItem[]>("roon://browse-list", (e) => {
          setState((s) => ({ ...s, browseItems: e.payload }));
        }),

        listen<QueueItemPayload[]>("roon://queue-list", (e) => {
          setState((s) => ({ ...s, queueItems: e.payload }));
        }),

        listen<string | null>("roon://queue-mode", (e) => {
          setState((s) => ({ ...s, queueMode: e.payload }));
        }),

        listen<ZoneListEntry[]>("roon://zones", (e) => {
          setState((s) => ({ ...s, zones: e.payload }));
        }),

        listen<void>("roon://zone-select", () => {
          setState((s) => ({ ...s, showZoneSelector: true }));
        }),

        listen<ZonePayload>("roon://zone-changed", (e) => {
          setState((s) => ({
            ...s,
            selectedZone: e.payload,
            showZoneSelector: false,
          }));
        }),

        listen<void>("roon://zone-removed", () => {
          setState((s) => ({
            ...s,
            selectedZone: null,
            seekPosition: null,
          }));
        }),

        listen<SeekPayload>("roon://seek", (e) => {
          setState((s) => ({
            ...s,
            seekPosition: e.payload.seek_position,
            queueTimeRemaining: e.payload.queue_time_remaining,
          }));
        }),

        listen<GroupingEntry[] | null>("roon://grouping", (e) => {
          setState((s) => ({
            ...s,
            grouping: e.payload,
            showGrouping: e.payload !== null && e.payload.length > 0,
          }));
        }),

        listen<string | null>("roon://preset-matched", (e) => {
          setState((s) => ({ ...s, matchedPreset: e.payload }));
        }),

        listen<string | null>("roon://preset-matched-draft", (e) => {
          setState((s) => ({ ...s, matchedDraftPreset: e.payload }));
        }),

        listen<boolean>("roon://pause-on-track-end", (e) => {
          setState((s) => ({ ...s, pauseOnTrackEnd: e.payload }));
        }),
      ]);

      unlisteners.current = listeners;
    };

    setup();

    return () => {
      unlisteners.current.forEach((fn) => fn());
    };
  }, []);

  const actions = {
    browseSelect: useCallback(
      (itemKey: string | null) => invoke("browse_select", { itemKey }),
      []
    ),
    browseWithInput: useCallback(
      (input: string, itemKey: string | null) =>
        invoke("browse_with_input", { input, itemKey }),
      []
    ),
    browseBack: useCallback(() => invoke("browse_back"), []),
    browseHome: useCallback(() => invoke("browse_home"), []),
    browseRefresh: useCallback(() => invoke("browse_refresh"), []),
    queueSelect: useCallback(
      (queueItemId: number) => invoke("queue_select", { queueItemId }),
      []
    ),
    queueClear: useCallback(() => invoke("queue_clear"), []),
    queueModeNext: useCallback(() => invoke("queue_mode_next"), []),
    queueModeAppend: useCallback(() => invoke("queue_mode_append"), []),
    zoneSelect: useCallback(
      (endpointType: string, endpointId: string) =>
        invoke("zone_select", { endpointType, endpointId }),
      []
    ),
    zoneGroupReq: useCallback(() => invoke("zone_group_req"), []),
    zoneGrouped: useCallback(
      (outputIds: string[]) => invoke("zone_grouped", { outputIds }),
      []
    ),
    zoneSavePreset: useCallback(
      (name: string, outputIds: string[]) =>
        invoke("zone_save_preset", { name, outputIds }),
      []
    ),
    zoneDeletePreset: useCallback(
      (name: string) => invoke("zone_delete_preset", { name }),
      []
    ),
    zoneMatchPreset: useCallback(
      (outputIds: string[]) => invoke("zone_match_preset", { outputIds }),
      []
    ),
    transportControl: useCallback(
      (action: string) => invoke("transport_control", { action }),
      []
    ),
    mute: useCallback(
      (action: string) => invoke("mute", { action }),
      []
    ),
    changeVolume: useCallback(
      (steps: number) => invoke("change_volume", { steps }),
      []
    ),
    toggleRepeat: useCallback(() => invoke("toggle_repeat"), []),
    toggleShuffle: useCallback(() => invoke("toggle_shuffle"), []),
    pauseOnTrackEnd: useCallback(() => invoke("pause_on_track_end"), []),
    showZoneSelector: useCallback(
      () => setState((s) => ({ ...s, showZoneSelector: true })),
      []
    ),
    hideZoneSelector: useCallback(
      () => setState((s) => ({ ...s, showZoneSelector: false })),
      []
    ),
    showGroupingDialog: useCallback(
      () => setState((s) => ({ ...s, showGrouping: true })),
      []
    ),
    hideGroupingDialog: useCallback(
      () => setState((s) => ({ ...s, showGrouping: false, grouping: null })),
      []
    ),
    connectToIp: useCallback(
      (ip: string, port?: string) =>
        invoke("connect_to_ip", { ip, port: port || null }),
      []
    ),
  };

  return { state, actions };
}
