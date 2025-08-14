// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    services::link::service::LinkService,
    utils::test_utils::{random_id_string, runtime::MockIcEnvironment},
};
use candid::Principal;
use cashier_backend_types::repository::{
    action::v1::{Action, ActionState, ActionType},
    link::v1::{Link, LinkState, LinkType},
    link_action::v1::LinkAction,
    user_link::v1::UserLink,
    user_wallet::v1::UserWallet,
};
use std::str::FromStr;

/// Creates a link fixture for testing purposes.
/// This function initializes a link with a random ID, sets its state, and associates it with a creator ID.
/// It also creates a user link for the creator.
/// Returns the created link.
/// 
pub fn create_link_fixture(service: &LinkService<MockIcEnvironment>, creator_id: &str) -> Link {
    let link_id = random_id_string();
    let link = Link {
        id: link_id,
        state: LinkState::ChooseLinkType,
        title: Some("Test Link".to_string()),
        description: Some("This is a test link".to_string()),
        link_type: Some(LinkType::SendTip),
        asset_info: None,
        template: None,
        creator: creator_id.to_string(),
        create_at: 1622547800,
        metadata: None,
        link_use_action_counter: 0,
        link_use_action_max_count: 10,
    };
    service.link_repository.create(link.clone());

    let user_link = UserLink {
        user_id: creator_id.to_string(),
        link_id: link.id.clone(),
    };
    service.user_link_repository.create(user_link);
    link
}

pub fn create_principal_fixture(
    service: &LinkService<MockIcEnvironment>,
    principal_id: &str,
) -> Principal {
    let principal = Principal::from_text(principal_id).unwrap();

    service.user_wallet_repository.create(
        principal_id.to_string(),
        UserWallet {
            user_id: principal_id.to_string(),
        },
    );
    principal
}

pub fn create_link_action_fixture(
    service: &LinkService<MockIcEnvironment>,
    link_id: &str,
    action_type: &str,
    user_id: &str,
) -> LinkAction {
    let action_id = random_id_string();
    let link_action = LinkAction {
        link_id: link_id.to_string(),
        action_id,
        action_type: action_type.to_string(),
        user_id: user_id.to_string(),
        link_user_state: None,
    };
    service.link_action_repository.create(link_action.clone());

    let action = Action {
        id: link_action.action_id.clone(),
        r#type: ActionType::from_str(action_type).unwrap(),
        state: ActionState::Created,
        creator: user_id.to_string(),
        link_id: link_id.to_string(),
    };
    service.action_repository.create(action);
    link_action
}

pub fn create_user_wallet_fixture(
    service: &LinkService<MockIcEnvironment>,
    wallet_key: &str,
    user_id: &str,
) -> UserWallet {
    let user_wallet = UserWallet {
        user_id: user_id.to_string(),
    };
    service
        .user_wallet_repository
        .create(wallet_key.to_string(), user_wallet.clone());
    user_wallet
}
