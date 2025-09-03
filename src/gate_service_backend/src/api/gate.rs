use crate::api::state::get_state;
use candid::Principal;
use cashier_common::guard::is_not_anonymous;
use gate_service_types::{
    error::GateServiceError, Gate, GateForUser, GateKey, NewGate, OpenGateSuccessResult,
    VerificationResult,
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
    let gate_service = get_state().gate_service;
    let gate = gate_service
        .get_gate(&gate_id)
        .ok_or(GateServiceError::NotFound)?;
    let gate_user_status = gate_service.get_gate_user_status(&gate_id, user);
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
async fn open_gate(
    gate_id: String,
    key: GateKey,
) -> Result<OpenGateSuccessResult, GateServiceError> {
    let gate = {
        let gate_service = get_state().gate_service;
        gate_service.get_gate(&gate_id)
    };
    let gate = gate.ok_or(GateServiceError::NotFound)?;

    let opening_gate = {
        let gate_service = get_state().gate_service;
        gate_service.get_opening_gate(&gate_id)
    }?;

    let caller = msg_caller();

    match opening_gate.verify(key).await {
        Ok(VerificationResult::Success) => {
            let (gate, gate_user_status) = {
                let mut gate_service = get_state().gate_service;
                gate_service.open_gate(gate, caller)
            }?;

            Ok(OpenGateSuccessResult {
                gate,
                gate_user_status,
            })
        }
        Ok(VerificationResult::Failure(e)) => Err(GateServiceError::KeyVerificationFailed(e)),
        Err(e) => Err(e),
    }
}
