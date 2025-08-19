use crate::cashier_backend::link::fixture::{LinkTestFixture, create_airdrop_link_fixture};
use crate::utils::principal::TestUser;
use candid::Principal;
use cashier_backend_types::{
    constant, dto::action::CreateActionInput, repository::action::v1::ActionState,
};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_error_use_link_airdrop_if_caller_anonymous() {
    // Arrange
    let (creator_fixture, link) = create_airdrop_link_fixture().await;

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
async fn it_should_use_link_airdrop_successfully() {
    // Arrange
    let (creator_fixture, link) = create_airdrop_link_fixture().await;

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

    let airdrop_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    assert_ne!(airdrop_amount, 0);

    let claimer_balance_after = icp_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();
    assert_eq!(
        claimer_balance_after, airdrop_amount,
        "Claimer balance after claim should be equal to airdrop amount"
    );

    // Arrange
    let cashier_backend_client = claimer_fixture.ctx.new_cashier_backend_client(claimer);

    let link_info = cashier_backend_client
        .get_link(link.id, None)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(link_info.link.link_use_action_counter, 1);
}
