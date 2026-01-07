use candid::{Decode, Nat, Principal};
use cashier_backend_types::{
    constant::TRIGGER_TRANSACTION_METHOD_NAME, dto::action::Icrc112Request,
};
use cashier_common::test_utils::random_principal_id;
use icrc_ledger_types::{icrc1::transfer::TransferError, icrc2::approve::ApproveError};

// Response from a canister call
#[derive(Debug)]
pub struct CanisterCallResponse {
    pub canister_id: Principal,
    pub method: String,
    pub arg: Vec<u8>,
    pub res: Vec<u8>,
    pub parsed_res: Result<Nat, String>,
    pub nonce: Option<Vec<u8>>,
}

/// This function parses ICRC1, 2 standards response to its types
/// # Arguments
/// * `method` - The method name of the ICRC request
/// * `res` - The raw response bytes from the canister call
/// # Returns
/// * `Result<Nat, String>` - Parsed response as block_id Nat or an error message
pub fn parse_response(method: &str, res: Vec<u8>) -> Result<Nat, String> {
    let parsed_res: Result<Nat, String> =
        candid::decode_one::<Nat>(&res).map_err(|e| format!("Failed to decode response: {e}"));

    match method {
        "icrc1_transfer" => Decode!(&res, Result<Nat, TransferError>)
            .map_err(|e| format!("Failed to decode icrc1_transfer response: {e}"))
            .and_then(|inner| match inner {
                Ok(n) => Ok(n),
                Err(err) => Err(format!("icrc1_transfer failed: {:?}", err.to_string())),
            }),
        "icrc2_approve" => Decode!(&res, Result<Nat, ApproveError>)
            .map_err(|e| format!("Failed to decode icrc2_approve response: {e}"))
            .and_then(|inner| match inner {
                Ok(n) => Ok(n),
                Err(err) => Err(format!("icrc2_approve failed: {:?}", err.to_string())),
            }),
        _ => parsed_res,
    }
}

/// Executes ICRC112 requests with error handling that stops iteration on first error
/// # Arguments
/// * `icrc_112_requests` - A vector of vectors of Icrc112Request to be executed
/// * `caller` - The Principal ID of the caller
/// * `ctx` - The test context containing the client for canister calls
/// # Returns
/// * `Result<Vec<Vec<CanisterCallResponse>>, String>` - A vector of vectors of CanisterCallResponse or an error message
pub async fn execute_icrc112_request(
    icrc_112_requests: &Vec<Vec<Icrc112Request>>,
    caller: Principal,
    ctx: &crate::utils::PocketIcTestContext,
) -> Result<Vec<Vec<CanisterCallResponse>>, String> {
    let mut responses: Vec<Vec<CanisterCallResponse>> = Vec::new();
    for parallel_requests in icrc_112_requests {
        let mut parallel_responses: Vec<CanisterCallResponse> = Vec::new();
        // Execute parallel requests sequentially for now (can be made parallel later)
        for (i, request) in parallel_requests.iter().enumerate() {
            let res = ctx
                .client
                .update_call(
                    request.canister_id,
                    caller,
                    &request.method,
                    request.arg.clone(),
                )
                .await;

            // Stop iteration if there's an error
            if let Err(e) = res {
                return Err(format!("ICRC112 request failed at index {i}: {e}"));
            }

            let res = res.unwrap();

            let parsed = parse_response(&request.method, res.clone());

            parallel_responses.push(CanisterCallResponse {
                canister_id: request.canister_id,
                method: request.method.clone(),
                arg: request.arg.clone(),
                res,
                parsed_res: parsed,
                nonce: request.nonce.clone(),
            });
        }
        responses.push(parallel_responses);
    }

    Ok(responses)
}

