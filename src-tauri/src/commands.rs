use std::sync::Arc;

use roon_api::transport::{volume, Control};
use tauri::{Manager, State};
use tokio::sync::{mpsc, mpsc::Sender, Mutex};

use crate::io::{EndPoint, IoEvent};
use crate::roon_handler;
use crate::state::AppState;

pub struct RoonSender(pub Mutex<Sender<IoEvent>>);
pub struct SharedAppState(pub Arc<Mutex<AppState>>);
pub struct ConfigDir(pub String);

#[tauri::command]
pub async fn browse_select(
    item_key: Option<String>,
    sender: State<'_, RoonSender>,
    state: State<'_, SharedAppState>,
) -> Result<(), String> {
    let mut app = state.0.lock().await;
    app.last_browse_item_key = item_key.clone();
    sender
        .0
        .lock()
        .await
        .send(IoEvent::BrowseSelected(item_key))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browse_with_input(
    input: String,
    item_key: Option<String>,
    sender: State<'_, RoonSender>,
) -> Result<(), String> {
    let tx = sender.0.lock().await;
    tx.send(IoEvent::BrowseInput(input))
        .await
        .map_err(|e| e.to_string())?;
    tx.send(IoEvent::BrowseSelected(item_key))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browse_back(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::BrowseBack)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browse_home(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::BrowseHome)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browse_refresh(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::BrowseRefresh)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn queue_select(
    queue_item_id: u32,
    sender: State<'_, RoonSender>,
) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::QueueSelected(queue_item_id))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn queue_clear(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::QueueClear)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn queue_mode_next(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::QueueModeNext)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn queue_mode_append(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::QueueModeAppend)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn zone_select(
    endpoint_type: String,
    endpoint_id: String,
    sender: State<'_, RoonSender>,
) -> Result<(), String> {
    let endpoint = match endpoint_type.as_str() {
        "Zone" => EndPoint::Zone(endpoint_id),
        "Output" => EndPoint::Output(endpoint_id),
        "Preset" => EndPoint::Preset(endpoint_id),
        _ => return Err("Invalid endpoint type".to_string()),
    };
    sender
        .0
        .lock()
        .await
        .send(IoEvent::ZoneSelected(endpoint))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn zone_group_req(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::ZoneGroupReq)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn zone_grouped(
    output_ids: Vec<String>,
    sender: State<'_, RoonSender>,
) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::ZoneGrouped(output_ids))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn zone_save_preset(
    name: String,
    output_ids: Vec<String>,
    sender: State<'_, RoonSender>,
) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::ZoneSavePreset(name, output_ids))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn zone_delete_preset(
    name: String,
    sender: State<'_, RoonSender>,
) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::ZoneDeletePreset(name))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn zone_match_preset(
    output_ids: Vec<String>,
    sender: State<'_, RoonSender>,
    state: State<'_, SharedAppState>,
) -> Result<(), String> {
    state.0.lock().await.set_draft_match();
    sender
        .0
        .lock()
        .await
        .send(IoEvent::ZoneMatchPreset(output_ids))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn transport_control(
    action: String,
    sender: State<'_, RoonSender>,
) -> Result<(), String> {
    let control = match action.as_str() {
        "play_pause" => Control::PlayPause,
        "next" => Control::Next,
        "previous" => Control::Previous,
        "stop" => Control::Stop,
        "pause" => Control::Pause,
        "play" => Control::Play,
        _ => return Err("Invalid control action".to_string()),
    };
    sender
        .0
        .lock()
        .await
        .send(IoEvent::Control(control))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mute(action: String, sender: State<'_, RoonSender>) -> Result<(), String> {
    let how = match action.as_str() {
        "mute" => volume::Mute::Mute,
        "unmute" => volume::Mute::Unmute,
        _ => return Err("Invalid mute action".to_string()),
    };
    sender
        .0
        .lock()
        .await
        .send(IoEvent::Mute(how))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn change_volume(steps: i32, sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::ChangeVolume(steps))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_repeat(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::Repeat)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_shuffle(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::Shuffle)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pause_on_track_end(sender: State<'_, RoonSender>) -> Result<(), String> {
    sender
        .0
        .lock()
        .await
        .send(IoEvent::PauseOnTrackEndReq)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_config_dir(config_dir: State<'_, ConfigDir>) -> Result<String, String> {
    Ok(config_dir.0.clone())
}

#[tauri::command]
pub async fn connect_to_ip(
    ip: String,
    port: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let config_dir = app_handle.state::<ConfigDir>();
    let config_path = std::path::Path::new(&config_dir.0)
        .join("config.json")
        .to_string_lossy()
        .to_string();

    let (to_app_tx, mut to_app_rx) = mpsc::channel::<IoEvent>(32);
    let (to_roon_tx, from_app_rx) = mpsc::channel::<IoEvent>(32);
    let bridge_sender = to_roon_tx.clone();

    // Replace the managed sender so commands go to the new handler
    {
        let managed_sender = app_handle.state::<RoonSender>();
        let mut sender = managed_sender.0.lock().await;
        *sender = to_roon_tx;
    }

    let app_state = app_handle.state::<SharedAppState>().0.clone();

    let options = roon_handler::Options {
        config: config_path,
        ip: Some(ip.clone()),
        port: port.unwrap_or_else(|| "9330".to_string()),
    };

    log::info!("Attempting direct connection to {}...", ip);

    tauri::async_runtime::spawn(async move {
        roon_handler::start(options, to_app_tx, from_app_rx).await;
    });

    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = to_app_rx.recv().await {
            let mut state = app_state.lock().await;
            state
                .process_event(event, &bridge_sender, &handle)
                .await;
        }
    });

    Ok(())
}
