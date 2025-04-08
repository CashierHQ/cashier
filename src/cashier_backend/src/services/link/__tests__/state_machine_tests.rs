use cashier_types::{Action, ActionState, ActionType, Chain, Link, LinkState, LinkType};
use faux::when;
use uuid::Uuid;

use crate::{
    core::link::types::{LinkDetailUpdateAssetInfoInput, LinkDetailUpdateInput},
    repositories::{
        action::ActionRepository, link::LinkRepository, link_action::LinkActionRepository,
    },
    services::{
        __tests__::tests::{generate_token_address, MockIcEnvironment},
        link::v2::LinkService,
    },
    types::error::CanisterError,
    utils::icrc::IcrcService,
};

// Test helpers
fn create_mock_components() -> (
    MockIcEnvironment,
    LinkRepository,
    LinkActionRepository,
    ActionRepository,
    IcrcService,
) {
    let ic_env = MockIcEnvironment::faux();
    let link_repository = LinkRepository::faux();
    let link_action_repository = LinkActionRepository::faux();
    let action_repository = ActionRepository::faux();
    let icrc_service = IcrcService::faux();

    (
        ic_env,
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
    )
}

fn create_link_with_state(state: LinkState) -> Link {
    Link {
        id: Uuid::new_v4().to_string(),
        state,
        title: None,
        description: None,
        link_type: Some(LinkType::SendTip),
        asset_info: None,
        template: Some(cashier_types::Template::Central),
        creator: "test_creator".to_string(),
        create_at: 0,
        metadata: None,
    }
}

#[tokio::test]
async fn test_handle_link_state_transition_choose_link_type_to_add_assets() {
    let (ic_env, mut link_repository, link_action_repository, action_repository, icrc_service) =
        create_mock_components();

    // Create link with ChooseLinkType state
    let link = create_link_with_state(LinkState::ChooseLinkType);
    let link_id = link.id.clone();

    // Setup mock repository
    when!(link_repository.get(link_id.clone())).then_return(Some(link.clone()));

    when!(link_repository.update).then_return(());

    // Setup params for transition
    let params = Some(LinkDetailUpdateInput {
        title: Some("Test Link".to_string()),
        template: Some("Central".to_string()),
        description: None,
        link_image_url: None,
        nft_image: None,
        asset_info: None,
        link_type: None,
    });

    let link_service = LinkService::new(
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
        ic_env,
    );

    let result = link_service
        .handle_link_state_transition(&link_id, "Continue".to_string(), params)
        .await;

    assert!(result.is_ok());
    let updated_link = result.unwrap();
    assert_eq!(updated_link.state, LinkState::AddAssets);
    assert_eq!(updated_link.title, Some("Test Link".to_string()));
}

#[tokio::test]
async fn test_handle_link_state_transition_add_assets_to_create_link() {
    let (ic_env, mut link_repository, mut link_action_repository, action_repository, icrc_service) =
        create_mock_components();

    // Create link with AddAssets state
    let mut link = create_link_with_state(LinkState::AddAssets);
    link.title = Some("Test Link".to_string());
    let link_id = link.id.clone();

    // Setup mock repository
    when!(link_repository.get(link_id.clone())).then_return(Some(link.clone()));

    when!(link_repository.update).then_return(());

    when!(link_action_repository.get_by_prefix).then_return(vec![]);

    // Setup asset info params
    let asset_info = vec![LinkDetailUpdateAssetInfoInput {
        address: "aaaaa-aa".to_string(),
        chain: "IC".to_string(),
        total_amount: 100,
        amount_per_claim: 100, // Same as total for SendTip validation
        label: "test_label".to_string(),
    }];

    let params = Some(LinkDetailUpdateInput {
        title: None,
        template: None,
        description: None,
        link_image_url: None,
        nft_image: None,
        asset_info: Some(asset_info),
        link_type: None,
    });

    let link_service = LinkService::new(
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
        ic_env,
    );

    let result = link_service
        .handle_link_state_transition(&link_id, "Continue".to_string(), params)
        .await;

    assert!(result.is_ok());
    let updated_link = result.unwrap();
    assert_eq!(updated_link.state, LinkState::CreateLink);
    assert!(updated_link.asset_info.is_some());
}

