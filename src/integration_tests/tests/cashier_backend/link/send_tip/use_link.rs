use crate::cashier_backend::link::fixture::{LinkTestFixture, create_tip_link_fixture};
use crate::utils::link_id_to_account::link_id_to_account;
use crate::utils::principal::TestUser;
use candid::Principal;
use cashier_backend_types::dto::action::CreateActionInput;
use cashier_backend_types::{constant, repository::action::v1::ActionState};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_error_use_link_tip_if_caller_anonymous() {
    // Arrange
    let (creator_fixture, link) = create_tip_link_fixture(constant::ICP_TOKEN, 1_000_000u64).await;

    let claimer = Principal::anonymous();
    let claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
    let cashier_backend_client = claimer_fixture.ctx.new_cashier_backend_client(claimer);

    // Act
    let result = cashier_backend_client
        .create_action(CreateActionInput {
            link_id: link.id.clone(),
            action_type: constant::USE_LINK_ACTION.to_string(),
        })
        .await;

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
}

#[tokio::test]
async fn it_should_use_link_tip_icp_token_successfully() {
    // Arrange
    let (creator_fixture, link) = create_tip_link_fixture(constant::ICP_TOKEN, 5_000_000u64).await;

    let claimer = TestUser::User2.get_principal();
    let claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
    claimer_fixture.setup_user().await;

    let icp_ledger_client = claimer_fixture.ctx.new_icp_ledger_client(claimer);
    let claimer_account = Account {
        owner: claimer,
        subaccount: None,
    };

    // Act
    let icp_balance_before = icp_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();

    // Assert
    assert_eq!(
        icp_balance_before, 0u64,
        "Claimer should has zero-balance before claiming"
    );

    // Act
    let claim_action = claimer_fixture
        .create_action(&link.id, constant::USE_LINK_ACTION)
        .await;

    // Assert
    assert!(!claim_action.id.is_empty());
    assert_eq!(claim_action.r#type, constant::USE_LINK_ACTION);
    assert_eq!(claim_action.state, ActionState::Created.to_string());

    // Act
    let claim_result = claimer_fixture
        .process_action(&link.id, &claim_action.id, constant::USE_LINK_ACTION)
        .await;

    // Assert
    assert_eq!(claim_result.id, claim_action.id);
    let tip_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    assert_ne!(tip_amount, 0);

    let claimer_balance_after = icp_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();
    assert_eq!(
        claimer_balance_after, tip_amount,
        "Claimer balance after claim should be equal to tip amount"
    );

    let link_account = link_id_to_account(&claimer_fixture.ctx, &link.id);
    let link_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
    assert_eq!(link_balance, 0u64, "Link balance should be equal to zero");
}

#[tokio::test]
async fn it_should_use_link_tip_icrc_token_successfully() {
    // Arrange
    let (creator_fixture, link) =
        create_tip_link_fixture(constant::CKBTC_ICRC_TOKEN, 1_000_000u64).await;

    let claimer = TestUser::User2.get_principal();
    let claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
    claimer_fixture.setup_user().await;

    let icrc_ledger_client = claimer_fixture
        .ctx
        .new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, claimer);
    let claimer_account = Account {
        owner: claimer,
        subaccount: None,
    };

    // Act
    let icrc_balance_before = icrc_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();

    // Assert
    assert_eq!(
        icrc_balance_before, 0u64,
        "Claimer should has zero-balance before claiming"
    );

    // Act
    let claim_action = claimer_fixture
        .create_action(&link.id, constant::USE_LINK_ACTION)
        .await;

    // Assert
    assert!(!claim_action.id.is_empty());
    assert_eq!(claim_action.r#type, constant::USE_LINK_ACTION);
    assert_eq!(claim_action.state, ActionState::Created.to_string());

    // Act
    let claim_result = claimer_fixture
        .process_action(&link.id, &claim_action.id, constant::USE_LINK_ACTION)
        .await;

    // Assert
    assert_eq!(claim_result.id, claim_action.id);
    let tip_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    assert_ne!(tip_amount, 0);

    let claimer_balance_after = icrc_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();
    assert_eq!(
        claimer_balance_after, tip_amount,
        "Claimer balance after claim should be equal to tip amount"
    );

    let link_account = link_id_to_account(&claimer_fixture.ctx, &link.id);
    let link_balance = icrc_ledger_client.balance_of(&link_account).await.unwrap();
    assert_eq!(link_balance, 0u64, "Link balance should be equal to zero");
}
