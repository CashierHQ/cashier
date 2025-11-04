use crate::{
    cashier_backend::link::fixture::{LinkTestFixture, create_tip_link_fixture},
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};
use candid::{Nat, Principal};
use cashier_backend_types::{
    constant,
    dto::action::CreateActionInput,
    error::CanisterError,
    repository::{
        action::v1::{ActionState, ActionType},
        intent::v1::IntentState,
    },
};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_error_withdraw_link_tip_if_caller_anonymous() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) =
            create_tip_link_fixture(ctx, constant::ICP_TOKEN, Nat::from(1u64)).await;

        let caller = Principal::anonymous();
        let caller_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act
        let result = cashier_backend_client
            .user_create_action(CreateActionInput {
                link_id: link.id.clone(),
                action_type: ActionType::Withdraw,
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
async fn it_should_error_withdraw_link_tip_if_caller_not_creator() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) =
            create_tip_link_fixture(ctx, constant::ICP_TOKEN, Nat::from(1u64)).await;

        let caller = TestUser::User2.get_principal();
        let caller_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &caller).await;
        let cashier_backend_client = caller_fixture.ctx.new_cashier_backend_client(caller);

        // Act
        let result = cashier_backend_client
            .user_create_action(CreateActionInput {
                link_id: link.id.clone(),
                action_type: ActionType::Withdraw,
            })
            .await
            .unwrap();

        // Assert
        assert!(result.is_err());
        if let Err(CanisterError::ValidationErrors(err)) = result {
            assert!(err.contains("User is not the creator of the link"));
        } else {
            panic!("Expected PocketIcTestError, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_withdraw_link_tip_icp_token_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) =
            create_tip_link_fixture(ctx, constant::ICP_TOKEN, Nat::from(10_000u64)).await;

        let icp_ledger_client = creator_fixture
            .ctx
            .new_icp_ledger_client(creator_fixture.caller);
        let caller_account = Account {
            owner: creator_fixture.caller,
            subaccount: None,
        };
        let caller_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();

        // Act
        let withdraw_action = creator_fixture
            .create_action(&link.id, ActionType::Withdraw)
            .await;

        // Assert
        assert!(!withdraw_action.id.is_empty());
        assert_eq!(withdraw_action.r#type, ActionType::Withdraw);
        assert_eq!(withdraw_action.state, ActionState::Created);
        assert_eq!(withdraw_action.intents.len(), 1);
        assert!(
            withdraw_action
                .intents
                .iter()
                .all(|intent| { intent.state == IntentState::Created }),
        );

        // Act
        let withdraw_result = creator_fixture
            .process_action(&link.id, &withdraw_action.id, ActionType::Withdraw)
            .await;

        // Assert
        assert_eq!(withdraw_result.id, withdraw_action.id);

        let tip_amount = link.asset_info[0].amount_per_link_use_action.clone();
        let caller_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(
            caller_balance_after,
            caller_balance_before + tip_amount,
            "Caller balance after withdrawal is incorrect"
        );

        let link_account = link_id_to_account(&creator_fixture.ctx, &link.id);
        let link_balance_after = icp_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance_after, 0u64,
            "Link balance after withdrawal is incorrect"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_withdraw_link_tip_icp_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) =
            create_tip_link_fixture(ctx, constant::ICP_TOKEN, Nat::from(10_000u64)).await;

        let be_cycles_before = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;

        // Act
        let withdraw_action = creator_fixture
            .create_action(&link.id, ActionType::Withdraw)
            .await;
        let _withdraw_result = creator_fixture
            .process_action(&link.id, &withdraw_action.id, ActionType::Withdraw)
            .await;

        // Assert
        let be_cycles_after = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!("BE cycles usage withdraw ICP tip link: {}", cycles_usage);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_withdraw_link_tip_icrc_token_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) =
            create_tip_link_fixture(ctx, constant::CKBTC_ICRC_TOKEN, Nat::from(1_000_000u64)).await;

        let icrc_ledger_client = creator_fixture
            .ctx
            .new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, creator_fixture.caller);
        let caller_account = Account {
            owner: creator_fixture.caller,
            subaccount: None,
        };
        let caller_balance_before = icrc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();

        // Act
        let withdraw_action = creator_fixture
            .create_action(&link.id, ActionType::Withdraw)
            .await;

        // Assert
        assert!(!withdraw_action.id.is_empty());
        assert_eq!(withdraw_action.r#type, ActionType::Withdraw);
        assert_eq!(withdraw_action.state, ActionState::Created);
        assert_eq!(withdraw_action.intents.len(), 1);
        assert!(
            withdraw_action
                .intents
                .iter()
                .all(|intent| { intent.state == IntentState::Created }),
        );

        // Act
        let withdraw_result = creator_fixture
            .process_action(&link.id, &withdraw_action.id, ActionType::Withdraw)
            .await;

        // Assert
        assert_eq!(withdraw_result.id, withdraw_action.id);

        let tip_amount = link.asset_info[0].amount_per_link_use_action.clone();
        let caller_balance_after = icrc_ledger_client
            .balance_of(&caller_account)
            .await
            .unwrap();
        assert_eq!(
            caller_balance_after,
            caller_balance_before + tip_amount,
            "Caller balance after withdrawal is incorrect"
        );

        let link_account = link_id_to_account(&creator_fixture.ctx, &link.id);
        let link_balance_after = icrc_ledger_client.balance_of(&link_account).await.unwrap();
        assert_eq!(
            link_balance_after, 0u64,
            "Link balance after withdrawal is incorrect"
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
#[ignore = "benchmark"]
async fn benchmark_withdraw_link_tip_icrc_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let (creator_fixture, link) =
            create_tip_link_fixture(ctx, constant::CKBTC_ICRC_TOKEN, Nat::from(1_000_000u64)).await;

        let be_cycles_before = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;

        // Act
        let withdraw_action = creator_fixture
            .create_action(&link.id, ActionType::Withdraw)
            .await;
        let _withdraw_result = creator_fixture
            .process_action(&link.id, &withdraw_action.id, ActionType::Withdraw)
            .await;

        // Assert
        let be_cycles_after = ctx
            .client
            .cycle_balance(ctx.cashier_backend_principal)
            .await;
        let cycles_usage = be_cycles_before - be_cycles_after;
        assert!(cycles_usage > 0);
        println!("BE cycles usage withdraw ICRC tip link: {}", cycles_usage);

        Ok(())
    })
    .await
    .unwrap();
}
