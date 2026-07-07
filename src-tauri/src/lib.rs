#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![
    tauri_plugin_sql::Migration {
      version: 1,
      description: "create_initial_tables",
      sql: "
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          note TEXT,
          is_deleted INTEGER DEFAULT 0,
          revision INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS schedules (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          start_time TEXT NOT NULL,
          end_time TEXT,
          recurrence TEXT,
          category_id TEXT,
          status TEXT NOT NULL,
          reminder TEXT,
          important INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          is_deleted INTEGER DEFAULT 0,
          revision INTEGER DEFAULT 0
        );
      ",
      kind: tauri_plugin_sql::MigrationKind::Up,
    }
  ];

  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:schedule.db", migrations)
        .build()
    )
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
