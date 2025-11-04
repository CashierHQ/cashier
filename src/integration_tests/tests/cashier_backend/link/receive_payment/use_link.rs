use crate::cashier_backend::link::fixture::{LinkTestFixture, create_receive_payment_link_fixture};
use crate::utils::{
    icrc_112, link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context,
};
use candid::{Nat, Principal};
use cashier_backend_types::repository::action::v1::ActionType;
use cashier_backend_types::{
    constant,
    dto::action::CreateActionInput,
    repository::{action::v1::ActionState, intent::v1::IntentState},
};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_error_use_link_payment_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) =
            create_receive_payment_link_fixture(ctx, constant::ICP_TOKEN, Nat::from(1_000_000u64))
                .await;

        let payer = Principal::anonymous();
        let payer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &payer).await;
        let cashier_backend_client = payer_fixture.ctx.new_cashier_backend_client(payer);

        // Act
        let result = cashier_backend_client
            .user_create_action(CreateActionInput {
                link_id: link.id.clone(),
                action_type: ActionType::Use,
            })
            .await;

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
async fn it_should_use_link_payment_icp_token_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) =
            create_receive_payment_link_fixture(ctx, constant::ICP_TOKEN, Nat::from(1_000_000u64))
                .await;

        let payer = TestUser::User2.get_principal();
        let mut payer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &payer).await;

        let initial_balance = Nat::from(1_000_000_000u64);
        payer_fixture
            .airdrop_icp(initial_balance.clone(), &payer)
            .await;

        let icp_ledger_client = payer_fixture.ctx.new_icp_ledger_client(payer);
        let payer_account = Account {
            owner: payer,
            subaccount: None,
        };

        // Act
        let icp_balance_before = icp_ledger_client.balance_of(&payer_account).await.unwrap();

        // Assert
        assert_eq!(
            icp_balance_before, initial_balance,
            "payer should has initial balance before using"
        );

        // Act
        let pay_action = payer_fixture.create_action(&link.id, ActionType::Use).await;

        // Assert
        assert!(!pay_action.id.is_empty());
        assert_eq!(pay_action.r#type, ActionType::Use);
        assert_eq!(pay_action.state, ActionState::Created);

        // Act
        let processing_action = payer_fixture
            .process_action(&link.id, &pay_action.id, ActionType::Use)
            .await;

        // Assert
        assert_eq!(processing_action.id, pay_action.id);
        assert!(processing_action.icrc_112_requests.is_some());
        assert!(
            !processing_action
                .icrc_112_requests
                .as_ref()
                .unwrap()
                .is_empty()
        );

        // Arrange
        let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

        // Act
        let icrc112_execution_result =
            icrc_112::execute_icrc112_request(icrc_112_requests, payer, &payer_fixture.ctx).await;

        // Assert
        assert!(icrc112_execution_result.is_ok());

        // Act
        let update_action = payer_fixture
            .update_action(&link.id, &processing_action.id)
            .await;

        // Assert
        assert!(!update_action.id.is_empty());
        assert_eq!(update_action.r#type, ActionType::Use);
        assert_eq!(update_action.state, ActionState::Success);
        assert!(
            update_action
                .intents
                .iter()
                .all(|intent| intent.state == IntentState::Success)
        );

        let payment_amount = link.asset_info[0].amount_per_link_use_action.clone();
        assert_ne!(payment_amount, Nat::from(0u64));

        let icp_balance_after = icp_ledger_client.balance_of(&payer_account).await.unwrap();
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
        assert_eq!(
            icp_balance_after,
            icp_balance_before - payment_amount.clone() - icp_ledger_fee,
            "payer balance after is incorrect"
        );

        let link_account = link_id_to_account(&creator_fixture.ctx, &link.id);
        let link_icp_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_icp_balance, payment_amount,
            "Link ICP balance is incorrect"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_use_link_payment_icp_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) =
            create_receive_payment_link_fixture(ctx, constant::ICP_TOKEN, Nat::from(1_000_000u64))
                .await;
        let payer = TestUser::User2.get_principal();
        let mut payer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &payer).await;
        let initial_balance = Nat::from(1_000_000_000u64);
        payer_fixture.airdrop_icp(initial_balance, &payer).await;
        let be_cycles_before = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;

        // Act
        let pay_action = payer_fixture.create_action(&link.id, ActionType::Use).await;
        let processing_action = payer_fixture
            .process_action(&link.id, &pay_action.id, ActionType::Use)
            .await;
        let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
        let _icrc112_execution_result =
            icrc_112::execute_icrc112_request(icrc_112_requests, payer, &payer_fixture.ctx).await;
        let _update_action = payer_fixture
            .update_action(&link.id, &processing_action.id)
            .await;

        // Assert
        let be_cycles_after = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!(
            "BE cycles usage for use link payment ICP token: {}",
            cycles_usage
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_use_link_payment_icrc_token_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) = create_receive_payment_link_fixture(
            ctx,
            constant::CKUSDC_ICRC_TOKEN,
            Nat::from(1_000_000u64),
        )
        .await;

        let payer = TestUser::User2.get_principal();
        let mut payer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &payer).await;

        let initial_balance = Nat::from(1_000_000_000u64);

        payer_fixture
            .airdrop_icp(initial_balance.clone(), &payer)
            .await;
        payer_fixture
            .airdrop_icrc(constant::CKUSDC_ICRC_TOKEN, initial_balance.clone(), &payer)
            .await;

        let ckusdc_ledger_client = payer_fixture
            .ctx
            .new_icrc_ledger_client(constant::CKUSDC_ICRC_TOKEN, payer);

        let payer_account = Account {
            owner: payer,
            subaccount: None,
        };

        // Act
        let ckusdc_balance_before = ckusdc_ledger_client
            .balance_of(&payer_account)
            .await
            .unwrap();

        // Assert
        assert_eq!(
            ckusdc_balance_before, initial_balance,
            "payer should has initial balance before using"
        );

        // Act
        let pay_action = payer_fixture.create_action(&link.id, ActionType::Use).await;

        // Assert
        assert!(!pay_action.id.is_empty());
        assert_eq!(pay_action.r#type, ActionType::Use);
        assert_eq!(pay_action.state, ActionState::Created);

        // Act
        let processing_action = payer_fixture
            .process_action(&link.id, &pay_action.id, ActionType::Use)
            .await;

        // Assert
        assert_eq!(processing_action.id, pay_action.id);
        assert!(processing_action.icrc_112_requests.is_some());
        assert!(
            !processing_action
                .icrc_112_requests
                .as_ref()
                .unwrap()
                .is_empty()
        );

        // Arrange
        let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

        // Act
        let icrc112_execution_result =
            icrc_112::execute_icrc112_request(icrc_112_requests, payer, &payer_fixture.ctx).await;

        // Assert
        assert!(icrc112_execution_result.is_ok());

        // Act
        let update_action = payer_fixture
            .update_action(&link.id, &processing_action.id)
            .await;

        // Assert
        assert!(!update_action.id.is_empty());
        assert_eq!(update_action.r#type, ActionType::Use);
        assert_eq!(update_action.state, ActionState::Success);
        assert!(
            update_action
                .intents
                .iter()
                .all(|intent| intent.state == IntentState::Success)
        );

        let payment_amount = link.asset_info[0].amount_per_link_use_action.clone();
        assert_ne!(payment_amount, Nat::from(0u64));

        let ckusdc_balance_after = ckusdc_ledger_client
            .balance_of(&payer_account)
            .await
            .unwrap();
        let ckusdc_ledger_fee = ckusdc_ledger_client.fee().await.unwrap();
        assert_eq!(
            ckusdc_balance_after,
            ckusdc_balance_before - payment_amount.clone() - ckusdc_ledger_fee,
            "payer balance after is incorrect"
        );

        let link_account = link_id_to_account(&creator_fixture.ctx, &link.id);
        let link_ckusdc_balance = ckusdc_ledger_client
            .balance_of(&link_account)
            .await
            .unwrap();
        assert_eq!(
            link_ckusdc_balance, payment_amount,
            "Link CKUSDC balance is incorrect"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_use_link_payment_icrc_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) = create_receive_payment_link_fixture(
            ctx,
            constant::CKUSDC_ICRC_TOKEN,
            Nat::from(1_000_000u64),
        )
        .await;
        let payer = TestUser::User2.get_principal();
        let mut payer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &payer).await;
        let initial_balance = Nat::from(1_000_000_000u64);
        payer_fixture
            .airdrop_icp(initial_balance.clone(), &payer)
            .await;
        payer_fixture
            .airdrop_icrc(constant::CKUSDC_ICRC_TOKEN, initial_balance, &payer)
            .await;
        let be_cycles_before = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;

        // Act
        let pay_action = payer_fixture.create_action(&link.id, ActionType::Use).await;
        let processing_action = payer_fixture
            .process_action(&link.id, &pay_action.id, ActionType::Use)
            .await;
        let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();
        let _icrc112_execution_result =
            icrc_112::execute_icrc112_request(icrc_112_requests, payer, &payer_fixture.ctx).await;
        let _update_action = payer_fixture
            .update_action(&link.id, &processing_action.id)
            .await;

        // Assert
        let be_cycles_after = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!(
            "BE cycles usage for use link payment ICRC token: {}",
            cycles_usage
        );

        Ok(())
    })
    .await
    .unwrap();
}
