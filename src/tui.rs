use crate::config::{get_all_hosts, save_bookmarks, HostConfig, HostSource};
use crate::error::Result;
use crate::terminal::AlternateScreenGuard;
use crossterm::event::{self, Event, KeyCode, KeyModifiers};
use ratatui::backend::CrosstermBackend;
use ratatui::layout::{Alignment, Constraint, Direction, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Clear, List, ListItem, ListState, Paragraph};
use ratatui::Terminal;
use std::io::stdout;

enum InputMode {
    Normal,
    Filter,
    AddHost {
        step: AddHostStep,
        name: String,
        hostname: String,
        user: String,
        port: String,
    },
}

enum AddHostStep {
    Name,
    Hostname,
    User,
    Port,
}

pub struct TuiApp {
    hosts: Vec<HostConfig>,
    filtered_indices: Vec<usize>,
    list_state: ListState,
    filter_query: String,
    input_mode: InputMode,
    should_quit: bool,
    selected_host: Option<HostConfig>,
}

impl TuiApp {
    pub fn new() -> Self {
        let hosts = get_all_hosts();
        let filtered_indices: Vec<usize> = (0..hosts.len()).collect();
        let mut list_state = ListState::default();
        if !filtered_indices.is_empty() {
            list_state.select(Some(0));
        }

        Self {
            hosts,
            filtered_indices,
            list_state,
            filter_query: String::new(),
            input_mode: InputMode::Normal,
            should_quit: false,
            selected_host: None,
        }
    }

    fn apply_filter(&mut self) {
        let q = self.filter_query.to_lowercase();
        self.filtered_indices = self
            .hosts
            .iter()
            .enumerate()
            .filter(|(_, h)| {
                if q.is_empty() {
                    return true;
                }
                h.name.to_lowercase().contains(&q)
                    || h.hostname.to_lowercase().contains(&q)
                    || h.user
                        .as_deref()
                        .map(|u| u.to_lowercase().contains(&q))
                        .unwrap_or(false)
            })
            .map(|(i, _)| i)
            .collect();

        if self.filtered_indices.is_empty() {
            self.list_state.select(None);
        } else {
            let current = self.list_state.selected().unwrap_or(0);
            if current >= self.filtered_indices.len() {
                self.list_state.select(Some(self.filtered_indices.len() - 1));
            } else {
                self.list_state.select(Some(current));
            }
        }
    }

    fn next(&mut self) {
        if self.filtered_indices.is_empty() {
            return;
        }
        let i = match self.list_state.selected() {
            Some(i) => {
                if i >= self.filtered_indices.len() - 1 {
                    0
                } else {
                    i + 1
                }
            }
            None => 0,
        };
        self.list_state.select(Some(i));
    }

    fn previous(&mut self) {
        if self.filtered_indices.is_empty() {
            return;
        }
        let i = match self.list_state.selected() {
            Some(i) => {
                if i == 0 {
                    self.filtered_indices.len() - 1
                } else {
                    i - 1
                }
            }
            None => 0,
        };
        self.list_state.select(Some(i));
    }

    fn selected_host_config(&self) -> Option<HostConfig> {
        self.list_state
            .selected()
            .and_then(|idx| self.filtered_indices.get(idx))
            .and_then(|&host_idx| self.hosts.get(host_idx).cloned())
    }

    fn delete_selected_bookmark(&mut self) {
        if let Some(idx) = self.list_state.selected() {
            if let Some(&host_idx) = self.filtered_indices.get(idx) {
                if let Some(host) = self.hosts.get(host_idx) {
                    if host.source == HostSource::Bookmark {
                        self.hosts.remove(host_idx);
                        // Filter and save bookmarks
                        let bookmarks: Vec<HostConfig> = self
                            .hosts
                            .iter()
                            .filter(|h| h.source == HostSource::Bookmark)
                            .cloned()
                            .collect();
                        let _ = save_bookmarks(&bookmarks);
                        self.apply_filter();
                    }
                }
            }
        }
    }
}

