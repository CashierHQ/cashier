use crate::cashier_backend::link::fixture::{LinkTestFixture, create_token_basket_link_fixture};
use crate::utils::principal::TestUser;
use candid::Principal;
use cashier_backend_types::{
    constant,
    dto::action::CreateActionInput,
    repository::{
        action::v1::{ActionState, ActionType},
        intent::v2::IntentState,
    },
};
use ic_mple_client::CanisterClientError;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_error_use_link_token_basket_if_caller_anonymous() {
    // Arrange
    let (creator_fixture, link) = create_token_basket_link_fixture().await;

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
async fn it_should_use_link_token_basket_successfully() {
    // Arrange
    let (creator_fixture, link) = create_token_basket_link_fixture().await;

    let claimer = TestUser::User2.get_principal();
    let claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
    claimer_fixture.setup_user().await;

    let icp_ledger_client = claimer_fixture.ctx.new_icp_ledger_client(claimer);
    let ckbtc_ledger_client = claimer_fixture
        .ctx
        .new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, claimer);
    let ckusdc_ledger_client = claimer_fixture
        .ctx
        .new_icrc_ledger_client(constant::CKUSDC_ICRC_TOKEN, claimer);
    let claimer_account = Account {
        owner: claimer,
        subaccount: None,
    };

    // Act
    let icp_balance_before = icp_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();
    let ckbtc_balance_before = ckbtc_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();
    let ckusdc_balance_before = ckusdc_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();

    // Assert
    assert_eq!(
        icp_balance_before, 0u64,
        "Claimer should have zero-balance before claiming ICP"
    );
    assert_eq!(
        ckbtc_balance_before, 0u64,
        "Claimer should have zero-balance before claiming cKBTC"
    );
    assert_eq!(
        ckusdc_balance_before, 0u64,
        "Claimer should have zero-balance before claiming cKUSDC"
    );

    // Act
    let use_action = claimer_fixture
        .create_action(&link.id, constant::USE_LINK_ACTION)
        .await;

    // Assert
    assert!(!use_action.id.is_empty());
    assert_eq!(use_action.r#type, ActionType::Use.to_string());
    assert_eq!(use_action.state, ActionState::Created.to_string());
    assert_eq!(use_action.intents.len(), 3);

    // Act
    let processing_action = claimer_fixture
        .process_action(&link.id, &use_action.id, constant::USE_LINK_ACTION)
        .await;

    // Assert
    assert_eq!(processing_action.id, use_action.id);
    assert_eq!(processing_action.r#type, ActionType::Use.to_string());
    assert_eq!(processing_action.state, ActionState::Success.to_string());
    assert!(
        processing_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Success.to_string())
    );

    let icp_link_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    let ckbtc_link_amount = link.asset_info.as_ref().unwrap()[1].amount_per_link_use_action;
    let ckusdc_link_amount = link.asset_info.as_ref().unwrap()[2].amount_per_link_use_action;

    let claimer_icp_balance_after = icp_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();
    let claimer_ckbtc_balance_after = ckbtc_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();
    let claimer_ckusdc_balance_after = ckusdc_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();

    assert_eq!(
        claimer_icp_balance_after, icp_link_amount,
        "Claimer ICP balance after claim is incorrect"
    );
    assert_eq!(
        claimer_ckbtc_balance_after, ckbtc_link_amount,
        "Claimer cKBTC balance after claim is incorrect"
    );
    assert_eq!(
        claimer_ckusdc_balance_after, ckusdc_link_amount,
        "Claimer cKUSDC balance after claim is incorrect"
    );
}
