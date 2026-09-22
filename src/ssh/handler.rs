use russh::client::Handler;
use russh::keys::known_hosts::{check_known_hosts, learn_known_hosts};
use russh::keys::PublicKeyOrCertificate;
use std::future::Future;
use std::io::{self, Write};

pub struct TheiaClientHandler {
    pub host: String,
    pub port: u16,
    pub accept_all_hostkeys: bool,
}

impl TheiaClientHandler {
    pub fn new(host: String, port: u16) -> Self {
        Self {
            host,
            port,
            accept_all_hostkeys: false,
        }
    }
}

impl Handler for TheiaClientHandler {
    type Error = russh::Error;

    fn check_server_key(
        &mut self,
        server_public_key: &PublicKeyOrCertificate,
    ) -> impl Future<Output = Result<bool, Self::Error>> + Send {
        let host = self.host.clone();
        let port = self.port;
        let accept_all = self.accept_all_hostkeys;

        let key = match server_public_key {
            PublicKeyOrCertificate::PublicKey { key, .. } => key.clone(),
            PublicKeyOrCertificate::Certificate(cert) => cert.public_key().clone().into(),
        };

        async move {
            if accept_all {
                return Ok(true);
            }

            match check_known_hosts(&host, port, &key) {
                Ok(true) => Ok(true),
                Ok(false) => {
                    // Host is not in known_hosts yet. Prompt the user.
                    let fp = key.fingerprint(russh::keys::ssh_key::HashAlg::Sha256);
                    eprintln!("\x1b[1;33mThe authenticity of host '{host}:{port}' can't be established.\x1b[0m");
                    eprintln!("Key fingerprint is: \x1b[1;36m{fp}\x1b[0m");
                    eprint!("Are you sure you want to continue connecting (yes/no)? ");
                    let _ = io::stderr().flush();

                    let mut answer = String::new();
                    if io::stdin().read_line(&mut answer).is_ok() {
                        let answer = answer.trim().to_lowercase();
                        if answer == "yes" || answer == "y" {
                            if let Err(e) = learn_known_hosts(&host, port, &key) {
                                eprintln!("\x1b[33mWarning: failed to add host to known_hosts: {e}\x1b[0m");
                            } else {
                                eprintln!("\x1b[32mPermanently added '{host}:{port}' to the list of known hosts.\x1b[0m");
                            }
                            return Ok(true);
                        }
                    }
                    eprintln!("\x1b[31mHost key verification failed.\x1b[0m");
                    Ok(false)
                }
                Err(e) => {
                    eprintln!("\x1b[1;31m@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\x1b[0m");
                    eprintln!("\x1b[1;31m@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\x1b[0m");
                    eprintln!("\x1b[1;31m@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\x1b[0m");
                    eprintln!("IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!");
                    eprintln!("Host key mismatch in known_hosts: {e}");
                    Ok(false)
                }
            }
        }
    }
}
