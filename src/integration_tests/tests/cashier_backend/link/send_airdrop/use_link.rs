use crate::cashier_backend::link::fixture::{
    LinkTestFixture, create_airdrop_link_fixture, create_airdrop_link_other_token_fixture,
};
use crate::utils::principal::TestUser;
use candid::Principal;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::{
    constant, dto::action::CreateActionInput, repository::action::v1::ActionState,
};
use cashier_common::utils;
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

#[tokio::test]
async fn it_should_error_use_link_airdrop_multiple_times_from_same_user() {
    // Arrange
    let (creator_fixture, link) = create_airdrop_link_fixture().await;

    let claimer = TestUser::User2.get_principal();
    let claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
    claimer_fixture.setup_user().await;

    let claim_action = claimer_fixture
        .create_action(&link.id, constant::USE_LINK_ACTION)
        .await;
    let _claim_result = claimer_fixture
        .process_action(&link.id, &claim_action.id, constant::USE_LINK_ACTION)
        .await;

    let cashier_backend_client = claimer_fixture.ctx.new_cashier_backend_client(claimer);

    // Act
    let result = cashier_backend_client
        .create_action(CreateActionInput {
            link_id: link.id.clone(),
            action_type: constant::USE_LINK_ACTION.to_string(),
        })
        .await
        .unwrap();

    // Assert
    assert!(result.is_err());
    if let Err(CanisterError::ValidationErrors(err)) = result {
        assert!(err.contains("Action already exist"));
    } else {
        panic!("Expected PocketIcTestError, got {:?}", result);
    }
}

#[tokio::test]
async fn it_should_use_link_airdrop_multiple_times_successfully() {
    // Arrange
    let (creator_fixture, link) = create_airdrop_link_fixture().await;

    let airdrop_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    assert_ne!(airdrop_amount, 0);
    let max_use_count = link.link_use_action_max_count;
    let icp_ledger_client = creator_fixture
        .ctx
        .new_icp_ledger_client(creator_fixture.caller);

    for _i in 0..max_use_count {
        let claimer = Principal::from_text(utils::random_principal_id()).unwrap();
        let claimer_account = Account {
            owner: claimer,
            subaccount: None,
        };
        let claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
        claimer_fixture.setup_user().await;

        // Act
        let claim_action = claimer_fixture
            .create_action(&link.id, constant::USE_LINK_ACTION)
            .await;

        // Assert
        assert!(!claim_action.id.is_empty());
        assert_eq!(claim_action.r#type, constant::USE_LINK_ACTION);
        assert_eq!(claim_action.state, ActionState::Created.to_string());

        // Act
        let _claim_result = claimer_fixture
            .process_action(&link.id, &claim_action.id, constant::USE_LINK_ACTION)
            .await;

        // Assert
        let claimer_balance_after = icp_ledger_client
            .balance_of(&claimer_account)
            .await
            .unwrap();
        assert_eq!(
            claimer_balance_after, airdrop_amount,
            "Claimer balance after claim should be equal to airdrop amount"
        );
    }

    // Arrange
    let cashier_backend_client = creator_fixture
        .ctx
        .new_cashier_backend_client(creator_fixture.caller);

    // Act
    let link_info = cashier_backend_client
        .get_link(link.id, None)
        .await
        .unwrap()
        .unwrap();

    // Assert
    assert_eq!(link_info.link.link_use_action_counter, max_use_count);
}

#[tokio::test]
async fn it_should_error_use_link_airdrop_more_than_max_use_count() {
    // Arrange
    let (creator_fixture, link) = create_airdrop_link_fixture().await;

    let airdrop_amount = link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action;
    assert_ne!(airdrop_amount, 0);
    let max_use_count = link.link_use_action_max_count;

    for _i in 0..max_use_count {
        let claimer = Principal::from_text(utils::random_principal_id()).unwrap();
        let claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
        claimer_fixture.setup_user().await;

        let claim_action = claimer_fixture
            .create_action(&link.id, constant::USE_LINK_ACTION)
            .await;
        let _claim_result = claimer_fixture
            .process_action(&link.id, &claim_action.id, constant::USE_LINK_ACTION)
            .await;
    }

    let claimer = Principal::from_text(utils::random_principal_id()).unwrap();
    let claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
    claimer_fixture.setup_user().await;
    let cashier_backend_client = claimer_fixture.ctx.new_cashier_backend_client(claimer);

    // Act
    let result = cashier_backend_client
        .create_action(CreateActionInput {
            link_id: link.id.clone(),
            action_type: constant::USE_LINK_ACTION.to_string(),
        })
        .await
        .unwrap();

    // Assert
    assert!(result.is_err());
    if let Err(CanisterError::ValidationErrors(err)) = result {
        assert!(err.contains("Link maximum usage count reached"));
    } else {
        panic!("Expected PocketIcTestError, got {:?}", result);
    }
}

#[tokio::test]
async fn it_should_use_link_airdrop_other_token_successfully() {
    // Arrange
    let (creator_fixture, link) = create_airdrop_link_other_token_fixture().await;

    let claimer = TestUser::User2.get_principal();
    let claimer_fixture = LinkTestFixture::new(creator_fixture.ctx.clone(), &claimer).await;
    claimer_fixture.setup_user().await;

    let ckusdc_ledger_client = claimer_fixture
        .ctx
        .new_icrc_ledger_client(constant::CKUSDC_ICRC_TOKEN, claimer);
    let claimer_account = Account {
        owner: claimer,
        subaccount: None,
    };

    // Act
    let ckusdc_balance_before = ckusdc_ledger_client
        .balance_of(&claimer_account)
        .await
        .unwrap();

    // Assert
    assert_eq!(
        ckusdc_balance_before, 0u64,
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

    let claimer_balance_after = ckusdc_ledger_client
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
