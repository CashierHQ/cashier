use crate::{repository::StableGateRepository, service::GateService};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};
use std::{cell::RefCell, rc::Rc};

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
