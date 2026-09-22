use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::Instant;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PingResult {
    pub rtt_ms: f64,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PortProbeResult {
    pub port: u16,
    pub open: bool,
    pub service: String,
    pub rtt_ms: Option<f64>,
}

pub async fn ping_host(host: &str, port: u16) -> PingResult {
    let start = Instant::now();
    let addr = format!("{}:{}", host, port);

    match tokio::time::timeout(Duration::from_millis(2500), TcpStream::connect(&addr)).await {
        Ok(Ok(_stream)) => {
            let rtt = start.elapsed().as_secs_f64() * 1000.0;
            PingResult {
                rtt_ms: (rtt * 10.0).round() / 10.0,
                success: true,
                error: None,
            }
        }
        Ok(Err(e)) => PingResult {
            rtt_ms: 0.0,
            success: false,
            error: Some(e.to_string()),
        },
        Err(_) => PingResult {
            rtt_ms: 0.0,
            success: false,
            error: Some("Timeout (2500ms)".to_string()),
        },
    }
}

pub async fn probe_ports(host: &str) -> Vec<PortProbeResult> {
    let standard_ports = vec![
        (22, "SSH"),
        (80, "HTTP"),
        (443, "HTTPS"),
        (3306, "MySQL"),
        (5432, "PostgreSQL"),
        (6379, "Redis"),
        (8080, "HTTP-Alt"),
        (27017, "MongoDB"),
    ];

    let mut handles = Vec::new();

    for (port, service) in standard_ports {
        let h = host.to_string();
        let s = service.to_string();

        handles.push(tokio::spawn(async move {
            let start = Instant::now();
            let addr = format!("{}:{}", h, port);
            match tokio::time::timeout(Duration::from_millis(600), TcpStream::connect(&addr)).await {
                Ok(Ok(_)) => {
                    let rtt = start.elapsed().as_secs_f64() * 1000.0;
                    PortProbeResult {
                        port,
                        open: true,
                        service: s,
                        rtt_ms: Some((rtt * 10.0).round() / 10.0),
                    }
                }
                _ => PortProbeResult {
                    port,
                    open: false,
                    service: s,
                    rtt_ms: None,
                },
            }
        }));
    }

    let mut results = Vec::new();
    for handle in handles {
        if let Ok(res) = handle.await {
            results.push(res);
        }
    }

    results.sort_by_key(|r| r.port);
    results
}
