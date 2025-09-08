use crate::api::state::get_state;
use candid::Principal;
use cashier_common::guard::is_not_anonymous;
use gate_service_types::{
    Gate, GateForUser, GateKey, NewGate, OpenGateSuccessResult, auth::Permission,
    error::GateServiceError,
};
use ic_cdk::{api::msg_caller, query, update};

#[update(guard = "is_not_anonymous")]
/// Adds a new gate
/// This function facilitates the creation of a new gate and associates it with the subject.
/// # Arguments
/// * `new_gate`: The details of the new gate to be created.
/// # Returns
/// * `Ok(Gate)`: If the gate is created successfully.
/// * `Err(String)`: If there is an error during gate creation.
fn add_gate(new_gate: NewGate) -> Result<Gate, GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    state
        .auth_service
        .must_have_permission(&caller, Permission::GateCreator);

    let mut gate_service = get_state().gate_service;
    let gate = gate_service.add_gate(new_gate)?;

    Ok(gate)
}

#[query]
/// Retrieves a gate by its subject's ID.
/// # Arguments
/// * `subject_id`: The ID of the subject whose gate is to be retrieved.
/// # Returns
/// * `Ok(Some(Gate))`: If a gate is found.
/// * `Ok(None)`: If no gate is found.
/// * `Err(String)`: If there is an error during retrieval.
fn get_gate_by_subject(subject_id: String) -> Result<Option<Gate>, GateServiceError> {
    let gate_service = get_state().gate_service;
    let gate = gate_service.get_gate_by_subject(&subject_id);
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
    let gate_service = get_state().gate_service;
    gate_service.get_gate(&gate_id)
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
fn get_gate_for_user(gate_id: String, user: Principal) -> Result<GateForUser, GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    match state
        .auth_service
        .check_has_permission(&caller, Permission::GateCreator)
    {
        Ok(()) => {}
        Err(_) => {
            if caller != user {
                return Err(GateServiceError::AuthError(
                    "Only the user or a GateCreator can get the gate for a user".to_string(),
                ));
            }
        }
    }

    let gate_service = get_state().gate_service;
    gate_service.get_gate_for_user(&gate_id, user)
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
async fn open_gate(
    gate_id: String,
    key: GateKey,
) -> Result<OpenGateSuccessResult, GateServiceError> {
    let mut gate_service = get_state().gate_service;
    gate_service.open_gate(&gate_id, key, msg_caller()).await
}