#[tokio::test]
async fn test_handle_link_state_transition_add_assets_to_choose_link_type() {
    let (ic_env, mut link_repository, mut link_action_repository, action_repository, icrc_service) =
        create_mock_components();

    // Create link with AddAssets state
    let link = create_link_with_state(LinkState::AddAssets);
    let link_id = link.id.clone();

    // Setup mock repository
    when!(link_repository.get(link_id.clone())).then_return(Some(link.clone()));

    when!(link_repository.update).then_return(());

    when!(link_action_repository.get_by_prefix).then_return(vec![]);

    let params = Some(LinkDetailUpdateInput {
        title: None,
        template: None,
        description: None,
        link_image_url: None,
        nft_image: None,
        asset_info: Some(vec![LinkDetailUpdateAssetInfoInput {
            address: generate_token_address().to_string(),
            chain: "IC".to_string(),
            total_amount: 100,
            amount_per_claim: 100,
            label: "test_label".to_string(),
        }]),
        link_type: None,
    });

    let link_service = LinkService::new(
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
        ic_env,
    );

    let result = link_service
        .handle_link_state_transition(&link_id, "Back".to_string(), params)
        .await;

    assert!(result.is_ok());
    let updated_link = result.unwrap();
    assert_eq!(updated_link.state, LinkState::ChooseLinkType);
}

#[tokio::test]
async fn test_handle_link_state_transition_create_link_to_active() {
    let (
        ic_env,
        mut link_repository,
        mut link_action_repository,
        mut action_repository,
        icrc_service,
    ) = create_mock_components();

    // Create link with CreateLink state
    let mut link = create_link_with_state(LinkState::CreateLink);
    link.title = Some("Test Link".to_string());
    link.description = Some("Test Description".to_string());

    // Add asset info
    link.asset_info = Some(vec![cashier_types::AssetInfo {
        address: "aaaaa-aa".to_string(),
        chain: Chain::IC,
        total_amount: 100,
        amount_per_claim: Some(100),
        label: "test_label".to_string(),
        claim_count: None,
    }]);

    let link_id = link.id.clone();
    let action_id = Uuid::new_v4().to_string();

    // Setup mock repository
    when!(link_repository.get).then_return(Some(link.clone()));

    when!(link_repository.update).then_return(());

    // Setup mock action repository to return success action
    let link_action = cashier_types::LinkAction {
        link_id: link.id.clone(),
        action_type: ActionType::CreateLink.to_string(),
        user_id: link.creator.clone(),
        action_id: action_id.clone(),
        link_user_state: None,
    };

    when!(link_action_repository.get_by_prefix).then_return(vec![link_action]);

    let action = Action {
        id: action_id,
        link_id: link.id.clone(),
        r#type: ActionType::CreateLink,
        state: ActionState::Success,
        creator: link.creator.clone(),
    };

    when!(action_repository.get).then_return(Some(action));

    let params = Some(LinkDetailUpdateInput {
        title: None,
        template: None,
        description: None,
        link_image_url: None,
        nft_image: None,
        asset_info: None,
        link_type: None,
    });

    let link_service = LinkService::new(
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
        ic_env,
    );

    let result = link_service
        .handle_link_state_transition(&link_id, "Continue".to_string(), params)
        .await;

    assert!(result.is_ok());
    let updated_link = result.unwrap();
    assert_eq!(updated_link.state, LinkState::Active);
}

#[tokio::test]
async fn test_handle_link_state_transition_create_link_to_add_assets() {
    let (ic_env, mut link_repository, mut link_action_repository, action_repository, icrc_service) =
        create_mock_components();

    // Create link with CreateLink state
    let link = create_link_with_state(LinkState::CreateLink);
    let link_id = link.id.clone();

    // Setup mock repository
    when!(link_repository.get(link_id.clone())).then_return(Some(link.clone()));
    when!(link_repository.update).then_return(());

    when!(link_action_repository.get_by_prefix).then_return(vec![]);

    let params = Some(LinkDetailUpdateInput {
        title: None,
        template: None,
        description: None,
        link_image_url: None,
        nft_image: None,
        asset_info: None,
        link_type: None,
    });

    let link_service = LinkService::new(
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
        ic_env,
    );

    let result = link_service
        .handle_link_state_transition(&link_id, "Back".to_string(), params)
        .await;

    assert!(result.is_ok());
    let updated_link = result.unwrap();
    assert_eq!(updated_link.state, LinkState::AddAssets);
}

