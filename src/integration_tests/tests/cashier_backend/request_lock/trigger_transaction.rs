use base64::prelude::BASE64_STANDARD;
use candid::{CandidType, Decode, Principal};
use cashier_backend_types::{constant, error::CanisterError};
use ic_mple_pocket_ic::pocket_ic::common::rest::RawMessageId;
use serde::de::DeserializeOwned;

use crate::cashier_backend::link::fixture::LinkTestFixture;
use crate::utils::PocketIcTestContext;
use crate::utils::icrc_112::execute_icrc112_request;
use crate::utils::{principal::TestUser, with_pocket_ic_context};
use base64::Engine;
use std::sync::Arc;

async fn call_and_decode<T: DeserializeOwned + CandidType>(
    ctx: &PocketIcTestContext,
    msg_id: RawMessageId,
) -> T {
    let bytes = ctx.client.await_call(msg_id).await.unwrap();
    Decode!(&bytes, T).unwrap()
}

#[tokio::test]
async fn test_request_lock_for_trigger_action() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let mut fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        // Setup user and airdrop tokens
        fixture.setup_user().await;
        fixture.airdrop_icp(1_000_000_000_000_000, &caller).await;
        fixture
            .airdrop_icrc("ckBTC", 1_000_000_000_000_000, &caller)
            .await;
        fixture
            .airdrop_icrc("ckUSDC", 1_000_000_000_000_000, &caller)
            .await;

        let link = fixture.create_token_basket_link().await;
        let action = fixture.create_action(&link.id, "CreateLink").await;
        let processing_action = fixture
            .process_action(&link.id, &action.id, constant::CREATE_LINK_ACTION)
            .await;

        // Execute all ICRC-112 requests except trigger_transaction
        if let Some(mut reqs) = processing_action.icrc_112_requests.clone() {
            reqs.iter_mut()
                .for_each(|g| g.retain(|r| r.method != "trigger_transaction"));
            reqs.retain(|g| !g.is_empty());
            if !reqs.is_empty() {
                execute_icrc112_request(&reqs, caller, ctx)
                    .await
                    .expect("ICRC-112 pre-requests failed");
            }
        }

        // Find the first trigger_transaction request
        let trigger_transaction_req = processing_action
            .icrc_112_requests
            .as_ref()
            .and_then(|reqs| {
                reqs.iter()
                    .flat_map(|g| g.iter())
                    .find(|r| r.method == "trigger_transaction")
            })
            .expect("no trigger_transaction request found");

        let payload = BASE64_STANDARD
            .decode(&trigger_transaction_req.arg)
            .map_err(|e| format!("Invalid base64 payload: {e}"))
            .unwrap();

        // Act: submit 3 concurrent calls and collect results
        let mut msgs = Vec::with_capacity(3);
        for _ in 0..3 {
            msgs.push(
                ctx.client
                    .submit_call(
                        trigger_transaction_req.canister_id,
                        caller,
                        &trigger_transaction_req.method,
                        payload.clone(),
                    )
                    .await
                    .unwrap(),
            );
        }
        let mut results = Vec::with_capacity(3);
        for msg in msgs {
            results.push(call_and_decode::<Result<String, CanisterError>>(ctx, msg).await);
        }

        let success_count = results.iter().filter(|r| r.is_ok()).count();
        let failed_count = results.len() - success_count;

        // Assert
        assert_eq!(trigger_transaction_req.method, "trigger_transaction");
        assert_eq!(success_count, 1);
        assert_eq!(failed_count, 2);

        for failed_action in results.iter().filter(|r| r.is_err()) {
            if let Err(error) = failed_action {
                assert!(
                    error
                        .to_string()
                        .contains("Request lock already exists for key:"),
                    "Expected error to contain 'Request lock already exists for key:', got: {error}"
                );
            }
        }

        Ok(())
    })
    .await
    .unwrap()
}
