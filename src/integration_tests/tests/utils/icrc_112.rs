use base64::prelude::*;
use candid::Principal;

use cashier_types::dto::action::Icrc112Request;

/// Executes ICRC112 requests with error handling that stops iteration on first error
pub async fn execute_icrc112_request(
    icrc_112_requests: &Vec<Vec<Icrc112Request>>,
    caller: Principal,
    ctx: &crate::utils::PocketIcTestContext,
) -> Result<(), String> {
    for parallel_requests in icrc_112_requests {
        // Execute parallel requests sequentially for now (can be made parallel later)
        for (i, request) in parallel_requests.iter().enumerate() {
            let canister_id = Principal::from_text(&request.canister_id)
                .map_err(|e| format!("Invalid canister ID: {e}"))?;

            let payload = BASE64_STANDARD
                .decode(&request.arg)
                .map_err(|e| format!("Invalid base64 payload: {e}"))?;

            let res = ctx
                .client
                .update_call(canister_id, caller, &request.method, payload)
                .await;

            // Stop iteration if there's an error
            if let Err(e) = res {
                return Err(format!("ICRC112 request failed at index {i}: {e}"));
            }
        }
    }

    Ok(())
}
