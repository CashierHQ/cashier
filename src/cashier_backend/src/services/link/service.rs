// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    dto::link::GetLinkOptions,
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        link::v1::Link,
        link_action::v1::LinkAction,
    },
    service::link::{PaginateInput, PaginateResult},
};
use log::error;
use std::str::FromStr;

use crate::services::link::traits::LinkValidation;
use crate::{
    repositories::{
        self, action::ActionRepository, link_action::LinkActionRepository,
        user_wallet::UserWalletRepository,
    },
    services::{
        action::ActionService, ext::icrc_batch::IcrcBatchService, request_lock::RequestLockService,
        transaction_manager::service::TransactionManagerService, user::v2::UserService,
    },
    utils::{icrc::IcrcService, runtime::IcEnvironment},
};

pub struct LinkService<E: IcEnvironment + Clone> {
    // LinkService fields go here
    pub link_repository: repositories::link::LinkRepository,
    pub link_action_repository: LinkActionRepository,
    pub action_repository: ActionRepository,
    pub action_service: ActionService,
    pub icrc_service: IcrcService,
    pub user_wallet_repository: UserWalletRepository,
    pub user_link_repository: repositories::user_link::UserLinkRepository,
    pub ic_env: E,
    pub request_lock_service: RequestLockService,
    pub user_service: UserService,
    pub icrc_batch_service: IcrcBatchService,
    pub tx_manager_service: TransactionManagerService<E>,
}

#[allow(clippy::too_many_arguments)]
impl<E: IcEnvironment + Clone> LinkService<E> {
    pub fn get_instance() -> Self {
        Self {
            link_repository: repositories::link::LinkRepository::new(),
            link_action_repository: LinkActionRepository::new(),
            action_repository: ActionRepository::new(),
            action_service: ActionService::get_instance(),
            icrc_service: IcrcService::new(),
            user_wallet_repository: UserWalletRepository::new(),
            user_link_repository: repositories::user_link::UserLinkRepository::new(),
            ic_env: E::new(),
            request_lock_service: RequestLockService::get_instance(),
            user_service: UserService::get_instance(),
            icrc_batch_service: IcrcBatchService::get_instance(),
            tx_manager_service: TransactionManagerService::get_instance(),
        }
    }

    pub fn get_link_by_id(&self, id: &str) -> Result<Link, CanisterError> {
        let link = self
            .link_repository
            .get(&id.to_string())
            .ok_or_else(|| CanisterError::NotFound("link not found".to_string()))?;

        Ok(link)
    }

    /// Retrieves a specific link by ID with optional action data based on permissions.
    ///
    /// This method handles complex access control logic:
    /// - Anonymous users can view links but with limited action access
    /// - Authenticated users can access their own actions
    /// - Link creators have full access to all action types
    /// - Non-creators can only access "Use" actions (claims)
    pub fn get_link(
        &self,
        id: &str,
        options: Option<GetLinkOptions>,
        caller: &Principal,
    ) -> Result<(Link, Option<Action>), String> {
        let user_id = self.user_service.get_user_id_by_wallet(caller);

        // Allow both anonymous callers and non-anonymous callers without user IDs to proceed

        let is_valid_creator = if *caller != Principal::anonymous() {
            self.is_link_creator(&caller.to_text(), id)
        } else {
            false // Anonymous callers can't be creators
        };

        // Extract action_type from options
        let action_type = match options {
            Some(options) => ActionType::from_str(&options.action_type)
                .map_err(|_| "Invalid action type".to_string())
                .map(Some)?,
            None => None,
        };

        // Handle different action types based on permissions
        let action_type = match action_type {
            // For CreateLink or Withdraw, require creator permission
            Some(ActionType::CreateLink) | Some(ActionType::Withdraw) => {
                if !is_valid_creator {
                    return Err("Only creator can access this action type".to_string());
                }
                action_type
            }
            // For Claim, don't return the action (handled separately)
            Some(ActionType::Use) => None,
            // For other types, pass through
            _ => action_type,
        };

        // Get link and action data
        let link = match self.get_link_by_id(id) {
            Ok(link) => link,
            Err(e) => return Err(e.to_string()),
        };

        // Get action data (only if user_id exists)
        let action = match (action_type, &user_id) {
            (Some(action_type), Some(user_id)) => {
                self.get_link_action(id, action_type.to_str(), user_id)
            }
            _ => None,
        };

        Ok((link, action))
    }