pub fn run_session_picker() -> Result<Option<HostConfig>> {
    let _guard = AlternateScreenGuard::enter()?;
    let backend = CrosstermBackend::new(stdout());
    let mut terminal = Terminal::new(backend)?;

    let mut app = TuiApp::new();

    while !app.should_quit {
        terminal.draw(|f| ui(f, &mut app))?;

        if event::poll(std::time::Duration::from_millis(50))? {
            if let Event::Key(key) = event::read()? {
                // Ignore key release events
                if key.kind != event::KeyEventKind::Press {
                    continue;
                }

                match &mut app.input_mode {
                    InputMode::Normal => match key.code {
                        KeyCode::Char('q') | KeyCode::Esc => {
                            app.should_quit = true;
                        }
                        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            app.should_quit = true;
                        }
                        KeyCode::Down | KeyCode::Char('j') => {
                            app.next();
                        }
                        KeyCode::Up | KeyCode::Char('k') => {
                            app.previous();
                        }
                        KeyCode::Enter => {
                            if let Some(host) = app.selected_host_config() {
                                app.selected_host = Some(host);
                                app.should_quit = true;
                            }
                        }
                        KeyCode::Char('/') => {
                            app.input_mode = InputMode::Filter;
                        }
                        KeyCode::Char('a') | KeyCode::Char('n') => {
                            app.input_mode = InputMode::AddHost {
                                step: AddHostStep::Name,
                                name: String::new(),
                                hostname: String::new(),
                                user: String::new(),
                                port: "22".to_string(),
                            };
                        }
                        KeyCode::Char('d') => {
                            app.delete_selected_bookmark();
                        }
                        _ => {}
                    },
                    InputMode::Filter => match key.code {
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                        }
                        KeyCode::Enter => {
                            app.input_mode = InputMode::Normal;
                        }
                        KeyCode::Char(c) => {
                            app.filter_query.push(c);
                            app.apply_filter();
                        }
                        KeyCode::Backspace => {
                            app.filter_query.pop();
                            app.apply_filter();
                        }
                        _ => {}
                    },
                    InputMode::AddHost {
                        step,
                        name,
                        hostname,
                        user,
                        port,
                    } => match key.code {
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                        }
                        KeyCode::Enter => match step {
                            AddHostStep::Name => {
                                if !name.is_empty() {
                                    *step = AddHostStep::Hostname;
                                }
                            }
                            AddHostStep::Hostname => {
                                if !hostname.is_empty() {
                                    *step = AddHostStep::User;
                                }
                            }
                            AddHostStep::User => {
                                *step = AddHostStep::Port;
                            }
                            AddHostStep::Port => {
                                let port_num = port.parse::<u16>().unwrap_or(22);
                                let new_host = HostConfig {
                                    name: name.clone(),
                                    hostname: hostname.clone(),
                                    user: if user.is_empty() { None } else { Some(user.clone()) },
                                    port: port_num,
                                    identity_file: None,
                                    description: Some("Saved Bookmark".to_string()),
                                    source: HostSource::Bookmark,
                                };

                                app.hosts.insert(0, new_host);
                                let bookmarks: Vec<HostConfig> = app
                                    .hosts
                                    .iter()
                                    .filter(|h| h.source == HostSource::Bookmark)
                                    .cloned()
                                    .collect();
                                let _ = save_bookmarks(&bookmarks);

                                app.apply_filter();
                                app.input_mode = InputMode::Normal;
                            }
                        },
                        KeyCode::Char(c) => match step {
                            AddHostStep::Name => name.push(c),
                            AddHostStep::Hostname => hostname.push(c),
                            AddHostStep::User => user.push(c),
                            AddHostStep::Port => {
                                if c.is_ascii_digit() {
                                    port.push(c);
                                }
                            }
                        },
                        KeyCode::Backspace => match step {
                            AddHostStep::Name => {
                                name.pop();
                            }
                            AddHostStep::Hostname => {
                                hostname.pop();
                            }
                            AddHostStep::User => {
                                user.pop();
                            }
                            AddHostStep::Port => {
                                port.pop();
                            }
                        },
                        _ => {}
                    },
                }
            }
        }
    }

    Ok(app.selected_host)
}

