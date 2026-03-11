use std::sync::Arc;
use std::{fs, path};
use tauri::{Emitter, Manager};
use time::UtcOffset;
use tokio::sync::{mpsc, Mutex};
use simplelog::{ConfigBuilder, WriteLogger, format_description};

mod commands;
mod io;
mod roon_handler;
mod state;

use commands::*;
use state::AppState;

fn init_logger(log_path: &str) {
    let log_path_obj = path::Path::new(log_path);
    let _ = fs::create_dir_all(log_path_obj.parent().unwrap());
    let time_format = format_description!("[hour]:[minute]:[second].[subsecond]");
    let seconds = chrono::Local::now().offset().local_minus_utc();
    let utc_offset = UtcOffset::from_whole_seconds(seconds).unwrap_or(UtcOffset::UTC);
    let config = ConfigBuilder::new()
        .set_time_format_custom(time_format)
        .set_time_offset(utc_offset)
        .build();

    if let Ok(file) = fs::File::create(log_path) {
        let _ = WriteLogger::init(log::LevelFilter::Info, config, file);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| ".".to_string());

            let _ = fs::create_dir_all(&config_dir);

            let log_path = path::Path::new(&config_dir)
                .join("roon-gui.log")
                .to_string_lossy()
                .to_string();
            init_logger(&log_path);

            log::info!("=== Roon GUI starting ===");
            log::info!("Config dir: {}", config_dir);
            log::info!("Log file: {}", log_path);

            let config_path = path::Path::new(&config_dir)
                .join("config.json")
                .to_string_lossy()
                .to_string();
            log::info!("Config path: {}", config_path);

            let (to_app_tx, mut to_app_rx) = mpsc::channel::<io::IoEvent>(32);
            let (to_roon_tx, from_app_rx) = mpsc::channel::<io::IoEvent>(32);

            let bridge_sender = to_roon_tx.clone();
            let app_state = Arc::new(Mutex::new(AppState::new()));

            app.manage(RoonSender(Mutex::new(to_roon_tx)));
            app.manage(SharedAppState(app_state.clone()));
            app.manage(ConfigDir(config_dir.clone()));

            let options = roon_handler::Options {
                config: config_path.clone(),
                ip: None,
                port: "9330".to_string(),
            };

            let to_app_for_status = to_app_tx.clone();

            tauri::async_runtime::spawn(async move {
                log::info!("Starting Roon handler task...");

                roon_handler::start(options, to_app_tx, from_app_rx).await;

                log::info!("Roon handler start() returned, inner tasks are running");
            });

            let app_handle = app.handle().clone();
            let config_dir_for_event = config_dir.clone();

            tauri::async_runtime::spawn(async move {
                log::info!("Event bridge task started");

                // Emit initial status so the frontend knows the app is alive
                let _ = to_app_for_status
                    .send(io::IoEvent::CoreName(None))
                    .await;

                while let Some(event) = to_app_rx.recv().await {
                    let mut state = app_state.lock().await;
                    state
                        .process_event(event, &bridge_sender, &app_handle)
                        .await;
                }

                log::warn!("Event bridge loop ended — this should not happen");
            });

            // Emit the config dir to the frontend for debugging
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                let _ = handle.emit("roon://config-dir", &config_dir_for_event);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            browse_select,
            browse_with_input,
            browse_back,
            browse_home,
            browse_refresh,
            queue_select,
            queue_clear,
            queue_mode_next,
            queue_mode_append,
            zone_select,
            zone_group_req,
            zone_grouped,
            zone_save_preset,
            zone_delete_preset,
            zone_match_preset,
            transport_control,
            mute,
            change_volume,
            toggle_repeat,
            toggle_shuffle,
            pause_on_track_end,
            get_config_dir,
            connect_to_ip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