    pub fn get_action_of_link(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> Option<Action> {
        let link_actions = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, user_id);

        link_actions
            .first()
            .and_then(|la| self.action_repository.get(&la.action_id))
    }

    pub fn get_link_action_user(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> Result<Option<LinkAction>, CanisterError> {
        let link_action = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, user_id);
        if link_action.is_empty() {
            return Ok(None);
        }

        Ok(link_action.first().cloned())
    }

    pub fn get_link_action(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> Option<Action> {
        let link_actions = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, user_id);

        link_actions
            .first()
            .map(|link_action| link_action.action_id.clone())
            .and_then(|action_id| self.action_repository.get(&action_id))
    }

    /// Updates link properties after an action completes
    /// Returns true if link properties were updated, false otherwise
    pub fn update_link_use_counter(
        &self,
        link_id: &str,
        action_id: &str,
    ) -> Result<bool, CanisterError> {
        // Get the link and action
        let link = self.get_link_by_id(link_id)?;
        let action = match self.action_repository.get(action_id) {
            Some(action) => action,
            None => return Ok(false),
        };

        // Early return if not a successful claim on a TipLink
        if action.state != ActionState::Success {
            return Ok(false);
        }

        // At this point we know we have a successful claim on a TipLink
        // Update link's properties here
        let mut updated_link = link;
        let mut is_update: bool = false;

        if action.r#type == ActionType::Use {
            // Update asset info to track the claim
            if updated_link.link_use_action_counter + 1 > updated_link.link_use_action_max_count {
                return Err(CanisterError::HandleLogicError(
                    "Link use action counter exceeded max count".to_string(),
                ));
            }
            updated_link.link_use_action_counter += 1;
            is_update = true;
        }

        // Save the updated link
        if !is_update {
            return Ok(false);
        }

        self.link_repository.update(updated_link);

