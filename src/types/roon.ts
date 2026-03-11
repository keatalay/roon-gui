export interface BrowseItem {
  title: string;
  subtitle: string | null;
  item_key: string | null;
  input_prompt: string | null;
}

export interface QueueItemPayload {
  queue_item_id: number;
  length: number;
  line1: string;
  line2: string;
}

export interface ZonePayload {
  zone_id: string;
  display_name: string;
  state: "loading" | "paused" | "playing" | "stopped";
  now_playing: NowPlayingPayload | null;
  queue_time_remaining: number; // i64 from backend, JS handles as number
  is_next_allowed: boolean;
  is_previous_allowed: boolean;
  settings: ZoneSettingsPayload;
  outputs: OutputPayload[];
}

export interface NowPlayingPayload {
  seek_position: number | null;
  length: number | null;
  line1: string;
  line2: string;
  line3: string;
}

export interface ZoneSettingsPayload {
  auto_radio: boolean;
  repeat: "off" | "all" | "one";
  shuffle: boolean;
}

export interface OutputPayload {
  output_id: string;
  display_name: string;
  volume: VolumePayload | null;
}

export interface VolumePayload {
  value: number | null;
  scale: "decibel" | "number" | "incremental" | "unknown";
  is_muted: boolean | null;
  step: number | null;
}

export interface SeekPayload {
  seek_position: number | null;
  queue_time_remaining: number;
}

export interface EndPoint {
  type: "Zone" | "Output" | "Preset";
  id: string;
}

export interface ZoneListEntry {
  endpoint: EndPoint;
  name: string;
}

export interface GroupingEntry {
  output_id: string;
  name: string;
  included: boolean;
}

export interface RoonState {
  coreName: string | null;
  browseTitle: string | null;
  browseItems: BrowseItem[];
  queueItems: QueueItemPayload[];
  selectedZone: ZonePayload | null;
  seekPosition: number | null;
  queueTimeRemaining: number;
  zones: ZoneListEntry[];
  grouping: GroupingEntry[] | null;
  queueMode: string | null;
  matchedPreset: string | null;
  matchedDraftPreset: string | null;
  pauseOnTrackEnd: boolean;
  showZoneSelector: boolean;
  showGrouping: boolean;
}