#[tokio::test]
async fn test_handle_link_state_transition_active_to_inactive() {
    let (ic_env, mut link_repository, link_action_repository, action_repository, icrc_service) =
        create_mock_components();

    // Create link with Active state
    let link = create_link_with_state(LinkState::Active);
    let link_id = link.id.clone();

    // Setup mock repository
    when!(link_repository.get(link_id.clone())).then_return(Some(link.clone()));

    when!(link_repository.update).then_return(());

    let params = Some(LinkDetailUpdateInput {
        title: None,
        template: None,
        description: None,
        link_image_url: None,
        nft_image: None,
        asset_info: None,
        link_type: None,
    });

    let link_service = LinkService::new(
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
        ic_env,
    );

    let result = link_service
        .handle_link_state_transition(&link_id, "Continue".to_string(), params)
        .await;

    assert!(result.is_ok());
    let updated_link = result.unwrap();
    assert_eq!(updated_link.state, LinkState::Inactive);
}

#[tokio::test]
async fn test_handle_link_state_transition_invalid_state() {
    let (ic_env, mut link_repository, link_action_repository, action_repository, icrc_service) =
        create_mock_components();

    // Create link with InactiveEnded state
    let link = create_link_with_state(LinkState::InactiveEnded);
    let link_id = link.id.clone();

    // Setup mock repository
    when!(link_repository.get(link_id.clone())).then_return(Some(link.clone()));

    let params = Some(LinkDetailUpdateInput {
        title: None,
        template: None,
        description: None,
        link_image_url: None,
        nft_image: None,
        asset_info: None,
        link_type: None,
    });

    let link_service = LinkService::new(
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
        ic_env,
    );

    let result = link_service
        .handle_link_state_transition(&link_id, "Continue".to_string(), params)
        .await;

    assert!(result.is_err());
    match result {
        Err(CanisterError::ValidationErrors(msg)) => {
            assert_eq!(msg, "Link is ended");
        }
        _ => panic!("Expected ValidationErrors"),
    }
}

#[tokio::test]
async fn test_handle_link_state_transition_link_not_found() {
    let (ic_env, mut link_repository, link_action_repository, action_repository, icrc_service) =
        create_mock_components();

    let link_id = "non_existent_id".to_string();

    when!(link_repository.get(link_id.clone())).then_return(None);

    // Setup mock repository to return None
    // when!(link_repository.get(link_id.clone())).then_return(Some(link.clone()));

    let params = Some(LinkDetailUpdateInput {
        title: None,
        template: None,
        description: None,
        link_image_url: None,
        nft_image: None,
        asset_info: None,
        link_type: None,
    });

    let link_service = LinkService::new(
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
        ic_env,
    );

    let result = link_service
        .handle_link_state_transition(&link_id, "xxx".to_string(), params)
        .await;

    assert!(result.is_err());
    match result {
        Err(CanisterError::NotFound(_)) => (),
        _ => panic!("Expected NotFound error"),
    }
}

#[tokio::test]
async fn test_handle_link_state_transition_invalid_action() {
    let (ic_env, mut link_repository, link_action_repository, action_repository, icrc_service) =
        create_mock_components();

    // Create link with ChooseLinkType state
    let link = create_link_with_state(LinkState::ChooseLinkType);
    let link_id = link.id.clone();

    // Setup mock repository
    when!(link_repository.get(link_id.clone())).then_return(Some(link.clone()));

    let params = Some(LinkDetailUpdateInput {
        title: None,
        template: None,
        description: None,
        link_image_url: None,
        nft_image: None,
        asset_info: None,
        link_type: None,
    });

    let link_service = LinkService::new(
        link_repository,
        link_action_repository,
        action_repository,
        icrc_service,
        ic_env,
    );

    let result = link_service
        .handle_link_state_transition(&link_id, "invalid_action".to_string(), params)
        .await;

    assert!(result.is_err());
    match result {
        Err(CanisterError::ValidationErrors(_)) => (),
        _ => panic!("Expected ValidationErrors"),
    }
}
