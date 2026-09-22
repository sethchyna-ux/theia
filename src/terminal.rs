use std::io::{stdout, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use crossterm::cursor::{Hide, Show};
use crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, size, EnterAlternateScreen, LeaveAlternateScreen,
};

static RAW_MODE_ACTIVE: AtomicBool = AtomicBool::new(false);

/// RAII Guard that manages raw terminal mode.
/// Guarantees that raw mode is disabled when dropped or when the application panics.
pub struct TerminalGuard {
    active: bool,
}

impl TerminalGuard {
    pub fn enter() -> std::io::Result<Self> {
        enable_raw_mode()?;
        RAW_MODE_ACTIVE.store(true, Ordering::SeqCst);

        // Register a panic hook so that if a panic occurs, raw mode is always restored
        // before the panic message is printed, preventing terminal borking.
        let default_hook = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |panic_info| {
            if RAW_MODE_ACTIVE.swap(false, Ordering::SeqCst) {
                let _ = disable_raw_mode();
                let mut out = stdout();
                let _ = crossterm::execute!(out, Show, LeaveAlternateScreen);
            }
            default_hook(panic_info);
        }));

        Ok(Self { active: true })
    }

    pub fn leave(&mut self) {
        if self.active {
            let _ = disable_raw_mode();
            RAW_MODE_ACTIVE.store(false, Ordering::SeqCst);
            self.active = false;
        }
    }
}

impl Drop for TerminalGuard {
    fn drop(&mut self) {
        self.leave();
    }
}

/// RAII Guard for TUI Alternate Screen.
pub struct AlternateScreenGuard {
    _raw_guard: TerminalGuard,
}

impl AlternateScreenGuard {
    pub fn enter() -> std::io::Result<Self> {
        let raw_guard = TerminalGuard::enter()?;
        let mut out = stdout();
        crossterm::execute!(out, EnterAlternateScreen, Hide)?;
        out.flush()?;
        Ok(Self { _raw_guard: raw_guard })
    }
}

impl Drop for AlternateScreenGuard {
    fn drop(&mut self) {
        let mut out = stdout();
        let _ = crossterm::execute!(out, Show, LeaveAlternateScreen);
        let _ = out.flush();
    }
}

/// Query current terminal dimensions (columns, rows).
pub fn get_terminal_size() -> (u16, u16) {
    size().unwrap_or((80, 24))
}