fn ui(f: &mut ratatui::Frame, app: &mut TuiApp) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Header banner
            Constraint::Length(3), // Search / filter bar
            Constraint::Min(8),    // Main list & details split
            Constraint::Length(3), // Footer keyhints
        ])
        .split(f.area());

    // 1. Header Banner
    let header_text = vec![Line::from(vec![
        Span::styled(" THEIA SSH ", Style::default().fg(Color::Black).bg(Color::Cyan).add_modifier(Modifier::BOLD)),
        Span::raw("  "),
        Span::styled(
            "Terminal SSH Client & Session Manager",
            Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD),
        ),
        Span::styled("  [macOS v0.1.0]", Style::default().fg(Color::DarkGray)),
    ])];
    let header = Paragraph::new(header_text)
        .alignment(Alignment::Left)
        .block(
            Block::default()
                .borders(Borders::BOTTOM)
                .border_style(Style::default().fg(Color::DarkGray))
                .border_type(BorderType::Rounded),
        );
    f.render_widget(header, chunks[0]);

    // 2. Search / Filter bar
    let is_filtering = matches!(app.input_mode, InputMode::Filter);
    let filter_style = if is_filtering {
        Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(Color::Gray)
    };

    let filter_text = if app.filter_query.is_empty() && !is_filtering {
        Line::from(vec![
            Span::styled("  Search hosts: ", Style::default().fg(Color::DarkGray)),
            Span::styled("press '/' to type filter...", Style::default().fg(Color::DarkGray).add_modifier(Modifier::ITALIC)),
        ])
    } else {
        Line::from(vec![
            Span::styled("  Search hosts: ", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
            Span::styled(&app.filter_query, Style::default().fg(Color::White)),
            if is_filtering {
                Span::styled("▎", Style::default().fg(Color::Yellow).add_modifier(Modifier::SLOW_BLINK))
            } else {
                Span::raw("")
            },
        ])
    };

    let filter_block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(filter_style)
        .title(" Filter ");
    let filter_widget = Paragraph::new(filter_text).block(filter_block);
    f.render_widget(filter_widget, chunks[1]);

    // 3. Main Area: Left (Host List) and Right (Host Details)
    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(chunks[2]);

    // Host List
    let items: Vec<ListItem> = app
        .filtered_indices
        .iter()
        .map(|&idx| {
            let host = &app.hosts[idx];
            let badge = match host.source {
                HostSource::Bookmark => Span::styled(" [BM] ", Style::default().fg(Color::Magenta)),
                HostSource::SshConfig => Span::styled(" [SSH] ", Style::default().fg(Color::Green)),
                HostSource::Direct => Span::styled(" [DIR] ", Style::default().fg(Color::Blue)),
            };

            let target_str = host.display_target();
            let line = Line::from(vec![
                badge,
                Span::styled(format!("{:<18}", host.name), Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
                Span::styled(target_str, Style::default().fg(Color::DarkGray)),
            ]);

            ListItem::new(line)
        })
        .collect();

    let list_title = format!(" Configured Hosts ({}) ", app.filtered_indices.len());
    let list_widget = List::new(items)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(Style::default().fg(Color::Cyan))
                .title(list_title),
        )
        .highlight_style(
            Style::default()
                .bg(Color::Rgb(30, 50, 70))
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        )
        .highlight_symbol("▶ ");

    f.render_stateful_widget(list_widget, main_chunks[0], &mut app.list_state);

    // Host Details Pane
    let selected_host = app.selected_host_config();
    let details_content = if let Some(ref h) = selected_host {
        vec![
            Line::from(vec![
                Span::styled("Host Alias:    ", Style::default().fg(Color::Cyan)),
                Span::styled(&h.name, Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
            ]),
            Line::from(""),
            Line::from(vec![
                Span::styled("Remote Target: ", Style::default().fg(Color::Cyan)),
                Span::styled(h.display_target(), Style::default().fg(Color::Yellow)),
            ]),
            Line::from(vec![
                Span::styled("Hostname / IP: ", Style::default().fg(Color::Cyan)),
                Span::styled(&h.hostname, Style::default().fg(Color::White)),
            ]),
            Line::from(vec![
                Span::styled("SSH Port:      ", Style::default().fg(Color::Cyan)),
                Span::styled(h.port.to_string(), Style::default().fg(Color::White)),
            ]),
            Line::from(vec![
                Span::styled("User:          ", Style::default().fg(Color::Cyan)),
                Span::styled(
                    h.user.as_deref().unwrap_or("<default user>"),
                    Style::default().fg(Color::White),
                ),
            ]),
            Line::from(vec![
                Span::styled("Identity File: ", Style::default().fg(Color::Cyan)),
                Span::styled(
                    h.identity_file.as_deref().unwrap_or("ssh-agent / default keys"),
                    Style::default().fg(Color::Gray),
                ),
            ]),
            Line::from(vec![
                Span::styled("Config Source: ", Style::default().fg(Color::Cyan)),
                match h.source {
                    HostSource::Bookmark => Span::styled("Bookmark (~/.config/theia-ssh/hosts.json)", Style::default().fg(Color::Magenta)),
                    HostSource::SshConfig => Span::styled("OpenSSH Config (~/.ssh/config)", Style::default().fg(Color::Green)),
                    HostSource::Direct => Span::styled("Direct CLI Target", Style::default().fg(Color::Blue)),
                },
            ]),
            Line::from(""),
            Line::from(vec![
                Span::styled("Actions:       ", Style::default().fg(Color::DarkGray)),
                Span::styled("Press [Enter] to initiate SSH handshake", Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
            ]),
        ]
    } else {
        vec![Line::from(Span::styled(
            "No host selected or list is empty.",
            Style::default().fg(Color::DarkGray).add_modifier(Modifier::ITALIC),
        ))]
    };

    let details_widget = Paragraph::new(details_content).block(
        Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(Color::DarkGray))
            .title(" Host Details "),
    );
    f.render_widget(details_widget, main_chunks[1]);

    // 4. Footer Help Bar
    let footer_text = Line::from(vec![
        Span::styled(" [Enter] ", Style::default().fg(Color::Black).bg(Color::Green).add_modifier(Modifier::BOLD)),
        Span::raw(" Connect  "),
        Span::styled(" [/] ", Style::default().fg(Color::Black).bg(Color::Yellow).add_modifier(Modifier::BOLD)),
        Span::raw(" Filter  "),
        Span::styled(" [a] ", Style::default().fg(Color::Black).bg(Color::Cyan).add_modifier(Modifier::BOLD)),
        Span::raw(" Add Bookmark  "),
        Span::styled(" [d] ", Style::default().fg(Color::Black).bg(Color::Red).add_modifier(Modifier::BOLD)),
        Span::raw(" Delete  "),
        Span::styled(" [q/Esc] ", Style::default().fg(Color::Black).bg(Color::DarkGray)),
        Span::raw(" Quit"),
    ]);

    let footer = Paragraph::new(footer_text)
        .alignment(Alignment::Center)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(Style::default().fg(Color::DarkGray)),
        );
    f.render_widget(footer, chunks[3]);

    // Render Modal Dialog for Add Host
    if let InputMode::AddHost {
        step,
        name,
        hostname,
        user,
        port,
    } = &app.input_mode
    {
        render_add_host_modal(f, step, name, hostname, user, port);
    }
}

