use keyring::Entry;

const SERVICE_NAME: &str = "com.theia.ssh";

pub fn store_secret(account: &str, secret: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, account).map_err(|e| e.to_string())?;
    entry.set_password(secret).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_secret(account: &str) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE_NAME, account).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(pwd) => Ok(Some(pwd)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn delete_secret(account: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, account).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
