use candid::Principal;

use cashier_backend_types::dto::action::Icrc112Request;
use cashier_common::test_utils::random_principal_id;

// Response from a canister call
pub struct CanisterCallResponse {
    pub canister_id: Principal,
    pub method: String,
    pub arg: Vec<u8>,
    pub res: Vec<u8>,
    pub nonce: Option<Vec<u8>>,
}

/// Executes ICRC112 requests with error handling that stops iteration on first error
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
            parallel_responses.push(CanisterCallResponse {
                canister_id: request.canister_id,
                method: request.method.clone(),
                arg: request.arg.clone(),
                res,
                nonce: request.nonce.clone(),
            });
        }
        responses.push(parallel_responses);
    }

    Ok(responses)
}

// this function is similar to execute_icrc112_request
// but we filter out the "trigger_transaction" and use a random caller to call it
// it purpose is to try trigger error for method trigger_transaction
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
            let res = if request.method == "trigger_transaction" {
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
            parallel_responses.push(CanisterCallResponse {
                canister_id: request.canister_id,
                method: request.method.clone(),
                arg: request.arg.clone(),
                res,
                nonce: request.nonce.clone(),
            });
        }
        responses.push(parallel_responses);
    }

    Ok(responses)
}
