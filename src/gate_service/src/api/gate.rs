// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::api::state::get_state;
use crate::gates::x::exchange_x_token as x_exchange_token;
use crate::services::http::IcHttpOutcallService;
use crate::services::secret::IcSecretService;
use candid::Principal;
use cashier_common::guard::is_not_anonymous;
use gate_service_types::{
    Gate, GateForUser, GateKey, NewGate, OpenGateSuccessResult, XTokenExchangeResult,
    auth::Permission, error::GateServiceError,
};
use ic_cdk::{api::msg_caller, management_canister::raw_rand, query, update};

#[update(guard = "is_not_anonymous")]
/// Adds a new gate
/// This function facilitates the creation of a new gate and associates it with the subject.
/// This API is guarded to ensure that only authenticated users with GateCreate permission can create gates.
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
        .must_have_permission(&caller, Permission::GateCreate);

    let mut gate_service = get_state().gate_service;
    let gate = gate_service.add_gate(caller, new_gate)?;

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
        .check_has_permission(&caller, Permission::GateCreate)
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
/// Opens a gate for a user.
/// The caller provides the key to open the gate.
/// Callers with `GateCreate` permission may open a gate on behalf of an explicit `user`
/// principal; otherwise the caller itself is treated as the user.
/// # Arguments
/// * `gate_id`: The ID of the gate to be opened.
/// * `key`: The key provided by the caller to open the gate.
/// * `user`: The principal of the user for whom the gate is being opened.
/// # Returns
/// * `Ok(OpenGateSuccessResult)`: If the gate is opened successfully.
/// * `Err(GateServiceError)`: If there is an error during gate opening.
async fn open_gate(
    gate_id: String,
    key: GateKey,
    user: Principal,
) -> Result<OpenGateSuccessResult, GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    // Only principals with GateCreate permission may open gates on behalf of others.
    let effective_user = if state
        .auth_service
        .check_has_permission(&caller, Permission::GateCreate)
        .is_ok()
    {
        user
    } else {
        caller
    };
    let mut gate_service = get_state().gate_service;
    gate_service
        .open_gate(
            &gate_id,
            key,
            effective_user,
            &IcHttpOutcallService,
            &IcSecretService,
            ic_cdk::api::time(),
        )
        .await
}

#[update(guard = "is_not_anonymous")]
/// Generates an OTP code and sends it to the destination configured on the gate.
///
/// Principals with `GateCreate` permission (e.g. cashier_backend) may pass an explicit
/// `user` to send the OTP on behalf of that user; all other callers are treated as
/// the user themselves. Any previously issued code for this gate/user pair is overwritten.
/// The generated code expires after 10 minutes.
/// # Arguments
/// * `gate_id`: The ID of an OTPEmail or OTPSms gate.
/// * `user`: The principal of the user who will later verify the code. Ignored (replaced by caller) unless the caller has GateCreate permission.
/// # Returns
/// * `Ok(())`: Code generated and dispatched via Brevo.
/// * `Err(GateServiceError::NotFound)`: Gate does not exist.
/// * `Err(GateServiceError::UnsupportedGateKey)`: Gate is not an OTP type.
/// * `Err(GateServiceError::KeyVerificationFailed)`: Brevo API call failed.
async fn send_otp(gate_id: String, user: Principal) -> Result<(), GateServiceError> {
    let state = get_state();
    let caller = msg_caller();
    let effective_user = if state
        .auth_service
        .check_has_permission(&caller, Permission::GateCreate)
        .is_ok()
    {
        user
    } else {
        caller
    };
    let rand_bytes = raw_rand()
        .await
        .map_err(|e| GateServiceError::KeyVerificationFailed(format!("raw_rand: {e:?}")))?;
    let rand_u32 = u32::from_le_bytes([rand_bytes[0], rand_bytes[1], rand_bytes[2], rand_bytes[3]]);
    let code = format!("{:06}", rand_u32 % 1_000_000);
    const OTP_TTL_NS: u64 = 600_000_000_000;
    let expires_at = ic_cdk::api::time() + OTP_TTL_NS;

    let mut gate_service = get_state().gate_service;
    gate_service
        .send_otp(
            &gate_id,
            effective_user,
            &IcHttpOutcallService,
            &IcSecretService,
            &code,
            expires_at,
        )
        .await
}

#[update]
/// Exchanges an X OAuth 2.0 authorization code for the caller's X profile and access token.
///
/// The backend performs the token exchange via a non-replicated HTTP outcall so
/// that the single-use authorization code is consumed exactly once. Anonymous
/// callers are permitted because the X authorization code is single-use and
/// PKCE-protected; there is no session data at risk.
/// # Arguments
/// * `code`: The authorization code received from the X OAuth callback.
/// # Returns
/// * `Ok(XTokenExchangeResult)`: The authenticated user's X profile and OAuth access token.
/// * `Err(GateServiceError)`: If the token exchange or profile fetch fails.
async fn exchange_x_token(code: String) -> Result<XTokenExchangeResult, GateServiceError> {
    x_exchange_token(code)
        .await
        .map_err(|e| GateServiceError::KeyVerificationFailed(e.to_string()))
}
