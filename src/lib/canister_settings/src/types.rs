use candid::Principal;

pub enum Mode {
    Operational,
    Maintenance,
}
pub struct CanisterSettingsStorage {
    pub mode: Mode,
    pub list_admin: Vec<Principal>,
}
