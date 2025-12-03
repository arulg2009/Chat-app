use tauri::Manager;

#[tauri::command]
fn is_online() -> bool {
    // This can be enhanced with actual network check
    true
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .setup(|app| {
      #[cfg(debug_assertions)]
      {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Set up window for mobile
      #[cfg(mobile)]
      {
        let window = app.get_webview_window("main").unwrap();
        window.set_fullscreen(true).ok();
      }
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![is_online, get_app_version])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
