// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v3::send_tip::fixture::create_tip_linkv3_fixture;
use crate::constant::{CK_BTC_PRINCIPAL, CKBTC_ICRC_TOKEN, ICP_PRINCIPAL};
use crate::utils::principal::TestUser;
use crate::utils::with_pocket_ic_context;
use candid::{Decode, Nat, Principal};
use cashier_shared::types::{
    ActionState as ActionStateShared, AddressType as AddressTypeShared,
    IntentState as IntentStateShared, LinkState as LinkStateShared,
};
use icrc_ledger_types::icrc2::approve::ApproveArgs;
use std::time::Duration;

#[tokio::test]
async fn it_should_fail_activate_tip_linkv3_icrc_and_return_same_icrc112_if_icrc112_not_executed()
{
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap();

        let (test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            ckbtc_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;

        let initial_icrc112 = create_link_result.icrc112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];

        let icp_initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(ICP_PRINCIPAL).unwrap()
            })
            .expect("Initial ICP icrc2_approve request not found");
        let icp_initial_icrc2_approve_arg =
            Decode!(&icp_initial_icrc2_approve_request.arg, ApproveArgs)
                .expect("Failed to decode initial ICP icrc2_approve args");

        let ckbtc_initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
            })
            .expect("Initial ckBTC icrc2_approve request not found");
        let ckbtc_initial_icrc2_approve_arg =
            Decode!(&ckbtc_initial_icrc2_approve_request.arg, ApproveArgs)
                .expect("Failed to decode initial ckBTC icrc2_approve args");

        // Act: Activate the link WITHOUT executing ICRC-112 (simulate FE not calling icrc2_approve)
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v3(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            2,
            "There should be 2 errors"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(error_message.contains("InsufficientAllowance"));

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.link_state,
            LinkStateShared::Created,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.action_state,
            ActionStateShared::Fail,
            "Action state should be Fail"
        );

        // Assert: 2 intents, both Fail
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );

        let intent_to_link = activate_link_result
            .action
            .intents
            .iter()
            .find(|intent| intent.dest_address_type == AddressTypeShared::Link)
            .expect("Intent to Link not found");
        assert_eq!(
            intent_to_link.intent_state,
            IntentStateShared::Fail,
            "Intent to Link state should be Fail"
        );
        assert_eq!(intent_to_link.source_address, caller);

        let intent_to_treasury = activate_link_result
            .action
            .intents
            .iter()
            .find(|intent| intent.dest_address_type == AddressTypeShared::Treasury)
            .expect("Intent to Treasury not found");
        assert_eq!(
            intent_to_treasury.intent_state,
            IntentStateShared::Fail,
            "Intent to Treasury state should be Fail"
        );
        assert_eq!(intent_to_treasury.source_address, caller);

        // Assert: ICRC-112 requests returned for retry — same args as initial (within dedup window)
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => match req.canister_id {
                    cid if cid == Principal::from_text(ICP_PRINCIPAL).unwrap() => {
                        let new_args = Decode!(&req.arg, ApproveArgs)
                            .expect("Failed to decode ICP icrc2_approve args");
                        assert_eq!(
                            new_args, icp_initial_icrc2_approve_arg,
                            "ICP icrc2_approve args should be unchanged (within dedup window)"
                        );
                    }
                    cid if cid == Principal::from_text(CK_BTC_PRINCIPAL).unwrap() => {
                        let new_args = Decode!(&req.arg, ApproveArgs)
                            .expect("Failed to decode ckBTC icrc2_approve args");
                        assert_eq!(
                            new_args, ckbtc_initial_icrc2_approve_arg,
                            "ckBTC icrc2_approve args should be unchanged (within dedup window)"
                        );
                    }
                    _ => panic!("icrc2_approve canister_id should be ICP or ckBTC"),
                },
                _ => panic!("Unexpected method in ICRC-112 request"),
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_activate_tip_linkv3_icrc_and_create_new_icrc112_if_icrc112_not_executed_and_activate_later_than_1day(
) {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap();

        let (test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            ckbtc_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;

        let initial_icrc112 = create_link_result.icrc112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];

        let icp_initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(ICP_PRINCIPAL).unwrap()
            })
            .expect("Initial ICP icrc2_approve request not found");
        let icp_initial_icrc2_approve_arg =
            Decode!(&icp_initial_icrc2_approve_request.arg, ApproveArgs)
                .expect("Failed to decode initial ICP icrc2_approve args");

        let ckbtc_initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
            })
            .expect("Initial ckBTC icrc2_approve request not found");
        let ckbtc_initial_icrc2_approve_arg =
            Decode!(&ckbtc_initial_icrc2_approve_request.arg, ApproveArgs)
                .expect("Failed to decode initial ckBTC icrc2_approve args");

        // Act: Advance time by 1 day + 1 second, then activate WITHOUT executing ICRC-112
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await;
        let action_id = create_link_result.action.id.clone();
        let activate_link_result = test_fixture.activate_link_v3(&action_id).await;

        // Assert: Activated link result
        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();

        // Assert: IsSuccess and Errors
        assert!(!activate_link_result.is_success, "Activation should fail");
        assert_eq!(
            activate_link_result.errors.len(),
            2,
            "There should be 2 errors"
        );

        let error_message = activate_link_result.errors.join(", ");
        assert!(error_message.contains("InsufficientAllowance"));

        // Assert: Link state should remain Created
        assert_eq!(
            activate_link_result.link.link_state,
            LinkStateShared::Created,
            "Link state should remain Created"
        );

        // Assert: Action state should be Fail
        assert_eq!(
            activate_link_result.action.action_state,
            ActionStateShared::Fail,
            "Action state should be Fail"
        );

        // Assert: 2 intents, both Fail
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );

        let intent_to_link = activate_link_result
            .action
            .intents
            .iter()
            .find(|intent| intent.dest_address_type == AddressTypeShared::Link)
            .expect("Intent to Link not found");
        assert_eq!(
            intent_to_link.intent_state,
            IntentStateShared::Fail,
            "Intent to Link state should be Fail"
        );
        assert_eq!(intent_to_link.source_address, caller);

        let intent_to_treasury = activate_link_result
            .action
            .intents
            .iter()
            .find(|intent| intent.dest_address_type == AddressTypeShared::Treasury)
            .expect("Intent to Treasury not found");
        assert_eq!(
            intent_to_treasury.intent_state,
            IntentStateShared::Fail,
            "Intent to Treasury state should be Fail"
        );
        assert_eq!(intent_to_treasury.source_address, caller);

        // Assert: ICRC-112 requests returned with UPDATED created_at_time for both tokens
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => match req.canister_id {
                    cid if cid == Principal::from_text(ICP_PRINCIPAL).unwrap() => {
                        let new_args = Decode!(&req.arg, ApproveArgs)
                            .expect("Failed to decode ICP icrc2_approve args");
                        assert_eq!(
                            new_args.memo, icp_initial_icrc2_approve_arg.memo,
                            "ICP icrc2_approve memo should be the same"
                        );
                        let new_ts = new_args
                            .created_at_time
                            .expect("New ICP created_at_time should not be None");
                        let initial_ts = icp_initial_icrc2_approve_arg
                            .created_at_time
                            .expect("Initial ICP created_at_time should not be None");
                        assert!(
                            (new_ts - initial_ts) > (24 * 3600 + 1) * 1_000_000_000,
                            "ICP icrc2_approve created_at_time should be advanced by 1 day + 1 second"
                        );
                    }
                    cid if cid == Principal::from_text(CK_BTC_PRINCIPAL).unwrap() => {
                        let new_args = Decode!(&req.arg, ApproveArgs)
                            .expect("Failed to decode ckBTC icrc2_approve args");
                        assert_eq!(
                            new_args.memo, ckbtc_initial_icrc2_approve_arg.memo,
                            "ckBTC icrc2_approve memo should be the same"
                        );
                        let new_ts = new_args
                            .created_at_time
                            .expect("New ckBTC created_at_time should not be None");
                        let initial_ts = ckbtc_initial_icrc2_approve_arg
                            .created_at_time
                            .expect("Initial ckBTC created_at_time should not be None");
                        assert!(
                            (new_ts - initial_ts) > (24 * 3600 + 1) * 1_000_000_000,
                            "ckBTC icrc2_approve created_at_time should be advanced by 1 day + 1 second"
                        );
                    }
                    _ => panic!("icrc2_approve canister_id should be ICP or ckBTC"),
                },
                _ => panic!("Unexpected method in ICRC-112 request"),
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_new_icrc112_with_proper_created_time_if_activate_twice_within_1_day() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(CKBTC_ICRC_TOKEN, caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_fee = ckbtc_ledger_client.fee().await.unwrap();

        let (test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            ckbtc_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;
        let action_id = create_link_result.action.id.clone();

        // Act: Activate first time after 1 day (triggers timestamp refresh)
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await;
        let activate_link_result = test_fixture.activate_link_v3(&action_id).await;

        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];
        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");

        let icp_approve_req = requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(ICP_PRINCIPAL).unwrap()
            })
            .expect("ICP icrc2_approve request not found");
        let first_icp_approve_arg = Decode!(&icp_approve_req.arg, ApproveArgs)
            .expect("Failed to decode ICP icrc2_approve args");

        let ckbtc_approve_req = requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
            })
            .expect("ckBTC icrc2_approve request not found");
        let first_ckbtc_approve_arg = Decode!(&ckbtc_approve_req.arg, ApproveArgs)
            .expect("Failed to decode ckBTC icrc2_approve args");

        // Act: Activate second time after 1 hour (within deduplication window — no refresh)
        ctx.advance_time(Duration::from_secs(3600)).await;
        let activate_link_result = test_fixture.activate_link_v3(&action_id).await;

        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];
        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");

        let icp_approve_req = requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(ICP_PRINCIPAL).unwrap()
            })
            .expect("ICP icrc2_approve request not found");
        let second_icp_approve_arg = Decode!(&icp_approve_req.arg, ApproveArgs)
            .expect("Failed to decode ICP icrc2_approve args");

        let ckbtc_approve_req = requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
            })
            .expect("ckBTC icrc2_approve request not found");
        let second_ckbtc_approve_arg = Decode!(&ckbtc_approve_req.arg, ApproveArgs)
            .expect("Failed to decode ckBTC icrc2_approve args");

        assert_eq!(
            second_icp_approve_arg, first_icp_approve_arg,
            "ICP icrc2_approve args should be unchanged on second activation (within 1 day)"
        );
        assert_eq!(
            second_ckbtc_approve_arg, first_ckbtc_approve_arg,
            "ckBTC icrc2_approve args should be unchanged on second activation (within 1 day)"
        );

        // Act: Activate third time after another 1 day (triggers another timestamp refresh)
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await;
        let activate_link_result = test_fixture.activate_link_v3(&action_id).await;

        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];
        assert_eq!(requests.len(), 2, "There should be 2 ICRC-112 requests");

        let icp_approve_req = requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(ICP_PRINCIPAL).unwrap()
            })
            .expect("ICP icrc2_approve request not found");
        let third_icp_approve_arg = Decode!(&icp_approve_req.arg, ApproveArgs)
            .expect("Failed to decode ICP icrc2_approve args");

        let ckbtc_approve_req = requests
            .iter()
            .find(|req| {
                req.method == "icrc2_approve"
                    && req.canister_id == Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
            })
            .expect("ckBTC icrc2_approve request not found");
        let third_ckbtc_approve_arg = Decode!(&ckbtc_approve_req.arg, ApproveArgs)
            .expect("Failed to decode ckBTC icrc2_approve args");

        let third_icp_ts = third_icp_approve_arg
            .created_at_time
            .expect("Third ICP created_at_time should not be None");
        let second_icp_ts = second_icp_approve_arg
            .created_at_time
            .expect("Second ICP created_at_time should not be None");
        assert!(
            (third_icp_ts - second_icp_ts) > (24 * 3600 + 1) * 1_000_000_000,
            "ICP icrc2_approve created_at_time should be advanced by 1 day + 1 second on third activation"
        );

        let third_ckbtc_ts = third_ckbtc_approve_arg
            .created_at_time
            .expect("Third ckBTC created_at_time should not be None");
        let second_ckbtc_ts = second_ckbtc_approve_arg
            .created_at_time
            .expect("Second ckBTC created_at_time should not be None");
        assert!(
            (third_ckbtc_ts - second_ckbtc_ts) > (24 * 3600 + 1) * 1_000_000_000,
            "ckBTC icrc2_approve created_at_time should be advanced by 1 day + 1 second on third activation"
        );

        Ok(())
    })
    .await
    .unwrap();
}
