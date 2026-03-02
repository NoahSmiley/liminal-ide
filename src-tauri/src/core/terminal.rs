use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::core::events::{AppEvent, EventBus, TerminalEvent};
use crate::error::TermError;

struct TerminalInstance {
    writer: Box<dyn Write + Send>,
    _child: Box<dyn portable_pty::Child + Send + Sync>,
}

pub struct TerminalManager {
    terminals: Mutex<HashMap<Uuid, TerminalInstance>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            terminals: Mutex::new(HashMap::new()),
        }
    }

    pub async fn spawn_shell(
        &self,
        project_dir: PathBuf,
        event_bus: EventBus,
    ) -> Result<Uuid, TermError> {
        let terminal_id = Uuid::new_v4();
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;

        let mut cmd = CommandBuilder::new_default_prog();
        cmd.cwd(&project_dir);

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;

        let tid = terminal_id;
        tokio::task::spawn_blocking(move || {
            let mut buf = [0u8; 1024];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        event_bus.emit(AppEvent::Terminal(TerminalEvent::Exit {
                            terminal_id: tid,
                            code: 0,
                        }));
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        event_bus.emit(AppEvent::Terminal(TerminalEvent::Output {
                            terminal_id: tid,
                            data,
                        }));
                    }
                    Err(_) => break,
                }
            }
        });

        let instance = TerminalInstance {
            writer,
            _child: child,
        };
        self.terminals.lock().await.insert(terminal_id, instance);
        Ok(terminal_id)
    }

    pub async fn send_input(
        &self,
        terminal_id: Uuid,
        input: &str,
    ) -> Result<(), TermError> {
        let mut terminals = self.terminals.lock().await;
        let terminal = terminals.get_mut(&terminal_id).ok_or(
            TermError::SpawnFailed(format!("Terminal {} not found", terminal_id)),
        )?;
        terminal
            .writer
            .write_all(input.as_bytes())
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;
        Ok(())
    }

    pub async fn kill(&self, terminal_id: Uuid) -> Result<(), TermError> {
        let mut terminals = self.terminals.lock().await;
        terminals.remove(&terminal_id);
        Ok(())
    }
}