/// This function is similar to execute_icrc112_request
/// but we filter out the TRIGGER_TRANSACTION_METHOD_NAME and use a random caller to call it
/// it purpose is to try trigger error for method trigger_transaction
/// # Arguments
/// * `icrc_112_requests` - A vector of vectors of Icrc112Request to be executed
/// * `caller` - The Principal ID of the caller
/// * `ctx` - The test context containing the client for canister calls
/// # Returns
/// * `Result<Vec<Vec<CanisterCallResponse>>, String>` - A vector of vectors of CanisterCallResponse or an error message
///
/// Execute ICRC112 requests selectively, skipping requests to specified canisters.
/// Useful for testing partial success scenarios where only some token transfers complete.
/// # Arguments
/// * `icrc_112_requests` - A vector of vectors of Icrc112Request to be executed
/// * `caller` - The Principal ID of the caller
/// * `ctx` - The test context containing the client for canister calls
/// * `skip_canisters` - Canister IDs to skip (e.g., ledger canisters to simulate missing deposits)
/// # Returns
/// * `Result<Vec<Vec<CanisterCallResponse>>, String>` - Responses for executed requests only
pub async fn execute_icrc112_selective(
    icrc_112_requests: &Vec<Vec<Icrc112Request>>,
    caller: Principal,
    ctx: &crate::utils::PocketIcTestContext,
    skip_canisters: &[Principal],
) -> Result<Vec<Vec<CanisterCallResponse>>, String> {
    let mut responses: Vec<Vec<CanisterCallResponse>> = Vec::new();
    for parallel_requests in icrc_112_requests {
        let mut parallel_responses: Vec<CanisterCallResponse> = Vec::new();
        for (i, request) in parallel_requests.iter().enumerate() {
            // Skip requests to specified canisters
            if skip_canisters.contains(&request.canister_id) {
                continue;
            }

            let res = ctx
                .client
                .update_call(
                    request.canister_id,
                    caller,
                    &request.method,
                    request.arg.clone(),
                )
                .await;

            if let Err(e) = res {
                return Err(format!("ICRC112 request failed at index {i}: {e}"));
            }

            let res = res.unwrap();
            let parsed = parse_response(&request.method, res.clone());

            parallel_responses.push(CanisterCallResponse {
                canister_id: request.canister_id,
                method: request.method.clone(),
                arg: request.arg.clone(),
                res,
                parsed_res: parsed,
                nonce: request.nonce.clone(),
            });
        }
        if !parallel_responses.is_empty() {
            responses.push(parallel_responses);
        }
    }

    Ok(responses)
}

pub async fn execute_icrc112_request_malformed(
    icrc_112_requests: &Vec<Vec<Icrc112Request>>,
    caller: Principal,
    ctx: &crate::utils::PocketIcTestContext,
) -> Result<Vec<Vec<CanisterCallResponse>>, String> {
    let mut responses: Vec<Vec<CanisterCallResponse>> = Vec::new();
    for parallel_requests in icrc_112_requests {
        let mut parallel_responses: Vec<CanisterCallResponse> = Vec::new();
        // Execute parallel requests sequentially for now (can be made parallel later)
        for (i, request) in parallel_requests.iter().enumerate() {
            let res = if request.method == TRIGGER_TRANSACTION_METHOD_NAME {
                let random_caller = random_principal_id();
                ctx.client
                    .update_call(
                        request.canister_id,
                        random_caller,
                        &request.method,
                        request.arg.clone(),
                    )
                    .await
            } else {
                ctx.client
                    .update_call(
                        request.canister_id,
                        caller,
                        &request.method,
                        request.arg.clone(),
                    )
                    .await
            };

            // Stop iteration if there's an error
            if let Err(e) = res {
                return Err(format!("ICRC112 request failed at index {i}: {e}"));
            }

            let res = res.unwrap();
            let parsed_res = parse_response(&request.method, res.clone());

            parallel_responses.push(CanisterCallResponse {
                canister_id: request.canister_id,
                method: request.method.clone(),
                arg: request.arg.clone(),
                res,
                parsed_res,
                nonce: request.nonce.clone(),
            });
        }
        responses.push(parallel_responses);
    }

    Ok(responses)
}
