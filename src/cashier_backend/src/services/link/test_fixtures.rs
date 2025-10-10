// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    repositories::tests::TestRepositories,
    services::link::service::LinkService,
    utils::test_utils::{random_id_string, runtime::MockIcEnvironment},
};
use candid::Principal;
use cashier_backend_types::repository::{
    action::v1::{Action, ActionState, ActionType},
    link::v1::{Link, LinkState, LinkType},
    link_action::v1::LinkAction,
    user_link::v1::UserLink,
};

/// Creates a link fixture for testing purposes.
/// This function initializes a link with a random ID, sets its state, and associates it with a creator ID.
/// It also creates a user link for the creator.
/// Returns the created link.
pub fn create_link_fixture(
    service: &mut LinkService<MockIcEnvironment, TestRepositories>,
    creator_id: Principal,
) -> Link {
    let link_id = random_id_string();
    let link = Link {
        id: link_id,
        state: LinkState::CreateLink,
        title: "Test Link".to_string(),
        link_type: LinkType::SendTip,
        asset_info: vec![],
        creator: creator_id,
        create_at: 1622547800,
        link_use_action_counter: 0,
        link_use_action_max_count: 10,
    };
    service.link_repository.create(link.clone());

    let user_link = UserLink {
        user_id: creator_id,
        link_id: link.id.clone(),
    };
    service.user_link_repository.create(user_link);
    link
}

/// Creates a link action fixture for testing purposes.
/// This function initializes a link action with a random ID, associates it with a link ID and
/// an action type, and associates it with a user ID.
/// Returns the created link action.
pub fn create_link_action_fixture(
    service: &mut LinkService<MockIcEnvironment, TestRepositories>,
    link_id: &str,
    action_type: ActionType,
    user_id: Principal,
) -> LinkAction {
    let action_id = random_id_string();
    let link_action = LinkAction {
        link_id: link_id.to_string(),
        action_id,
        action_type: action_type.clone(),
        user_id,
        link_user_state: None,
    };
    service.link_action_repository.create(link_action.clone());

    let action = Action {
        id: link_action.action_id.clone(),
        r#type: action_type,
        state: ActionState::Created,
        creator: user_id,
        link_id: link_id.to_string(),
    };
    service.action_repository.create(action);
    link_action
}
