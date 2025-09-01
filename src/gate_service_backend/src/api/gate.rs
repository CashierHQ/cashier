use crate::repository::StableGateRepository;
use crate::service::GateService;
use candid::Principal;
use cashier_common::guard::is_not_anonymous;
use gate_service_types::{
    Gate, GateForUser, GateKey, NewGate, OpenGateSuccessResult, VerificationResult,
};
use ic_cdk::{api::msg_caller, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager};
use ic_stable_structures::DefaultMemoryImpl;
use std::{cell::RefCell, rc::Rc};

thread_local! {
    // The memory manager is used for simulating multiple memories. Given a `MemoryId` it can
    // return a memory that can be used by stable structures.
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Initialized the repositories
    static GATE_REPOSITORY: Rc<RefCell<StableGateRepository>> = Rc::new(RefCell::new({
        let gate_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)));
        let owner_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)));
        let gate_user_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2)));
        StableGateRepository::new(gate_memory, owner_memory, gate_user_memory)
    }));

    // Initialize the services
    static GATE_SERVICE: Rc<RefCell<GateService<StableGateRepository>>> = Rc::new(RefCell::new({
        let gate_repository = GATE_REPOSITORY.with(Rc::clone);
        GateService::new(gate_repository)
    }));
}

#[update(guard = "is_not_anonymous")]
/// Adds a new gate
/// This function facilitates the creation of a new gate and associates it with the owner.
/// # Arguments
/// * `new_gate`: The details of the new gate to be created.
/// # Returns
/// * `Ok(Gate)`: If the gate is created successfully.
/// * `Err(String)`: If there is an error during gate creation.
fn add_gate(new_gate: NewGate) -> Result<Gate, String> {
    let gate_service = GATE_SERVICE.with(Rc::clone);
    let gate = gate_service.borrow().add_gate(new_gate)?;

    Ok(gate)
}

#[query]
/// Retrieves a gate by its owner's ID.
/// # Arguments
/// * `subject_id`: The ID of the owner whose gate is to be retrieved.
/// # Returns
/// * `Ok(Some(Gate))`: If a gate is found.
/// * `Ok(None)`: If no gate is found.
/// * `Err(String)`: If there is an error during retrieval.
fn get_gate_by_owner(subject_id: String) -> Result<Option<Gate>, String> {
    let another_service = GATE_SERVICE.with(Rc::clone);
    let gate = another_service.borrow().get_gate_by_owner(&subject_id);
    Ok(gate)
}

#[query]
/// Retrieves a gate by its ID.
/// # Arguments
/// * `gate_id`: The ID of the gate to be retrieved.
/// # Returns
/// * `Ok(Some(Gate))`: If a gate is found.
/// * `Ok(None)`: If no gate is found.
/// * `Err(String)`: If there is an error during retrieval.
fn get_gate(gate_id: String) -> Option<Gate> {
    let gate_service = GATE_SERVICE.with(Rc::clone);
    let gate = gate_service.borrow().get_gate(&gate_id);
    gate
}

#[query]
/// Retrieves a gate and its opening status for a specific user.
/// The gate opening status for an user indicates whether user has opened it or not.
/// # Arguments
/// * `gate_id`: The ID of the gate to be retrieved.
/// * `user`: The user for whom the gate is being retrieved.
/// # Returns
/// * `Ok(GateForUser)`: If the gate is found.
/// * `Err(String)`: If there is an error during retrieval.
fn get_gate_for_user(gate_id: String, user: Principal) -> Result<GateForUser, String> {
    let gate_service = GATE_SERVICE.with(Rc::clone);
    let gate = gate_service
        .borrow()
        .get_gate(&gate_id)
        .ok_or_else(|| "Gate not found".to_string())?;
    let gate_user_status = gate_service.borrow().get_gate_user_status(&gate_id, user);
    Ok(GateForUser {
        gate,
        gate_user_status,
    })
}

#[update(guard = "is_not_anonymous")]
/// Opens a gate for the caller.
/// The caller (opener) provides the key to open the gate.
/// If the key is valid, the gate will be opened, and an `OpenGateSuccessResult` will be returned.
/// # Arguments
/// * `gate_id`: The ID of the gate to be opened.
/// * `key`: The key provided by the caller to open the gate.
/// # Returns
/// * `Ok(OpenGateSuccessResult)`: If the gate is opened successfully.
/// * `Err(String)`: If there is an error during gate opening.
async fn open_gate(gate_id: String, key: GateKey) -> Result<OpenGateSuccessResult, String> {
    let gate = {
        let gate_service = GATE_SERVICE.with(Rc::clone);
        let gate_service = gate_service.borrow();
        gate_service.get_gate(&gate_id)
    };
    let gate = gate.ok_or_else(|| "Gate not found".to_string())?;

    let opening_gate = {
        let gate_service = GATE_SERVICE.with(Rc::clone);
        let gate_service = gate_service.borrow();
        gate_service.get_opening_gate(&gate_id)
    }?;

    let caller = msg_caller();

    match opening_gate.verify(key).await {
        Ok(VerificationResult::Success) => {
            let (gate, gate_user_status) = {
                let gate_service = GATE_SERVICE.with(Rc::clone);
                let gate_service = gate_service.borrow();
                gate_service.open_gate(gate, caller)
            }?;

            Ok(OpenGateSuccessResult {
                gate,
                gate_user_status,
            })
        }
        Ok(VerificationResult::Failure(e)) => Err(format!("Verification failed: {}", e)),
        Err(e) => Err(e),
    }
}
