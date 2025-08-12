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
    use crate::utils::test_utils::runtime::MockIcEnvironment;
    use cashier_backend_types::repository::{link::v1::{LinkState, LinkType}, user_link::v1::UserLink, user_wallet::v1::UserWallet};
    use crate::utils::test_utils::random_id_string;

    const PRINCIPAL_ID1: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    const PRINCIPAL_ID2: &str = "x5qut-viaaa-aaaar-qajda-cai";

    fn create_link_feature(service: &LinkService<MockIcEnvironment>, creator_id: &str) -> Link {
        let link_id = random_id_string(10);
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

    fn create_principal_feature(service: &LinkService<MockIcEnvironment>, principal_id: &str) -> Principal {
        let principal = Principal::from_text(principal_id).unwrap();

        service.user_wallet_repository.create(principal_id.to_string(), UserWallet {
            user_id: principal_id.to_string(),
        });
        principal
    }

    fn create_link_action_feature(
        service: &LinkService<MockIcEnvironment>,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> LinkAction {
        let action_id = random_id_string(10);
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

    #[test]
    fn it_should_create_link_service_instance() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        assert!(service.link_repository.get(&"default_link".to_string()).is_none());
        let link_actions = service.link_action_repository.get_by_prefix("nonexistent", "type", "user");
        assert!(link_actions.is_empty());
        let actions = service.action_repository.get("nonexistent_action");
        assert!(actions.is_none());
        let user_wallet = service.user_wallet_repository.get("nonexistent_user");
        assert!(user_wallet.is_none());
        let user_links = service.user_link_repository.get_links_by_user_id("nonexistent_user", &PaginateInput::default());
        assert!(user_links.data.is_empty());
    }

    #[test]
    fn it_should_fail_on_get_link_by_nonexistent_id() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let result = service.get_link_by_id("nonexistent_link");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("link not found"));
    }

    #[test]
    fn it_should_get_link_by_id() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = service.link_repository.get(&"default_link".to_string());
        assert!(link.is_none());

        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let fetched_link = service.get_link_by_id(&created_link.id).unwrap();
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
    }

    #[test]
    fn it_should_get_link_with_empty_options() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let (fetched_link, _action) = service.get_link(&created_link.id, None, &creator).unwrap();
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
    }

    #[test]
    #[should_panic(expected = "Only creator can access this action type")]
    fn it_should_panic_on_get_link_with_action_type_create_by_unauthorized_caller() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let created_link = create_link_feature(&service, PRINCIPAL_ID1);
        let caller = create_principal_feature(&service, PRINCIPAL_ID2);
        let (fetched_link, _action) = service.get_link(&created_link.id, Some(GetLinkOptions { action_type: "CreateLink".to_string() }), &caller).unwrap();
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
    }

    #[test]
    fn it_should_get_link_with_action_type_create_by_creator() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let _link_action = create_link_action_feature(&service, &created_link.id, "CreateLink", &creator.to_text());
        let (fetched_link, action) = service.get_link(&created_link.id, Some(GetLinkOptions { action_type: "CreateLink".to_string() }), &creator).unwrap();
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
        assert!(action.is_some()); // Action should be returned for CreateLink type
        let action = action.unwrap();
        assert_eq!(action.r#type, ActionType::CreateLink);
    }

    #[test]
    #[should_panic(expected = "Only creator can access this action type")]
    fn it_should_panic_on_get_link_with_action_type_withdraw_by_unauthorized_caller() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let created_link = create_link_feature(&service, PRINCIPAL_ID1);
        let caller = create_principal_feature(&service, PRINCIPAL_ID2);
        let (fetched_link, _action) = service.get_link(&created_link.id, Some(GetLinkOptions { action_type: "Withdraw".to_string() }), &caller).unwrap();
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
    }

    #[test]
    fn it_should_fail_on_get_link_with_action_type_use_and_nonexistent_id() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let result = service.get_link("nonexistent_link", Some(GetLinkOptions { action_type: "Use".to_string() }), &creator);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("link not found"));
    }

    #[test]
    fn it_should_get_link_with_action_type_use_by_creator() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let (fetched_link, action) = service.get_link(&created_link.id, Some(GetLinkOptions { action_type: "Use".to_string() }), &creator).unwrap();
        assert_eq!(fetched_link.id, created_link.id);
        assert_eq!(fetched_link.title, created_link.title);
        assert_eq!(fetched_link.description, created_link.description);
        assert_eq!(fetched_link.link_type, created_link.link_type);
        assert!(action.is_none()); // No action returned for Use type
    }

    #[test]
    fn it_should_get_action_of_link_empty() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let action = service.get_action_of_link("nonexistent_link", "Use", "user_id");
        assert!(action.is_none());
    }

    #[test]
    fn it_should_get_action_of_link() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let link_action = create_link_action_feature(&service, &created_link.id, "Use", &creator.to_text());
        let action = service.get_action_of_link(&created_link.id, "Use", &creator.to_text());
        assert!(action.is_some());
        let action = action.unwrap();
        assert_eq!(action.id, link_action.action_id);
        assert_eq!(action.r#type, ActionType::Use);
    }

    #[test]
    fn it_should_get_link_action_user_empty() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let result = service.get_link_action_user("nonexistent_link", "Use", "user_id");
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn it_should_get_link_action_user() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let link_action = create_link_action_feature(&service, &created_link.id, "Use", &creator.to_text());
        let result = service.get_link_action_user(&created_link.id, "Use", &creator.to_text());
        assert!(result.is_ok());
        let action = result.unwrap();
        assert!(action.is_some());
        let action = action.unwrap();
        assert_eq!(action.action_id, link_action.action_id);
    }

    #[test]
    fn it_should_get_link_action_empty() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let action = service.get_link_action("nonexistent_link", "Use", "user_id");
        assert!(action.is_none());
    }

    #[test]
    fn it_should_get_link_action() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let link_action = create_link_action_feature(&service, &created_link.id, "Use", &creator.to_text());
        let action = service.get_link_action(&created_link.id, "Use", &creator.to_text());
        assert!(action.is_some());
        let action = action.unwrap();
        assert_eq!(action.id, link_action.action_id);
        assert_eq!(action.r#type, ActionType::Use);
    }

    #[test]
    fn it_should_fail_to_update_link_use_counter_if_exceed_max() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let link_action = create_link_action_feature(&service, &created_link.id, "Use", &creator.to_text());
        
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

        // Attempt to update link use counter with a non-successful action state
        let result = service.update_link_use_counter(&created_link.id, &link_action.action_id);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Link use action counter exceeded max count"));
    }

    #[test]
    fn it_should_fail_update_link_use_counter_if_action_state_nonsuccess() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let link_action = create_link_action_feature(&service, &created_link.id, "Use", &creator.to_text());
        
        let updated_action = Action {
            id: link_action.action_id.clone(),
            r#type: ActionType::Use,
            state: ActionState::Created, // Simulate a non-successful action
            creator: creator.to_text(),
            link_id: created_link.id.clone(),
        };
        service.action_repository.update(updated_action);

        // Attempt to update link use counter with a non-successful action state
        let result = service.update_link_use_counter(&created_link.id, &link_action.action_id);
        assert!(result.is_ok());
        assert!(!result.unwrap()); // Should return false since no update was made
    }

    #[test]
    fn it_should_update_link_use_counter_on_successful_action() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let link_action = create_link_action_feature(&service, &created_link.id, "Use", &creator.to_text());
        
        let updated_action = Action {
            id: link_action.action_id.clone(),
            r#type: ActionType::Use,
            state: ActionState::Success, // Simulate a successful action
            creator: creator.to_text(),
            link_id: created_link.id.clone(),
        };
        service.action_repository.update(updated_action);

        // Update link use counter
        let result = service.update_link_use_counter(&created_link.id, &link_action.action_id);
        assert!(result.is_ok());
        assert!(result.unwrap()); // Should return true since update was made

        // Verify the link was updated
        let updated_link = service.get_link_by_id(&created_link.id).unwrap();
        assert_eq!(updated_link.link_use_action_counter, 1);
    }

    #[test]
    fn it_should_get_links_by_principal() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal = create_principal_feature(&service, PRINCIPAL_ID1);
        let user_id = principal.to_text();
        
        // Create a link for the principal
        let created_link = create_link_feature(&service, &user_id);
        
        // Get links by principal
        let pagination = PaginateInput::default();
        let result = service.get_links_by_principal(&user_id, &pagination);
        assert!(result.is_ok());
        let links = result.unwrap();
        assert_eq!(links.data.len(), 1);
        assert_eq!(links.data[0].id, created_link.id);
    }

    #[test]
    fn it_should_get_links_by_user_id() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let principal = create_principal_feature(&service, PRINCIPAL_ID1);
        let user_id = principal.to_text();
        
        // Create a link for the user
        let created_link = create_link_feature(&service, &user_id);
        
        // Get links by user ID
        let pagination = PaginateInput::default();
        let result = service.get_links_by_user_id(&user_id, &pagination);
        assert!(result.is_ok());
        let links = result.unwrap();
        assert_eq!(links.data.len(), 1);
        assert_eq!(links.data[0].id, created_link.id);
    }

    #[test]
    fn it_should_handle_link_handle_tx_update_if_previous_and_current_state_are_the_same() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let action_type = ActionType::Use;
        let action_id = random_id_string(10);

        // Simulate a previous state that is the same as the current state
        let previous_state = ActionState::Created;
        let current_state = ActionState::Created;

        // Call the method and expect it to return Ok without any updates
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_handle_link_handle_tx_update_if_current_state_nonsuccess() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let action_type = ActionType::Use;
        let action_id = random_id_string(10);

        // Simulate a previous state that is different from the current state
        let previous_state = ActionState::Created;
        let current_state = ActionState::Fail; // Non-successful state

        // Call the method and expect it to return Ok without any updates
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_handle_link_handle_tx_update_if_action_type_is_not_use() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let action_type = ActionType::CreateLink; // Not Use action type
        let action_id = random_id_string(10);

        // Simulate a previous state that is different from the current state
        let previous_state = ActionState::Created;
        let current_state = ActionState::Success; // Successful state

        // Call the method and expect it to return Ok without any updates
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_fail_to_handle_link_handle_tx_update_due_to_counter_exceed_max() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let action_type = ActionType::Use;
        let action_id = random_id_string(10);

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

        // Simulate a previous state that is different from the current state
        let previous_state = ActionState::Created;
        let current_state = ActionState::Success; // Successful state

        // Call the method and expect it to return Ok without any updates
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );
        assert!(result.is_err());
    }

    #[test]
    fn it_should_handle_link_handle_tx_update_successful_action() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator = create_principal_feature(&service, PRINCIPAL_ID1);
        let created_link = create_link_feature(&service, &creator.to_text());
        let action_type = ActionType::Use;
        let action_id = random_id_string(10);

        let updated_action = Action {
            id: action_id.clone(),
            r#type: action_type.clone(),
            state: ActionState::Success, // Simulate a successful action
            creator: creator.to_text(),
            link_id: created_link.id.clone(),
        };
        service.action_repository.create(updated_action);

        // Simulate a previous state that is different from the current state
        let previous_state = ActionState::Created;
        let current_state = ActionState::Success; // Successful state

        // Call the method and expect it to return Ok with link properties updated
        let result = service.link_handle_tx_update(
            &previous_state,
            &current_state,
            &created_link.id,
            &action_type,
            &action_id,
        );
        assert!(result.is_ok());

        // Verify the link was updated
        let updated_link = service.get_link_by_id(&created_link.id).unwrap();
        assert_eq!(updated_link.link_use_action_counter, 1);
    }

}
