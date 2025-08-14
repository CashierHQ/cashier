// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    services::transaction_manager::service::TransactionManagerService,
    utils::test_utils::{random_id_string, random_principal_id, runtime::MockIcEnvironment},
};
use cashier_backend_types::repository::action::v1::{Action, ActionState, ActionType};

pub fn create_action_fixture(
    service: &TransactionManagerService<MockIcEnvironment>,
    link_id: String,
) -> Action {
    let action_id = random_id_string();
    let creator_id = random_principal_id();
    let action = Action {
        id: action_id,
        r#type: ActionType::CreateLink,
        state: ActionState::Created,
        creator: creator_id,
        link_id,
    };
    service.action_repository.create(action.clone());
    action
}