use candid::Principal;
use icrc_ledger_types::icrc1::account::Account;

use crate::services::link::service::LinkService;
use crate::services::link::traits::LinkValidation;
use crate::utils::helper::to_subaccount;
use crate::utils::runtime::IcEnvironment;

use cashier_backend_types::{
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        asset_info::AssetInfo,
        link::v1::{Link, LinkState, LinkType},
    },
};

impl<E: IcEnvironment + Clone> LinkValidation for LinkService<E> {
    // This method is a synchronous version that performs basic validation without async checks
    fn link_validate_user_create_action(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_id: &str,
    ) -> Result<(), CanisterError> {
        // Get link
        let link = self.get_link_by_id(link_id)?;

        match action_type {
            ActionType::CreateLink => {
                // Validate user ID == link creator
                if link.creator == user_id {
                    // Basic validation passes, async balance validation would happen separately
                    Ok(())
                } else {
                    Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ))
                }
            }
            ActionType::Withdraw => {
                // Validate user ID == link creator
                if link.creator == user_id {
                    // Synchronous validation passes
                    Ok(())
                } else {
                    Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ))
                }
            }
            ActionType::Use => {
                // Validate link state
                if link.state != LinkState::Active {
                    return Err(CanisterError::ValidationErrors(
                        "Link is not active".to_string(),
                    ));
                }

                // For send-type links, check usage counter against max allowed
                if let Some(_link_type) = &link.link_type
                    && link.link_use_action_counter >= link.link_use_action_max_count
                {
                    return Err(CanisterError::ValidationErrors(format!(
                        "Link maximum usage count reached: {}",
                        link.link_use_action_max_count
                    )));
                }

                // Synchronous validation passes
                Ok(())
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type".to_string(),
            )),
        }
    }

    // Helper method to validate action update permissions
    fn link_validate_user_update_action(
        &self,
        action: &Action,
        user_id: &str,
    ) -> Result<(), CanisterError> {
        //validate user_id
        match action.r#type.clone() {
            ActionType::CreateLink => {
                let link = self.get_link_by_id(&action.link_id)?;
                if !(action.creator == user_id && link.creator == user_id) {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }
            }
            ActionType::Withdraw => {
                let link = self.get_link_by_id(&action.link_id)?;
                if !(action.creator == user_id && link.creator == user_id) {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }
            }

            ActionType::Use => {
                if action.creator != user_id {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }

                if action.state == ActionState::Success {
                    return Err(CanisterError::ValidationErrors(
                        "Action is already success".to_string(),
                    ));
                }
            }
            _ => {
                return Err(CanisterError::ValidationErrors(
                    "Unsupported action type".to_string(),
                ));
            }
        }

        Ok(())
    }

    /// Check if caller is the creator of a link
    fn is_link_creator(&self, caller: &str, link_id: &str) -> bool {
        let user_wallet = match self.user_wallet_repository.get(caller) {
            Some(u) => u,
            None => {
                return false;
            }
        };

        match self.link_repository.get(&link_id.to_string()) {
            None => false,
            Some(link_detail) => link_detail.creator == user_wallet.user_id,
        }
    }

    // if the link and asset info meet the requirement return true
    // else return false
    fn validate_add_asset_with_link_type(&self, link: &Link, asset_infos: &[AssetInfo]) -> bool {
        if link.link_type == Some(LinkType::SendTip) {
            // Send tip only use one time with one asset
            // check amount_per_link_use_action for asset > 0
            // check link_use_action_max_count == 1

            if asset_infos.is_empty() {
                return false;
            }

            if asset_infos.len() > 1 {
                // Send tip can only have one asset
                return false;
            }

            let Some(amount_per_link_use_action) =
                asset_infos.first().map(|a| a.amount_per_link_use_action)
            else {
                return false;
            };

            if amount_per_link_use_action == 0 {
                return false;
            }

            true
        } else if link.link_type == Some(LinkType::SendAirdrop) {
            // Send airdrop use multiple time with one asset
            // check amount_per_link_use_action for asset > 0
            // check link_use_action_max_count >= 1

            if asset_infos.is_empty() {
                return false;
            }

            if asset_infos.len() > 1 {
                // Airdrop can only have one asset
                return false;
            }

            let Some(amount_per_link_use_action) =
                asset_infos.first().map(|a| a.amount_per_link_use_action)
            else {
                return false;
            };

            if amount_per_link_use_action == 0 {
                return false;
            }

            true
        } else if link.link_type == Some(LinkType::SendTokenBasket) {
            // Send token basket use one time with multiple asset
            // check amount_per_link_use_action for asset > 0
            // check link_use_action_max_count == 1

            if asset_infos.is_empty() {
                return false;
            }

            // Token basket can have multiple assets
            for asset in asset_infos.iter() {
                if asset.amount_per_link_use_action == 0 {
                    return false;
                }
            }
            true
        } else if link.link_type == Some(LinkType::ReceivePayment) {
            // Receive payment use one time with one asset
            // check amount_per_link_use_action for asset > 0
            // check link_use_action_max_count == 1
            if asset_infos.is_empty() {
                return false;
            }

            if asset_infos.len() > 1 {
                // Receive payment can only have one asset
                return false;
            }

            let Some(amount_per_link_use_action) =
                asset_infos.first().map(|a| a.amount_per_link_use_action)
            else {
                return false;
            };

            if amount_per_link_use_action == 1 {
                return false;
            }

            true
        } else {
            // link type is not supported
            false
        }
    }

    // this method use for withdraw
    // return true if any balance > 0 or gas fee
    // return false if all balance == 0
    async fn check_link_asset_left(&self, link: &Link) -> Result<bool, CanisterError> {
        let asset_info = link
            .asset_info
            .clone()
            .ok_or_else(|| CanisterError::HandleLogicError("Asset info not found".to_string()))?;

        if asset_info.is_empty() {
            return Err(CanisterError::HandleLogicError(
                "Asset info not found".to_string(),
            ));
        }

        for asset in asset_info.iter() {
            let token_pid = Principal::from_text(asset.address.as_str()).map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Error converting token address to principal: {e:?}"
                ))
            })?;

            let account = Account {
                owner: self.ic_env.id(),
                subaccount: Some(to_subaccount(&link.id)?),
            };

            let balance = self.icrc_service.balance_of(token_pid, account).await?;

            if balance > 0u64 {
                return Ok(true);
            }
        }

        Ok(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        services::link::test_fixtures::create_link_feature,
        utils::test_utils::{random_id_string, random_principal_id, runtime::MockIcEnvironment},
    };
    use cashier_backend_types::repository::{common::Chain, user_wallet::v1::UserWallet};

    #[test]
    fn it_should_error_link_validate_user_create_action_if_link_not_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link_id = random_id_string();
        let action_type = ActionType::CreateLink;
        let user_id = random_principal_id();

        let result = service.link_validate_user_create_action(&link_id, &action_type, &user_id);
        assert!(result.is_err());

        if let CanisterError::NotFound(msg) = result.err().unwrap() {
            assert_eq!(msg, "link not found".to_string());
        } else {
            panic!("Expected NotFound");
        }
    }

    #[test]
    fn it_should_error_link_validate_user_create_action_if_user_is_not_creator() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action_type = ActionType::CreateLink;
        let user_id = random_principal_id();

        let result = service.link_validate_user_create_action(&link.id, &action_type, &user_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "User is not the creator of the link".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_validate_user_create_action_if_user_is_creator() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action_type = ActionType::CreateLink;

        let result = service.link_validate_user_create_action(&link.id, &action_type, &creator_id);
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_error_link_validate_user_create_action_if_action_withdraw_and_user_is_not_creator()
    {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action_type = ActionType::Withdraw;
        let user_id = random_principal_id();

        let result = service.link_validate_user_create_action(&link.id, &action_type, &user_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "User is not the creator of the link".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_validate_user_create_action_if_action_withdraw_and_user_is_creator() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action_type = ActionType::Withdraw;

        let result = service.link_validate_user_create_action(&link.id, &action_type, &creator_id);
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_error_link_validate_user_create_action_if_action_use_and_link_is_not_active() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let mut link = create_link_feature(&service, &creator_id);
        link.state = LinkState::Inactive; // Set link to inactive
        service.link_repository.update(link.clone());
        let action_type = ActionType::Use;
        let user_id = random_principal_id();

        let result = service.link_validate_user_create_action(&link.id, &action_type, &user_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "Link is not active".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_error_link_validate_user_create_action_if_action_use_counter_exceed_max() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let mut link = create_link_feature(&service, &creator_id);
        link.link_use_action_counter = 10; // Set counter to max
        link.link_use_action_max_count = 10; // Set max count
        link.state = LinkState::Active; // Ensure link is active
        service.link_repository.update(link.clone());
        let action_type = ActionType::Use;
        let user_id = random_principal_id();

        let result = service.link_validate_user_create_action(&link.id, &action_type, &user_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "Link maximum usage count reached: 10".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_validate_user_create_action_if_action_use_and_link_is_active() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let mut link = create_link_feature(&service, &creator_id);
        link.state = LinkState::Active; // Ensure link is active
        service.link_repository.update(link.clone());
        let action_type = ActionType::Use;

        let result = service.link_validate_user_create_action(&link.id, &action_type, &creator_id);
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_error_link_validate_user_create_action_if_action_type_not_supported() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let mut link = create_link_feature(&service, &creator_id);
        link.state = LinkState::Active; // Ensure link is active
        service.link_repository.update(link.clone());
        let action_type = ActionType::Claim;

        let result = service.link_validate_user_create_action(&link.id, &action_type, &creator_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "Unsupported action type".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_error_link_validate_user_update_action_if_action_type_create_and_link_not_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: random_principal_id(),
            link_id: random_id_string(),
        };
        let user_id = random_principal_id();

        let result = service.link_validate_user_update_action(&action, &user_id);
        assert!(result.is_err());

        if let CanisterError::NotFound(msg) = result.err().unwrap() {
            assert_eq!(msg, "link not found".to_string());
        } else {
            panic!("Expected NotFound");
        }
    }

    #[test]
    fn it_should_error_link_validate_user_update_action_if_action_type_create_and_user_is_not_creator()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: random_principal_id(),
            link_id: link.id.clone(),
        };
        let user_id = random_principal_id();

        let result = service.link_validate_user_update_action(&action, &user_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "User is not the creator of the action".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_validate_user_update_action_if_action_type_create_and_user_is_creator() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::CreateLink,
            state: ActionState::Created,
            creator: creator_id.clone(),
            link_id: link.id.clone(),
        };

        let result = service.link_validate_user_update_action(&action, &creator_id);
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_error_link_validate_user_update_action_if_action_type_withdraw_and_link_not_found()
    {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::Withdraw,
            state: ActionState::Created,
            creator: random_principal_id(),
            link_id: random_id_string(),
        };
        let user_id = random_principal_id();

        let result = service.link_validate_user_update_action(&action, &user_id);
        assert!(result.is_err());

        if let CanisterError::NotFound(msg) = result.err().unwrap() {
            assert_eq!(msg, "link not found".to_string());
        } else {
            panic!("Expected NotFound");
        }
    }

    #[test]
    fn it_should_error_link_validate_user_update_action_if_action_type_withdraw_and_user_is_not_creator()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::Withdraw,
            state: ActionState::Created,
            creator: random_principal_id(),
            link_id: link.id.clone(),
        };
        let user_id = random_principal_id();

        let result = service.link_validate_user_update_action(&action, &user_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "User is not the creator of the action".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_validate_user_update_action_if_action_type_withdraw_and_user_is_creator() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::Withdraw,
            state: ActionState::Created,
            creator: creator_id.clone(),
            link_id: link.id.clone(),
        };

        let result = service.link_validate_user_update_action(&action, &creator_id);
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_error_link_validate_user_update_action_if_action_type_use_and_user_is_not_creator()
    {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::Use,
            state: ActionState::Created,
            creator: random_principal_id(),
            link_id: link.id.clone(),
        };
        let user_id = random_principal_id();

        let result = service.link_validate_user_update_action(&action, &user_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "User is not the creator of the action".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_error_link_validate_user_update_action_if_action_type_use_and_action_state_success()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::Use,
            state: ActionState::Success,
            creator: creator_id.clone(),
            link_id: link.id.clone(),
        };

        let result = service.link_validate_user_update_action(&action, &creator_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "Action is already success".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_link_validate_user_update_action_if_action_type_use_and_user_is_creator() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::Use,
            state: ActionState::Created,
            creator: creator_id.clone(),
            link_id: link.id.clone(),
        };

        let result = service.link_validate_user_update_action(&action, &creator_id);
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_error_link_validate_user_update_action_if_action_type_is_unsupported() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let action = Action {
            id: random_id_string(),
            r#type: ActionType::Claim,
            state: ActionState::Created,
            creator: random_principal_id(),
            link_id: random_id_string(),
        };
        let user_id = random_principal_id();

        let result = service.link_validate_user_update_action(&action, &user_id);
        assert!(result.is_err());

        if let CanisterError::ValidationErrors(msg) = result.err().unwrap() {
            assert_eq!(msg, "Unsupported action type".to_string());
        } else {
            panic!("Expected ValidationErrors");
        }
    }

    #[test]
    fn it_should_false_is_link_creator_if_user_wallet_not_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link_id = random_id_string();
        let user_id = random_principal_id();

        let result = service.is_link_creator(&user_id, &link_id);
        assert!(!result);
    }

    #[test]
    fn it_should_false_is_link_creator_if_link_not_found() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let user_id = random_principal_id();
        let _user_wallet = service.user_wallet_repository.create(
            user_id.clone(),
            UserWallet {
                user_id: user_id.clone(),
            },
        );

        let link_id = random_id_string();
        let result = service.is_link_creator(&user_id, &link_id);
        assert!(!result);
    }

    #[test]
    fn it_should_true_is_link_creator_if_user_is_creator() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let creator_id = random_principal_id();
        let link = create_link_feature(&service, &creator_id);
        let user_id = creator_id.clone();
        let _user_wallet = service.user_wallet_repository.create(
            user_id.clone(),
            UserWallet {
                user_id: user_id.clone(),
            },
        );

        let result = service.is_link_creator(&user_id, &link.id);
        assert!(result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_send_tip_and_asset_info_empty()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, &random_principal_id());
        let asset_infos: Vec<AssetInfo> = vec![];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_send_tip_and_asset_info_length_greater_than_one()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, &random_principal_id());
        let asset_infos = vec![
            AssetInfo {
                address: "some_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: "some_label".to_string(),
            },
            AssetInfo {
                address: "another_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 200,
                label: "another_label".to_string(),
            },
        ];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_send_tip_and_asset_info_amount_per_link_use_action_zero()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, &random_principal_id());
        let asset_infos = vec![AssetInfo {
            address: "some_address".to_string(),
            chain: Chain::IC,
            amount_per_link_use_action: 0,
            label: "some_label".to_string(),
        }];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_true_validate_add_asset_with_link_type_if_link_type_send_tip_and_asset_info_amount_per_link_use_action_greater_than_zero()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let link = create_link_feature(&service, &random_principal_id());
        let asset_infos = vec![AssetInfo {
            address: "some_address".to_string(),
            chain: Chain::IC,
            amount_per_link_use_action: 100,
            label: "some_label".to_string(),
        }];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_send_airdrop_and_asset_info_empty()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::SendAirdrop);
        service.link_repository.update(link.clone());

        let asset_infos: Vec<AssetInfo> = vec![];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_send_airdrop_and_asset_info_length_greater_than_one()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::SendAirdrop);
        service.link_repository.update(link.clone());

        let asset_infos = vec![
            AssetInfo {
                address: "some_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: "some_label".to_string(),
            },
            AssetInfo {
                address: "another_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 200,
                label: "another_label".to_string(),
            },
        ];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_send_airdrop_and_asset_info_amount_per_link_use_action_zero()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::SendAirdrop);
        service.link_repository.update(link.clone());

        let asset_infos = vec![AssetInfo {
            address: "some_address".to_string(),
            chain: Chain::IC,
            amount_per_link_use_action: 0,
            label: "some_label".to_string(),
        }];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_true_validate_add_asset_with_link_type_if_link_type_send_airdrop_and_asset_info_amount_per_link_use_action_greater_than_zero()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::SendAirdrop);
        service.link_repository.update(link.clone());

        let asset_infos = vec![AssetInfo {
            address: "some_address".to_string(),
            chain: Chain::IC,
            amount_per_link_use_action: 100,
            label: "some_label".to_string(),
        }];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_send_token_basket_and_asset_info_empty()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::SendTokenBasket);
        service.link_repository.update(link.clone());

        let asset_infos: Vec<AssetInfo> = vec![];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_send_token_basket_and_amount_per_link_use_action_zero()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::SendTokenBasket);
        service.link_repository.update(link.clone());

        let asset_infos = vec![AssetInfo {
            address: "some_address".to_string(),
            chain: Chain::IC,
            amount_per_link_use_action: 0,
            label: "some_label".to_string(),
        }];
        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_true_validate_add_asset_with_link_type_if_link_type_send_token_basket_and_amount_per_link_use_action_greater_than_zero()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::SendTokenBasket);
        service.link_repository.update(link.clone());

        let asset_infos = vec![AssetInfo {
            address: "some_address".to_string(),
            chain: Chain::IC,
            amount_per_link_use_action: 100,
            label: "some_label".to_string(),
        }];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_receive_payment_and_asset_info_empty()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::ReceivePayment);
        service.link_repository.update(link.clone());

        let asset_infos: Vec<AssetInfo> = vec![];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_receive_payment_and_asset_info_length_greater_than_one()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::ReceivePayment);
        service.link_repository.update(link.clone());

        let asset_infos = vec![
            AssetInfo {
                address: "some_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 100,
                label: "some_label".to_string(),
            },
            AssetInfo {
                address: "another_address".to_string(),
                chain: Chain::IC,
                amount_per_link_use_action: 200,
                label: "another_label".to_string(),
            },
        ];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_receive_payment_and_asset_info_amount_per_link_use_action_one()
     {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::ReceivePayment);
        service.link_repository.update(link.clone());

        let asset_infos = vec![AssetInfo {
            address: "some_address".to_string(),
            chain: Chain::IC,
            amount_per_link_use_action: 1,
            label: "some_label".to_string(),
        }];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }

    #[test]
    fn it_should_false_validate_add_asset_with_link_type_if_link_type_unsupported() {
        let service: LinkService<MockIcEnvironment> = LinkService::get_instance();
        let mut link = create_link_feature(&service, &random_principal_id());
        link.link_type = Some(LinkType::SwapMultiAsset);
        service.link_repository.update(link.clone());

        let asset_infos = vec![AssetInfo {
            address: "some_address".to_string(),
            chain: Chain::IC,
            amount_per_link_use_action: 100,
            label: "some_label".to_string(),
        }];

        let result = service.validate_add_asset_with_link_type(&link, &asset_infos);
        assert!(!result);
    }
}
