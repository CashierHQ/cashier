use crate::cashier_backend::link::fixture::{LinkTestFixture, create_receive_payment_link_fixture};
use crate::utils::{icrc_112, link_id_to_account::link_id_to_account, principal::TestUser};
use candid::Principal;
use cashier_backend_types::{
    constant,
    dto::action::CreateActionInput,
    repository::{action::v1::ActionState, intent::v2::IntentState},
};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_error_use_link_payment_if_caller_anonymous() {
    // Arrange
    let (creator_fixture, link) =
        create_receive_payment_link_fixture(constant::ICP_TOKEN, 1u64).await;

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
async fn it_should_use_link_icp_token_successfully() {
    // Arrange
    let (creator_fixture, link) =
        create_receive_payment_link_fixture(constant::ICP_TOKEN, 1_000_000u64).await;

    let claimer = TestUser::User2.get_principal();
    let mut claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
    claimer_fixture.setup_user().await;

    let initial_balance = 1_000_000_000u64;
    claimer_fixture.airdrop_icp(initial_balance, &claimer).await;

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
    assert_ne!(
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
    let processing_action = claimer_fixture
        .process_action(&link.id, &claim_action.id, constant::USE_LINK_ACTION)
        .await;

    // Assert
    assert_eq!(processing_action.id, claim_action.id);
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
        icrc_112::execute_icrc112_request(icrc_112_requests, claimer, &claimer_fixture.ctx).await;

    // Assert
    assert!(icrc112_execution_result.is_ok());

    // Act
    let update_action = claimer_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    // Assert
    assert!(!update_action.id.is_empty());
    assert_eq!(update_action.r#type, constant::USE_LINK_ACTION);
    assert_eq!(update_action.state, ActionState::Success.to_string());
    assert!(
        update_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Success.to_string())
    );

    let payment_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    assert_ne!(payment_amount, 0);

    let icp_balance_after = icp_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();
    let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
    assert_eq!(
        icp_balance_after,
        icp_balance_before - payment_amount - icp_ledger_fee,
        "Claimer balance after claim should be equal to payment amount"
    );

    let link_account = link_id_to_account(&creator_fixture.ctx, &link.id);
    let link_icp_balance = icp_ledger_client.balance_of(&link_account).await.unwrap();
    assert_eq!(
        link_icp_balance, payment_amount,
        "Link ICP balance should be equal to payment amount"
    );
}