        // Return true to indicate that we updated the link
        Ok(true)
    }

    /// Get links by principal
    pub fn get_links_by_principal(
        &self,
        principal: &str,
        pagination: &PaginateInput,
    ) -> Result<PaginateResult<Link>, String> {
        let user_wallet = self
            .user_wallet_repository
            .get(principal)
            .ok_or_else(|| "User not found".to_string())?;

        let user_id = user_wallet.user_id;

        let links = self.get_links_by_user_id(&user_id, pagination)?;

        Ok(links)
    }

    /// Get links by user ID
    pub fn get_links_by_user_id(
        &self,
        user_id: &str,
        pagination: &PaginateInput,
    ) -> Result<PaginateResult<Link>, String> {
        let user_links = self
            .user_link_repository
            .get_links_by_user_id(user_id, pagination);

        let link_ids = user_links
            .data
            .iter()
            .map(|link_user| link_user.link_id.clone())
            .collect();

        let links = self.link_repository.get_batch(link_ids);

        let res = PaginateResult::new(links, user_links.metadata);
        Ok(res)
    }

    pub fn link_handle_tx_update(
        &self,
        previous_state: &ActionState,
        current_state: &ActionState,
        link_id: &str,
        action_type: &ActionType,
        action_id: &str,
    ) -> Result<(), CanisterError> {
        // Return early if state hasn't changed
        if previous_state == current_state {
            return Ok(());
        }

        // Return early if this isn't a claim/use action or if it's not a successful state
        if (action_type != &ActionType::Use) || current_state != &ActionState::Success {
            return Ok(());
        }

        // At this point we know:
        // 1. The state has changed
        // 2. The action type is either Claim or Use
        // 3. The current state is Success

        // Update link properties
        let result = self.update_link_use_counter(link_id, action_id);
        if let Err(err) = result {
            error!(
                "[link_handle_tx_update] Failed to update link properties for link_id: {:?}, action_id: {:?}, error: {:?}",
                link_id, action_id, err
            );

            return Err(CanisterError::HandleLogicError(format!(
                "Failed to update link properties: {err}"
            )));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::link::test_fixtures::*;
    use crate::utils::test_utils::{random_id_string, random_principal_id, runtime::MockIcEnvironment};

    #[test]
    fn it_should_fail_on_get_link_by_nonexistent_id() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();

        // Act
        let result = service.get_link_by_id("nonexistent_link");
        
        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("link not found"));
    }

    #[test]
    fn it_should_get_link_by_id() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();

        // Act
        let link = service.link_repository.get(&"default_link".to_string());
        
        // Assert
        assert!(link.is_none());

        // Arrange
        let principal_id = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id);
        let created_link = create_link_fixture(&service, &creator.to_text());

        // Act
        let fetched_link = service.get_link_by_id(&created_link.id).unwrap();

        // Assert
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
    }

    #[test]
    fn it_should_get_link_with_empty_options() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id);
        let created_link = create_link_fixture(&service, &creator.to_text());

        // Act
        let (fetched_link, _action) = service.get_link(&created_link.id, None, &creator).unwrap();
        
        // Assert
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
    }

    #[test]
    fn it_should_error_on_get_link_with_action_type_create_by_unauthorized_caller() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let principal_id2 = random_principal_id();
        let created_link = create_link_fixture(&service, &principal_id1);
        let caller = create_principal_fixture(&service, &principal_id2);

        // Act
        let result = service.get_link(
            &created_link.id,
            Some(GetLinkOptions {
                action_type: "CreateLink".to_string(),
            }),
            &caller,
        );

        // Assert
        assert!(result.is_err());

        if let Err(err) = result {
            assert!(err.contains("Only creator can access this action type"));
        } else {
            panic!("Expected an error but got Ok");
        }
    }

    #[test]
    fn it_should_get_link_with_action_type_create_by_creator() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let _link_action = create_link_action_fixture(
            &service,
            &created_link.id,
            "CreateLink",
            &creator.to_text(),
        );

        // Act
        let (fetched_link, action) = service
            .get_link(
                &created_link.id,
                Some(GetLinkOptions {
                    action_type: "CreateLink".to_string(),
                }),
                &creator,
            )
            .unwrap();

        // Assert
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
        assert!(action.is_some()); // Action should be returned for CreateLink type
        let action = action.unwrap();
        assert_eq!(action.r#type, ActionType::CreateLink);
    }

    #[test]
    fn it_should_error_on_get_link_with_action_type_withdraw_by_unauthorized_caller() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let principal_id2 = random_principal_id();
        let created_link = create_link_fixture(&service, &principal_id1);
        let caller = create_principal_fixture(&service, &principal_id2);

        // Act
        let result = service.get_link(
            &created_link.id,
            Some(GetLinkOptions {
                action_type: "Withdraw".to_string(),
            }),
            &caller,
        );

        // Assert
        assert!(result.is_err());

        if let Err(err) = result {
            assert!(err.contains("Only creator can access this action type"));
        } else {
            panic!("Expected an error but got Ok");
        }
    }

    #[test]
    fn it_should_error_on_get_link_with_action_type_use_by_anonymous_caller() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let created_link = create_link_fixture(&service, &principal_id1);

        // Act
        let result = service.get_link(
            &created_link.id,
            Some(GetLinkOptions {
                action_type: "CreateLink".to_string(),
            }),
            &Principal::anonymous(),
        );

        // Assert
        assert!(result.is_err());

        if let Err(err) = result {
            assert!(err.contains("Only creator can access this action type"));
        } else {
            panic!("Expected an error but got Ok");
        }
    }

    #[test]
    fn it_should_fail_on_get_link_with_action_type_use_and_nonexistent_id() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);

        // Act
        let result = service.get_link(
            "nonexistent_link",
            Some(GetLinkOptions {
                action_type: "Use".to_string(),
            }),
            &creator,
        );

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("link not found"));
    }

    #[test]
    fn it_should_get_link_with_action_type_use_by_creator() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());

        // Act
        let (fetched_link, action) = service
            .get_link(
                &created_link.id,
                Some(GetLinkOptions {
                    action_type: "Use".to_string(),
                }),
                &creator,
            )
            .unwrap();

        // Assert
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
        assert!(action.is_none()); // No action returned for Use type
    }

    #[test]
    fn it_should_get_action_of_link_empty() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();

        // Act
        let action = service.get_action_of_link("nonexistent_link", "Use", "user_id");
        
        // Assert
        assert!(action.is_none());
    }

    #[test]
    fn it_should_get_action_of_link() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let link_action =
            create_link_action_fixture(&service, &created_link.id, "Use", &creator.to_text());

        // Act 
        let action = service.get_action_of_link(&created_link.id, "Use", &creator.to_text());

        // Assert
        assert!(action.is_some());
        let action = action.unwrap();
        assert_eq!(action.id, link_action.action_id);
        assert_eq!(action.r#type, ActionType::Use);
    }

    #[test]
    fn it_should_get_link_action_user_empty() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();

        // Act
        let result = service.get_link_action_user("nonexistent_link", "Use", "user_id");
        
        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn it_should_get_link_action_user() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let link_action =
            create_link_action_fixture(&service, &created_link.id, "Use", &creator.to_text());

        // Act
        let result = service.get_link_action_user(&created_link.id, "Use", &creator.to_text());
        
        // Assert
        assert!(result.is_ok());
        let action = result.unwrap();
        assert!(action.is_some());
        let action = action.unwrap();
        assert_eq!(action.action_id, link_action.action_id);
    }

    #[test]
    fn it_should_get_link_action_empty() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();

        // Act
        let action = service.get_link_action("nonexistent_link", "Use", "user_id");

        // Assert
        assert!(action.is_none());
    }

    #[test]
    fn it_should_get_link_action() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let link_action =
            create_link_action_fixture(&service, &created_link.id, "Use", &creator.to_text());
        
        // Act
        let action = service.get_link_action(&created_link.id, "Use", &creator.to_text());
        
        // Assert
        assert!(action.is_some());
        let action = action.unwrap();
        assert_eq!(action.id, link_action.action_id);
        assert_eq!(action.r#type, ActionType::Use);
    }

    #[test]
    fn it_should_fail_to_update_link_use_counter_if_exceed_max() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let link_action =
            create_link_action_fixture(&service, &created_link.id, "Use", &creator.to_text());

        let updated_action = Action {
            id: link_action.action_id.clone(),
            r#type: ActionType::Use,
            state: ActionState::Success, // Simulate a successful action
            creator: creator.to_text(),
            link_id: created_link.id.clone(),
        };
        service.action_repository.update(updated_action);

        let updated_link = Link {
            id: created_link.id.clone(),
            state: created_link.state,
            title: created_link.title.clone(),
            description: created_link.description.clone(),
            link_type: created_link.link_type,
            asset_info: created_link.asset_info.clone(),
            template: created_link.template.clone(),
            creator: created_link.creator.clone(),
            create_at: created_link.create_at,
            metadata: created_link.metadata.clone(),
            link_use_action_counter: 10, // Set to max count
            link_use_action_max_count: 10,
        };
        service.link_repository.update(updated_link);

        // Act
        let result = service.update_link_use_counter(&created_link.id, &link_action.action_id);
        
        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("Link use action counter exceeded max count")
        );
    }

    #[test]
    fn it_should_fail_update_link_use_counter_if_action_state_nonsuccess() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let link_action =
            create_link_action_fixture(&service, &created_link.id, "Use", &creator.to_text());

        let updated_action = Action {
            id: link_action.action_id.clone(),
            r#type: ActionType::Use,
            state: ActionState::Created, // Simulate a non-successful action
            creator: creator.to_text(),
            link_id: created_link.id.clone(),
        };
        service.action_repository.update(updated_action);

        // Act
        let result = service.update_link_use_counter(&created_link.id, &link_action.action_id);
        
        // Assert
        assert!(result.is_ok());
        assert!(!result.unwrap()); // Should return false since no update was made
    }

    #[test]
    fn it_should_update_link_use_counter_on_successful_action() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let link_action =
            create_link_action_fixture(&service, &created_link.id, "Use", &creator.to_text());

        let updated_action = Action {
            id: link_action.action_id.clone(),
            r#type: ActionType::Use,
            state: ActionState::Success, // Simulate a successful action
            creator: creator.to_text(),
            link_id: created_link.id.clone(),
        };
        service.action_repository.update(updated_action);

        // Act
        let result = service.update_link_use_counter(&created_link.id, &link_action.action_id);
        
        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap()); // Should return true since update was made

        let updated_link = service.get_link_by_id(&created_link.id).unwrap();
        assert_eq!(updated_link.link_use_action_counter, 1);
    }

    #[test]
    fn it_should_get_links_by_principal() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let principal = create_principal_fixture(&service, &principal_id1);
        let user_id = principal.to_text();
        let created_link = create_link_fixture(&service, &user_id);
        let pagination = PaginateInput::default();

        // Act
        let result = service.get_links_by_principal(&user_id, &pagination);

        // Assert
        assert!(result.is_ok());
        let links = result.unwrap();
        assert_eq!(links.data.len(), 1);
        assert_eq!(links.data[0].id, created_link.id);
    }

    #[test]
    fn it_should_get_links_by_user_id() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let principal = create_principal_fixture(&service, &principal_id1);
        let user_id = principal.to_text();
        let created_link = create_link_fixture(&service, &user_id);
        let pagination = PaginateInput::default();

        // Act
        let result = service.get_links_by_user_id(&user_id, &pagination);
        
        // Assert
        assert!(result.is_ok());
        let links = result.unwrap();
        assert_eq!(links.data.len(), 1);
        assert_eq!(links.data[0].id, created_link.id);
    }

    #[test]
    fn it_should_handle_link_handle_tx_update_if_previous_and_current_state_are_the_same() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let action_type = ActionType::Use;
        let action_id = random_id_string();
        let previous_state = ActionState::Created;
        let current_state = ActionState::Created;

        // Act
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_handle_link_handle_tx_update_if_current_state_nonsuccess() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let action_type = ActionType::Use;
        let action_id = random_id_string();
        let previous_state = ActionState::Created;
        let current_state = ActionState::Fail;

        // Act
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_handle_link_handle_tx_update_if_action_type_is_not_use() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let action_type = ActionType::CreateLink; // Not Use action type
        let action_id = random_id_string();
        let previous_state = ActionState::Created;
        let current_state = ActionState::Success; // Successful state

        // Act
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_fail_to_handle_link_handle_tx_update_due_to_counter_exceed_max() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let action_type = ActionType::Use;
        let action_id = random_id_string();

        let updated_action = Action {
            id: action_id.clone(),
            r#type: action_type.clone(),
            state: ActionState::Success, // Simulate a successful action
            creator: creator.to_text(),
            link_id: created_link.id.clone(),
        };
        service.action_repository.create(updated_action);

        let updated_link = Link {
            id: created_link.id.clone(),
            state: created_link.state,
            title: created_link.title.clone(),
            description: created_link.description.clone(),
            link_type: created_link.link_type,
            asset_info: created_link.asset_info.clone(),
            template: created_link.template.clone(),
            creator: created_link.creator.clone(),
            create_at: created_link.create_at,
            metadata: created_link.metadata.clone(),
            link_use_action_counter: 10, // Set to max count
            link_use_action_max_count: 10,
        };
        service.link_repository.update(updated_link);

        let previous_state = ActionState::Created;
        let current_state = ActionState::Success; // Successful state

        // Act
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );

        // Assert
        assert!(result.is_err());
    }

    #[test]
    fn it_should_handle_link_handle_tx_update_successful_action() {
        // Arrange
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal_id1 = random_principal_id();
        let creator = create_principal_fixture(&service, &principal_id1);
        let created_link = create_link_fixture(&service, &creator.to_text());
        let action_type = ActionType::Use;
        let action_id = random_id_string();

        let updated_action = Action {
            id: action_id.clone(),
            r#type: action_type.clone(),
            state: ActionState::Success, // Simulate a successful action
            creator: creator.to_text(),
            link_id: created_link.id.clone(),
        };
        service.action_repository.create(updated_action);
        let previous_state = ActionState::Created;
        let current_state = ActionState::Success; // Successful state

        // Act
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );

        // Assert
        assert!(result.is_ok());
        let updated_link = service.get_link_by_id(&created_link.id).unwrap();
        assert_eq!(updated_link.link_use_action_counter, 1);
    }
}
