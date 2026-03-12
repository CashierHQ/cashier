// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v3::send_tip::fixture::create_tip_linkv3_fixture;
use crate::constant::{ICP_PRINCIPAL, ICP_TOKEN};
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
async fn it_should_fail_activate_tip_linkv3_icp_and_return_same_icrc112_if_icrc112_not_executed() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let (test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            icp_ledger_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;

        let initial_icrc112 = create_link_result.icrc112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];

        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

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

        // Assert: 2 intents
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );

        // Assert Intent 1: CreatorToLink (TransferWalletToLink equivalent)
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
        assert_eq!(
            intent_to_link.source_address_type,
            AddressTypeShared::Creator
        );

        // Assert Intent 2: CreatorToTreasury (TransferWalletToTreasury equivalent)
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
        assert_eq!(
            intent_to_treasury.source_address_type,
            AddressTypeShared::Creator
        );

        // Assert: ICRC-112 requests returned for retry
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 ICRC-112 request");
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");
                    assert_eq!(
                        new_icrc2_approve_args, initial_icrc2_approve_arg,
                        "ICRC2 approve arguments should be the same (within deduplication window)"
                    );
                }
                _ => panic!("Unexpected method in ICRC-112 request"),
            }
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_fail_activate_tip_linkv3_icp_and_create_new_icrc112_if_icrc112_not_executed_and_activate_later_than_1day()
 {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let (test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            icp_ledger_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;

        let initial_icrc112 = create_link_result.icrc112_requests.clone();
        assert!(initial_icrc112.is_some());
        let initial_icrc112 = initial_icrc112.unwrap();
        assert_eq!(initial_icrc112.len(), 1);
        let initial_icrc112_requests = &initial_icrc112[0];

        let initial_icrc2_approve_request = initial_icrc112_requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("Initial icrc2_approve request not found");
        let initial_icrc2_approve_arg = Decode!(&initial_icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode initial icrc2_approve args");

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

        // Assert: 2 intents
        assert_eq!(
            activate_link_result.action.intents.len(),
            2,
            "There should be 2 intents"
        );

        // Assert Intent 1: CreatorToLink
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

        // Assert Intent 2: CreatorToTreasury
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

        // Assert: ICRC-112 requests returned with UPDATED created_at_time
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 1, "There should be 1 ICRC-112 request");
        for req in requests {
            match req.method.as_str() {
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                    let new_icrc2_approve_args = Decode!(&req.arg, ApproveArgs)
                        .expect("Failed to decode icrc2_approve args");

                    // These fields should remain unchanged
                    assert_eq!(
                        new_icrc2_approve_args.spender, initial_icrc2_approve_arg.spender,
                        "ICRC2 approve 'spender' field should be the same"
                    );
                    assert_eq!(
                        new_icrc2_approve_args.amount, initial_icrc2_approve_arg.amount,
                        "ICRC2 approve 'amount' field should be the same"
                    );
                    assert_eq!(
                        new_icrc2_approve_args.from_subaccount,
                        initial_icrc2_approve_arg.from_subaccount,
                        "ICRC2 approve 'from_subaccount' field should be the same"
                    );
                    assert_eq!(
                        new_icrc2_approve_args.memo, initial_icrc2_approve_arg.memo,
                        "ICRC2 approve 'memo' field should be the same"
                    );

                    // created_at_time should be advanced by more than 1 day + 1 second
                    let new_created_ts = new_icrc2_approve_args
                        .created_at_time
                        .expect("New icrc2_approve args ts should not be None");
                    let initial_created_ts = initial_icrc2_approve_arg
                        .created_at_time
                        .expect("Initial icrc2_approve args ts should not be None");
                    assert!(
                        (new_created_ts - initial_created_ts) > (24 * 3600 + 1) * 1_000_000_000,
                        "ICRC2 approve created_at_time should be advanced by 1 day + 1 second"
                    );
                }
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
        let token = ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let (test_fixture, create_link_result) = create_tip_linkv3_fixture(
            ctx,
            caller,
            token,
            tip_amount.clone(),
            icp_ledger_fee.clone(),
            icp_ledger_fee.clone(),
        )
        .await;
        let action_id = create_link_result.action.id.clone();

        // Act: Activate the link first time after 1 day (triggers timestamp refresh)
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await;
        let activate_link_result = test_fixture.activate_link_v3(&action_id).await;

        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];
        assert_eq!(requests.len(), 1, "There should be 1 ICRC-112 request");
        let icrc2_approve_request = requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("icrc2_approve request not found");
        let first_icrc2_approve_arg = Decode!(&icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode icrc2_approve args");

        // Act: Activate the link second time after 1 hour (within deduplication window — no refresh)
        ctx.advance_time(Duration::from_secs(3600)).await;
        let activate_link_result = test_fixture.activate_link_v3(&action_id).await;

        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];
        assert_eq!(requests.len(), 1, "There should be 1 ICRC-112 request");
        let icrc2_approve_request = requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("icrc2_approve request not found");
        let second_icrc2_approve_arg = Decode!(&icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode icrc2_approve args");

        assert_eq!(
            second_icrc2_approve_arg, first_icrc2_approve_arg,
            "ICRC2 approve args should be the same on second activation (within 1 day)"
        );

        // Act: Activate the link third time after another 1 day (triggers another refresh)
        ctx.advance_time(Duration::from_secs(24 * 3600 + 1)).await;
        let activate_link_result = test_fixture.activate_link_v3(&action_id).await;

        assert!(activate_link_result.is_ok());
        let activate_link_result = activate_link_result.unwrap();
        assert!(activate_link_result.icrc112_requests.is_some());
        let icrc112_requests = activate_link_result.icrc112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];
        assert_eq!(requests.len(), 1, "There should be 1 ICRC-112 request");
        let icrc2_approve_request = requests
            .iter()
            .find(|req| req.method == "icrc2_approve")
            .expect("icrc2_approve request not found");
        let third_icrc2_approve_arg = Decode!(&icrc2_approve_request.arg, ApproveArgs)
            .expect("Failed to decode icrc2_approve args");

        let third_approve_created_ts = third_icrc2_approve_arg
            .created_at_time
            .expect("Third icrc2_approve args ts should not be None");
        let second_approve_created_ts = second_icrc2_approve_arg
            .created_at_time
            .expect("Second icrc2_approve args ts should not be None");
        assert!(
            (third_approve_created_ts - second_approve_created_ts)
                > (24 * 3600 + 1) * 1_000_000_000,
            "ICRC2 approve created_at_time should be advanced by 1 day + 1 second on third activation"
        );

        Ok(())
    })
    .await
    .unwrap();
}
