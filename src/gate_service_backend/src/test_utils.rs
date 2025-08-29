use crate::{repository::StableGateRepository, service::GateService};
use candid::Principal;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};
use rand::prelude::*;
use std::{cell::RefCell, rc::Rc};
use uuid::Uuid;

#[cfg(test)]
/// Generate a random UUID string.
pub fn random_id_string() -> String {
    let id = Uuid::new_v4();
    id.to_string()
}

#[cfg(test)]
/// Generate a random principal ID.
pub fn random_principal() -> Principal {
    let mut rng = thread_rng();
    let mut arr = [0u8; 29];
    rng.fill_bytes(&mut arr);
    Principal::from_slice(&arr)
}

#[cfg(test)]
/// Generate a fixture for the gate repository using stable memory.
pub fn gate_repository_fixture() -> StableGateRepository {
    let memory_manager = MemoryManager::init(DefaultMemoryImpl::default());
    let gate_memory = memory_manager.get(MemoryId::new(0));
    let owner_memory = memory_manager.get(MemoryId::new(1));
    let gate_user_memory = memory_manager.get(MemoryId::new(2));

    StableGateRepository::new(gate_memory, owner_memory, gate_user_memory)
}

#[cfg(test)]
/// Generate a fixture for the gate service using a stable gate repository.
pub fn gate_service_fixture() -> GateService<StableGateRepository> {
    let repo = gate_repository_fixture();
    GateService::new(Rc::new(RefCell::new(repo)))
}
