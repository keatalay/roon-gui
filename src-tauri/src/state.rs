use roon_api::{
    browse,
    transport::{QueueItem, QueueOperation, QueueChange, Zone, State, Repeat, volume::Scale},
};
use serde::Serialize;
use tauri::Emitter;
use tokio::sync::mpsc::Sender;

use crate::io::{EndPoint, IoEvent, QueueMode};

#[derive(Serialize, Clone, Debug)]
pub struct BrowseItemPayload {
    pub title: String,
    pub subtitle: Option<String>,
    pub item_key: Option<String>,
    pub input_prompt: Option<String>,
}

impl From<&browse::Item> for BrowseItemPayload {
    fn from(item: &browse::Item) -> Self {
        Self {
            title: item.title.clone(),
            subtitle: item.subtitle.clone(),
            item_key: item.item_key.clone(),
            input_prompt: item.input_prompt.as_ref().map(|p| p.prompt.clone()),
        }
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct QueueItemPayload {
    pub queue_item_id: u32,
    pub length: u32,
    pub line1: String,
    pub line2: String,
}

impl From<&QueueItem> for QueueItemPayload {
    fn from(item: &QueueItem) -> Self {
        Self {
            queue_item_id: item.queue_item_id,
            length: item.length,
            line1: item.two_line.line1.clone(),
            line2: item.two_line.line2.clone(),
        }
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct ZonePayload {
    pub zone_id: String,
    pub display_name: String,
    pub state: String,
    pub now_playing: Option<NowPlayingPayload>,
    pub queue_time_remaining: i64,
    pub is_next_allowed: bool,
    pub is_previous_allowed: bool,
    pub settings: ZoneSettingsPayload,
    pub outputs: Vec<OutputPayload>,
}

impl From<&Zone> for ZonePayload {
    fn from(zone: &Zone) -> Self {
        let state_str = match zone.state {
            State::Loading => "loading",
            State::Paused => "paused",
            State::Playing => "playing",
            State::Stopped => "stopped",
        };

        let now_playing = zone.now_playing.as_ref().map(|np| NowPlayingPayload {
            seek_position: np.seek_position,
            length: np.length,
            line1: np.three_line.line1.clone(),
            line2: np.three_line.line2.clone(),
            line3: np.three_line.line3.clone(),
        });

        let settings = ZoneSettingsPayload {
            auto_radio: zone.settings.auto_radio,
            repeat: match zone.settings.repeat {
                Repeat::Off => "off".to_string(),
                Repeat::All => "all".to_string(),
                Repeat::One => "one".to_string(),
            },
            shuffle: zone.settings.shuffle,
        };

        let outputs = zone
            .outputs
            .iter()
            .map(|o| OutputPayload {
                output_id: o.output_id.clone(),
                display_name: o.display_name.clone(),
                volume: o.volume.as_ref().map(|v| VolumePayload {
                    value: v.value,
                    scale: match v.scale {
                        Scale::Decibel => "decibel".to_string(),
                        Scale::Number => "number".to_string(),
                        Scale::Incremental => "incremental".to_string(),
                    },
                    is_muted: v.is_muted,
                    step: v.step,
                }),
            })
            .collect();

        Self {
            zone_id: zone.zone_id.clone(),
            display_name: zone.display_name.clone(),
            state: state_str.to_string(),
            now_playing,
            queue_time_remaining: zone.queue_time_remaining,
            is_next_allowed: zone.is_next_allowed,
            is_previous_allowed: zone.is_previous_allowed,
            settings,
            outputs,
        }
    }
}

#[derive(Serialize, Clone, Debug)]
pub struct NowPlayingPayload {
    pub seek_position: Option<i64>,
    pub length: Option<u32>,
    pub line1: String,
    pub line2: String,
    pub line3: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct ZoneSettingsPayload {
    pub auto_radio: bool,
    pub repeat: String,
    pub shuffle: bool,
}

#[derive(Serialize, Clone, Debug)]
pub struct OutputPayload {
    pub output_id: String,
    pub display_name: String,
    pub volume: Option<VolumePayload>,
}

#[derive(Serialize, Clone, Debug)]
pub struct VolumePayload {
    pub value: Option<f32>,
    pub scale: String,
    pub is_muted: Option<bool>,
    pub step: Option<f32>,
}

#[derive(Serialize, Clone, Debug)]
pub struct SeekPayload {
    pub seek_position: Option<i64>,
    pub queue_time_remaining: i64,
}

#[derive(Serialize, Clone, Debug)]
pub struct ZoneListEntry {
    pub endpoint: EndPoint,
    pub name: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct GroupingEntry {
    pub output_id: String,
    pub name: String,
    pub included: bool,
}

pub struct AppState {
    browse_items: Vec<browse::Item>,
    queue_items: Vec<QueueItem>,
    selected_zone: Option<Zone>,
    pending_item_key: Option<String>,
    pub last_browse_item_key: Option<String>,
    matched_preset: Option<String>,
    draft_match: bool,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            browse_items: Vec::new(),
            queue_items: Vec::new(),
            selected_zone: None,
            pending_item_key: None,
            last_browse_item_key: None,
            matched_preset: None,
            draft_match: false,
        }
    }

    pub async fn process_event(
        &mut self,
        event: IoEvent,
        to_roon: &Sender<IoEvent>,
        app_handle: &tauri::AppHandle,
    ) {
        match event {
            IoEvent::CoreName(name) => {
                let _ = app_handle.emit("roon://core-name", &name);
            }
            IoEvent::BrowseTitle(title) => {
                let _ = app_handle.emit("roon://browse-title", &title);
            }
            IoEvent::BrowseList(offset, mut items) => {
                if offset == 0 {
                    self.browse_items = items;
                } else if offset == self.browse_items.len() {
                    self.browse_items.append(&mut items);
                } else {
                    let _ = to_roon.send(IoEvent::BrowseRefresh).await;
                    return;
                }

                let payload: Vec<BrowseItemPayload> =
                    self.browse_items.iter().map(|i| i.into()).collect();
                let _ = app_handle.emit("roon://browse-list", &payload);
            }
            IoEvent::QueueList(queue_list) => {
                let _ = to_roon
                    .send(IoEvent::QueueListLast(queue_list.last().cloned()))
                    .await;
                self.queue_items = queue_list;

                let payload: Vec<QueueItemPayload> =
                    self.queue_items.iter().map(|i| i.into()).collect();
                let _ = app_handle.emit("roon://queue-list", &payload);
            }
            IoEvent::QueueListChanges(changes) => {
                self.apply_queue_changes(&changes);

                let _ = to_roon
                    .send(IoEvent::QueueListLast(self.queue_items.last().cloned()))
                    .await;

                let payload: Vec<QueueItemPayload> =
                    self.queue_items.iter().map(|i| i.into()).collect();
                let _ = app_handle.emit("roon://queue-list", &payload);
            }
            IoEvent::QueueModeCurrent(queue_mode) => {
                let mode_str = match queue_mode {
                    QueueMode::Manual => None,
                    QueueMode::RoonRadio => Some("Roon Radio"),
                    QueueMode::RandomAlbum => Some("Random Album"),
                    QueueMode::RandomTrack => Some("Random Track"),
                };
                let _ = app_handle.emit("roon://queue-mode", &mode_str);
            }
            IoEvent::Zones(zones) => {
                let payload: Vec<ZoneListEntry> = zones
                    .iter()
                    .map(|(ep, name)| ZoneListEntry {
                        endpoint: ep.clone(),
                        name: name.clone(),
                    })
                    .collect();
                let _ = app_handle.emit("roon://zones", &payload);
            }
            IoEvent::ZoneSelect => {
                self.pending_item_key = self.last_browse_item_key.take();
                let _ = app_handle.emit("roon://zone-select", &());
            }
            IoEvent::ZoneChanged(zone) => {
                self.selected_zone = Some(zone.clone());

                if self.pending_item_key.is_some() {
                    let _ = to_roon
                        .send(IoEvent::BrowseSelected(self.pending_item_key.take()))
                        .await;
                }

                let payload: ZonePayload = (&zone).into();
                let _ = app_handle.emit("roon://zone-changed", &payload);
            }
            IoEvent::ZoneRemoved(_) => {
                self.selected_zone = None;
                let _ = app_handle.emit("roon://zone-removed", &());
            }
            IoEvent::ZoneSeek(seek) => {
                let payload = SeekPayload {
                    seek_position: seek.seek_position,
                    queue_time_remaining: seek.queue_time_remaining,
                };
                let _ = app_handle.emit("roon://seek", &payload);
            }
            IoEvent::ZoneGrouping(grouping) => {
                let payload = grouping.as_ref().map(|g| {
                    g.iter()
                        .map(|(id, name, included)| GroupingEntry {
                            output_id: id.clone(),
                            name: name.clone(),
                            included: *included,
                        })
                        .collect::<Vec<_>>()
                });
                let _ = app_handle.emit("roon://grouping", &payload);
            }
            IoEvent::ZonePresetMatched(preset) => {
                if self.draft_match {
                    self.draft_match = false;
                    let _ = app_handle.emit("roon://preset-matched-draft", &preset);
                } else {
                    self.matched_preset = preset.clone();
                    let _ = app_handle.emit("roon://preset-matched", &preset);
                }
            }
            IoEvent::PauseOnTrackEndActive(active) => {
                let _ = app_handle.emit("roon://pause-on-track-end", &active);
            }
            _ => {}
        }
    }

    fn apply_queue_changes(&mut self, changes: &[QueueChange]) {
        for change in changes {
            match change.operation {
                QueueOperation::Insert => {
                    if let Some(items) = change.items.as_ref() {
                        for (i, item) in items.iter().enumerate() {
                            if change.index + i <= self.queue_items.len() {
                                self.queue_items.insert(change.index + i, item.clone());
                            }
                        }
                    }
                }
                QueueOperation::Remove => {
                    if let Some(count) = change.count {
                        for _ in 0..count {
                            if change.index < self.queue_items.len() {
                                self.queue_items.remove(change.index);
                            }
                        }
                    }
                }
            }
        }
    }

    pub fn set_draft_match(&mut self) {
        self.draft_match = true;
    }

}
