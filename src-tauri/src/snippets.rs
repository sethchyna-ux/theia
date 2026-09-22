use crate::models::Snippet;
use std::fs;
use std::path::PathBuf;

pub fn get_snippets_path() -> Option<PathBuf> {
    dirs::config_dir().map(|c| c.join("theia-ssh").join("snippets.json"))
}

pub fn load_snippets() -> Vec<Snippet> {
    let path = match get_snippets_path() {
        Some(p) => p,
        None => return default_snippets(),
    };

    if !path.is_file() {
        let def = default_snippets();
        let _ = save_snippets(&def);
        return def;
    }

    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return default_snippets(),
    };

    let mut list = serde_json::from_str::<Vec<Snippet>>(&content).unwrap_or_default();
    if list.is_empty() {
        list = default_snippets();
        let _ = save_snippets(&list);
    }
    list
}

pub fn save_snippets(snippets: &[Snippet]) -> Result<(), String> {
    let path = get_snippets_path().ok_or("Could not resolve snippets config path")?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(snippets).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

fn default_snippets() -> Vec<Snippet> {
    vec![
        Snippet {
            id: "snip_sys_health".to_string(),
            name: "Server Health & Resources".to_string(),
            description: Some("Prints kernel version, uptime, memory, and disk usage".to_string()),
            script: "echo \"=== SYSTEM INFO ===\"\nuname -a\necho \"=== UPTIME & LOAD ===\"\nuptime\necho \"=== DISK USAGE ===\"\ndf -h /\necho \"=== MEMORY ===\"\nfree -h 2>/dev/null || vm_stat 2>/dev/null || top -l 1 | head -n 10\n".to_string(),
            tags: vec!["monitoring".to_string(), "system".to_string()],
        },
        Snippet {
            id: "snip_listening_ports".to_string(),
            name: "List Listening Ports".to_string(),
            description: Some("Show all active TCP listening sockets".to_string()),
            script: "lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null || netstat -tulpn 2>/dev/null || ss -tulpn\n".to_string(),
            tags: vec!["network".to_string(), "security".to_string()],
        },
        Snippet {
            id: "snip_docker_ps".to_string(),
            name: "Docker Quick Overview".to_string(),
            description: Some("Lists running containers and resource usage".to_string()),
            script: "docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\" && echo \"\" && docker stats --no-stream\n".to_string(),
            tags: vec!["docker".to_string(), "containers".to_string()],
        },
        Snippet {
            id: "snip_top_procs".to_string(),
            name: "Top 10 CPU Consumers".to_string(),
            description: Some("Find top 10 processes consuming CPU".to_string()),
            script: "ps aux --sort=-%cpu 2>/dev/null | head -n 11 || ps -arcwwwxo \"pid %cpu command\" | head -n 11\n".to_string(),
            tags: vec!["performance".to_string(), "debug".to_string()],
        },
        Snippet {
            id: "snip_service_restart".to_string(),
            name: "Reload System Service".to_string(),
            description: Some("Templated reload for systemd services".to_string()),
            script: "sudo systemctl reload-or-restart {{service_name}}\nsudo systemctl status {{service_name}} --no-pager\n".to_string(),
            tags: vec!["systemd".to_string(), "devops".to_string()],
        },
    ]
}