fn render_add_host_modal(
    f: &mut ratatui::Frame,
    step: &AddHostStep,
    name: &str,
    hostname: &str,
    user: &str,
    port: &str,
) {
    let area = centered_rect(60, 45, f.area());
    f.render_widget(Clear, area);

    let modal_block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Thick)
        .border_style(Style::default().fg(Color::Magenta))
        .title(" Add New SSH Host Bookmark ");

    let inner = modal_block.inner(area);
    f.render_widget(modal_block, area);

    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),
            Constraint::Length(2),
            Constraint::Length(2),
            Constraint::Length(2),
            Constraint::Length(2),
            Constraint::Min(1),
        ])
        .split(inner);

    let prompt_field = |label: &str, value: &str, active: bool| -> Line<'static> {
        let label_style = if active {
            Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(Color::Cyan)
        };
        let cursor = if active { "▎" } else { "" };
        Line::from(vec![
            Span::styled(format!("{:<16}", label), label_style),
            Span::styled(value.to_string(), Style::default().fg(Color::White).add_modifier(Modifier::BOLD)),
            Span::styled(cursor.to_string(), Style::default().fg(Color::Yellow)),
        ])
    };

    let title_line = Line::from(Span::styled(
        "Enter connection parameters (Press Enter to advance, Esc to cancel):",
        Style::default().fg(Color::DarkGray),
    ));
    f.render_widget(Paragraph::new(title_line), rows[0]);

    let name_line = prompt_field("Alias Name:", name, matches!(step, AddHostStep::Name));
    f.render_widget(Paragraph::new(name_line), rows[1]);

    let host_line = prompt_field("Hostname / IP:", hostname, matches!(step, AddHostStep::Hostname));
    f.render_widget(Paragraph::new(host_line), rows[2]);

    let user_line = prompt_field("User (optional):", user, matches!(step, AddHostStep::User));
    f.render_widget(Paragraph::new(user_line), rows[3]);

    let port_line = prompt_field("Port (default 22):", port, matches!(step, AddHostStep::Port));
    f.render_widget(Paragraph::new(port_line), rows[4]);
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}
