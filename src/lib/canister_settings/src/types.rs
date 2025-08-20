use candid::CandidType;
use candid::Principal;
use cashier_macros::storable;
use ic_stable_structures::DefaultMemoryImpl;
use ic_stable_structures::StableCell;
use ic_stable_structures::memory_manager::VirtualMemory;

#[derive(Clone, Debug, CandidType, PartialEq, Eq)]
#[storable]
pub enum Mode {
    Operational,
    Maintenance,
}

#[derive(Clone, Debug, CandidType, PartialEq, Eq)]
#[storable]
pub struct CanisterSettingsStorage {
    pub mode: Mode,
    pub list_admin: Vec<Principal>,
}

impl Default for CanisterSettingsStorage {
    fn default() -> Self {
        Self {
            mode: Mode::Operational,
            list_admin: vec![],
        }
    }
}

pub type CanisterSettingsStable =
    StableCell<CanisterSettingsStorage, VirtualMemory<DefaultMemoryImpl>>;
