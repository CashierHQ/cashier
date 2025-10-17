use crate::cashier_backend::link::fixture::LinkTestFixture;
use crate::utils::{
    icrc_112, link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context,
};
use candid::Principal;
use cashier_backend_types::dto::link::LinkStateMachineGoto;
use cashier_backend_types::{
    constant,
    dto::link::UpdateLinkInput,
    repository::{
        action::v1::{ActionState, ActionType},
        intent::v1::IntentState,
        link::v1::{LinkState, LinkType},
    },
};
use cashier_common::test_utils;
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;

#[tokio::test]
async fn it_should_error_create_link_tip_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let be_client = ctx.new_cashier_backend_client(Principal::anonymous());
        let test_fixture =
            LinkTestFixture::new(Arc::new(ctx.clone()), &Principal::anonymous()).await;
        let icp_link_amount = 10_000_000u64;
        let ckbtc_link_amount = 1_000u64;
        let ckusdc_link_amount = 50_000_000u64;
        let link_input = test_fixture
            .token_basket_link_input(
                vec![
                    constant::ICP_TOKEN.to_string(),
                    constant::CKBTC_ICRC_TOKEN.to_string(),
                    constant::CKUSDC_ICRC_TOKEN.to_string(),
                ],
                vec![icp_link_amount, ckbtc_link_amount, ckusdc_link_amount],
            )
            .unwrap();

        // Act
        let result = be_client.create_link(link_input).await;

        // Assert
        assert!(result.is_err());
        if let Err(CanisterClientError::PocketIcTestError(err)) = result {
            assert!(
                err.reject_message
                    .contains("Anonymous caller is not allowed")
            );
        } else {
            panic!("Expected PocketIcTestError, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_link_token_basket_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client(constant::CKUSDC_ICRC_TOKEN, caller);
        let icp_initial_balance = 1_000_000_000u64;
        let ckbtc_initial_balance = 1_000_000_000u64;
        let ckusdc_initial_balance = 1_000_000_000u64;

        // Act
        test_fixture.airdrop_icp(icp_initial_balance, &caller).await;
        test_fixture
            .airdrop_icrc(constant::CKBTC_ICRC_TOKEN, ckbtc_initial_balance, &caller)
            .await;
        test_fixture
            .airdrop_icrc(constant::CKUSDC_ICRC_TOKEN, ckusdc_initial_balance, &caller)
            .await;

        // Assert
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let icp_balance = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_balance = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        let ckusdc_balance = ckusdc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        assert_eq!(icp_balance, icp_initial_balance);
        assert_eq!(ckbtc_balance, ckbtc_initial_balance);
        assert_eq!(ckusdc_balance, ckusdc_initial_balance);

        // Arrange
        let icp_link_amount = 10_000_000u64;
        let ckbtc_link_amount = 1_000u64;
        let ckusdc_link_amount = 50_000_000u64;
        let link_input = test_fixture
            .token_basket_link_input(
                vec![
                    constant::ICP_TOKEN.to_string(),
                    constant::CKBTC_ICRC_TOKEN.to_string(),
                    constant::CKUSDC_ICRC_TOKEN.to_string(),
                ],
                vec![icp_link_amount, ckbtc_link_amount, ckusdc_link_amount],
            )
            .unwrap();

        // Act
        let link = test_fixture.create_link(link_input).await;

        // Assert
        assert!(!link.id.is_empty());
        assert_eq!(link.link_type, LinkType::SendTokenBasket);
        assert_eq!(link.asset_info.len(), 3);

        // Act
        let create_action = test_fixture
            .create_action(&link.id, ActionType::CreateLink)
            .await;

        // Assert
        assert!(!create_action.id.is_empty());
        assert_eq!(create_action.r#type, ActionType::CreateLink);
        assert_eq!(create_action.state, ActionState::Created);
        assert_eq!(create_action.intents.len(), 4);

        // Act
        let processing_action = test_fixture
            .process_action(&link.id, &create_action.id, ActionType::CreateLink)
            .await;

        // Assert
        assert_eq!(processing_action.id, create_action.id);
        assert_eq!(processing_action.r#type, ActionType::CreateLink);
        assert_eq!(processing_action.state, ActionState::Processing);
        assert!(processing_action.icrc_112_requests.is_some());
        assert_eq!(
            processing_action.icrc_112_requests.as_ref().unwrap().len(),
            2
        );
        assert_eq!(
            processing_action.icrc_112_requests.as_ref().unwrap()[0].len(),
            4,
            "First request should have 4 elements"
        );
        assert_eq!(
            processing_action.icrc_112_requests.as_ref().unwrap()[1].len(),
            1,
            "Second request should have 1 element"
        );

        // Arrange
        let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

        // Act
        let icrc112_execution_result =
            icrc_112::execute_icrc112_request(icrc_112_requests, caller, ctx).await;

        // Assert
        assert!(icrc112_execution_result.is_ok());

        // Act
        let update_action = test_fixture
            .update_action(&link.id, &processing_action.id)
            .await;

        // Assert
        assert_eq!(update_action.id, processing_action.id);
        assert_eq!(update_action.r#type, ActionType::CreateLink);
        assert_eq!(update_action.state, ActionState::Success);
        assert!(
            update_action
                .intents
                .iter()
                .all(|intent| intent.state == IntentState::Success)
        );

        // Act
        let update_link_input = UpdateLinkInput {
            id: link.id.clone(),
            goto: LinkStateMachineGoto::Continue,
        };
        let update_link = test_fixture.update_link(update_link_input).await;

        // Assert
        assert_eq!(update_link.state, LinkState::Active);

        let icp_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        let ckbtc_balance_after = ckbtc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        let ckusdc_balance_after = ckusdc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
        let ckusdc_ledger_fee = ckusdc_ledger_client.fee().await.unwrap();

        let link_account = link_id_to_account(&test_fixture.ctx, &link.id);
        let icp_link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        let ckbtc_link_balance = ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
        let ckusdc_link_balance = ckusdc_ledger_client
            .balance_of(&link_account)
            .await
            .unwrap();

        assert_eq!(
            icp_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                icp_link_amount,
                &icp_ledger_fee,
                1
            ),
            "ICP Link balance is incorrect"
        );
        assert_eq!(
            ckbtc_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                ckbtc_link_amount,
                &ckbtc_ledger_fee,
                1
            ),
            "CKBTC Link balance is incorrect"
        );
        assert_eq!(
            ckusdc_link_balance,
            test_utils::calculate_amount_for_wallet_to_link_transfer(
                ckusdc_link_amount,
                &ckusdc_ledger_fee,
                1
            ),
            "CKUSDC Link balance is incorrect"
        );

        assert_eq!(
            icp_balance_after,
            icp_initial_balance
                - icp_ledger_fee.clone()
                - icp_link_balance
                - test_utils::calculate_amount_for_create_link(&icp_ledger_fee),
            "ICP balance after link creation is incorrect"
        );
        assert_eq!(
            ckbtc_balance_after,
            ckbtc_initial_balance - ckbtc_ledger_fee.clone() - ckbtc_link_balance,
            "CKBTC balance after link creation is incorrect"
        );
        assert_eq!(
            ckusdc_balance_after,
            ckusdc_initial_balance - ckusdc_ledger_fee.clone() - ckusdc_link_balance,
            "CKUSDC balance after link creation is incorrect"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_create_link_token_basket() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;
        let icp_initial_balance = 1_000_000_000u64;
        let ckbtc_initial_balance = 1_000_000_000u64;
        let ckusdc_initial_balance = 1_000_000_000u64;

        test_fixture.airdrop_icp(icp_initial_balance, &caller).await;
        test_fixture
            .airdrop_icrc(constant::CKBTC_ICRC_TOKEN, ckbtc_initial_balance, &caller)
            .await;
        test_fixture
            .airdrop_icrc(constant::CKUSDC_ICRC_TOKEN, ckusdc_initial_balance, &caller)
            .await;

        let icp_link_amount = 10_000_000u64;
        let ckbtc_link_amount = 1_000u64;
        let ckusdc_link_amount = 50_000_000u64;
        let link_input = test_fixture
            .token_basket_link_input(
                vec![
                    constant::ICP_TOKEN.to_string(),
                    constant::CKBTC_ICRC_TOKEN.to_string(),
                    constant::CKUSDC_ICRC_TOKEN.to_string(),
                ],
                vec![icp_link_amount, ckbtc_link_amount, ckusdc_link_amount],
            )
            .unwrap();

        let be_cycles_before = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;

        // Act
        let link = test_fixture.create_link(link_input).await;
        let create_action = test_fixture
            .create_action(&link.id, ActionType::CreateLink)
            .await;
        let processing_action = test_fixture
            .process_action(&link.id, &create_action.id, ActionType::CreateLink)
            .await;
        let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
        let _icrc112_execution_result =
            icrc_112::execute_icrc112_request(icrc_112_requests, caller, ctx).await;
        let _update_action = test_fixture
            .update_action(&link.id, &processing_action.id)
            .await;

        let update_link_input = UpdateLinkInput {
            id: link.id.clone(),
            goto: LinkStateMachineGoto::Continue,
        };
        let _update_link = test_fixture.update_link(update_link_input).await;

        // Assert
        let be_cycles_after = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!(
            "BE cycles usage for create link token basket: {}",
            cycles_usage
        );

        Ok(())
    })
    .await
    .unwrap();
}
