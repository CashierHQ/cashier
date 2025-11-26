// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link_v2::send_tip::fixture::TipLinkV2Fixture;
use crate::constant::CK_BTC_PRINCIPAL;
use crate::{
    constant::ICP_PRINCIPAL,
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};
use candid::{Nat, Principal};
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v1::{IntentTask, IntentType};
use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol};
use cashier_backend_types::{constant, repository::link::v1::LinkType};
use cashier_common::{constant::CREATE_LINK_FEE, test_utils};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;

#[tokio::test]
async fn it_should_error_create_icp_token_tip_linkv2_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let be_client = ctx.new_cashier_backend_client(Principal::anonymous());

        let caller = TestUser::User1.get_principal();
        let token = constant::ICP_TOKEN;
        let amount = Nat::from(1_000_000u64);
        let test_fixture =
            TipLinkV2Fixture::new(Arc::new(ctx.clone()), caller, token, amount.clone()).await;
        let input = test_fixture.tip_link_input().unwrap();

        // Act
        let result = be_client.user_create_link_v2(input).await;

        // Assert
        assert!(result.is_err());
        if let Err(CanisterClientError::PocketIcTestError(err)) = result {
            assert!(err.reject_message.contains("AnonimousUserNotAllowed"));
        } else {
            panic!("Expected PocketIcTestError, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_icp_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = constant::ICP_TOKEN;
        let tip_amount = Nat::from(1_000_000u64);
        let mut test_fixture =
            TipLinkV2Fixture::new(Arc::new(ctx.clone()), caller, token, tip_amount.clone()).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let initial_balance = Nat::from(1_000_000_000u64);
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        // Act
        test_fixture
            .link_fixture
            .airdrop_icp(initial_balance.clone(), &caller)
            .await;

        // Assert
        let caller_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            caller_balance_before, initial_balance,
            "Caller ICP balance does not match"
        );

        // Act
        let create_link_result = test_fixture.create_link().await;

        // Assert
        let link = create_link_result.link;
        let action = create_link_result.action;

        assert!(!link.id.is_empty());
        assert_eq!(link.link_type, LinkType::SendTip);
        assert_eq!(link.asset_info.len(), 1);
        assert_eq!(
            link.asset_info[0].amount_per_link_use_action,
            tip_amount.clone(),
            "Tip amount does not match"
        );

        assert_eq!(action.intents.len(), 2);

        // Assert Intent 1: TransferWalletToLink
        let intent1 = &action.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link.id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        icp_ledger_fee.clone(),
                        1
                    ),
                    "Transfer amount does not match"
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link.id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        icp_ledger_fee.clone(),
                        1
                    ),
                    "Icrc1Transfer amount does not match"
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &action.intents[1];
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert ICRC-112 requests
        assert!(action.icrc_112_requests.is_some());
        let icrc112_requests = action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2);
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
                    );
                }
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
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
async fn it_should_create_icrc_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let token = constant::CKBTC_ICRC_TOKEN;
        let tip_amount = Nat::from(5_000_000u64);
        let mut test_fixture =
            TipLinkV2Fixture::new(Arc::new(ctx.clone()), caller, token, tip_amount.clone()).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);

        let icp_initial_balance = Nat::from(1_000_000u64);
        let ckbtc_initial_balance = Nat::from(1_000_000_000u64);
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        // Act
        test_fixture
            .link_fixture
            .airdrop_icp(icp_initial_balance.clone(), &caller)
            .await;
        test_fixture
            .link_fixture
            .airdrop_icrc(
                constant::CKBTC_ICRC_TOKEN,
                ckbtc_initial_balance.clone(),
                &caller,
            )
            .await;

        // Assert
        let icp_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(icp_balance_before, icp_initial_balance);
        let ckbtc_balance_before = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(ckbtc_balance_before, ckbtc_initial_balance);

        // Act
        let create_link_result = test_fixture.create_link().await;

        // Assert
        let link = create_link_result.link;
        let action = create_link_result.action;

        assert!(!link.id.is_empty());
        assert_eq!(link.link_type, LinkType::SendTip);
        assert_eq!(link.asset_info.len(), 1);
        assert_eq!(
            link.asset_info[0].amount_per_link_use_action,
            tip_amount.clone()
        );

        assert_eq!(action.intents.len(), 2);

        // Assert Intent 1: TransferWalletToLink
        let intent1 = &action.intents[0];
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link.id).into());
                assert_eq!(
                    transfer.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount.clone(),
                        ckbtc_ledger_fee.clone(),
                        1
                    )
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link.id).into());
                assert_eq!(
                    data.amount,
                    test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        ckbtc_ledger_fee,
                        1
                    )
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        // Assert Intent 2: TransferWalletToTreasury
        let intent2 = &action.intents[1];
        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
                assert!(data.memo.is_some());
                assert!(data.ts.is_some());
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        // Assert ICRC-112 requests
        assert!(action.icrc_112_requests.is_some());
        let icrc112_requests = action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2);
        for req in requests {
            match req.method.as_str() {
                "icrc1_transfer" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(CK_BTC_PRINCIPAL).unwrap()
                    );
                }
                "icrc2_approve" => {
                    assert_eq!(
                        req.canister_id,
                        Principal::from_text(ICP_PRINCIPAL).unwrap()
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
