use async_trait::async_trait;
use candid::Principal;
use icrc_ledger_types::icrc1::account::Account;

use crate::services::link::service::LinkService;
use crate::services::link::traits::LinkValidation;
use crate::utils::helper::to_subaccount;
use crate::utils::runtime::IcEnvironment;

use cashier_types::{
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        asset_info::AssetInfo,
        link::v1::{Link, LinkState, LinkType},
    },
};

#[async_trait(?Send)]
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
                if let Some(_link_type) = &link.link_type {
                    if link.link_use_action_counter >= link.link_use_action_max_count {
                        return Err(CanisterError::ValidationErrors(format!(
                            "Link maximum usage count reached: {}",
                            link.link_use_action_max_count
                        )));
                    }
                }

                // Synchronous validation passes
                Ok(())
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type".to_string(),
            )),
        }
    }

    // this method validate for each action type
    // create link:
    //      - only creator can create link
    // withdraw:
    //      - only creator can withdraw
    //      - validate link balance left
    // claim:
    //      - any one can use
    //      - validate link state is active
    //      - validate link balance left
    async fn link_validate_user_create_action_async(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_id: &str,
        caller: &Principal,
    ) -> Result<(), CanisterError> {
        // get link
        let link = self.get_link_by_id(link_id)?;

        match action_type {
            ActionType::CreateLink => {
                // validate user id == link creator
                if link.creator == user_id {
                    // validate user's balance
                    self.link_validate_balance_with_asset_info(action_type, link_id, caller)
                        .await?;
                    Ok(())
                } else {
                    Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ))
                }
            }
            ActionType::Withdraw => {
                // validate user id == link creator
                if link.creator == user_id {
                    let asset = link.asset_info.clone().ok_or_else(|| {
                        CanisterError::HandleLogicError("Asset info not found".to_string())
                    })?;

                    let Some(asset) = asset.first() else {
                        return Err(CanisterError::HandleLogicError(
                            "Asset info is empty".to_string(),
                        ));
                    };

                    let asset_address_text = asset.address.clone();
                    let asset_address =
                        Principal::from_text(asset_address_text.as_str()).map_err(|e| {
                            CanisterError::HandleLogicError(format!(
                                "Error converting token address to principal: {e:?}"
                            ))
                        })?;

                    let link_balance = self
                        .icrc_service
                        .balance_of(
                            asset_address,
                            Account {
                                owner: self.ic_env.id(),
                                subaccount: Some(to_subaccount(&link.id)?),
                            },
                        )
                        .await?;

                    if link_balance == 0u64 {
                        return Err(CanisterError::ValidationErrors(
                            "Not enough asset".to_string(),
                        ));
                    }

                    Ok(())
                } else {
                    Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ))
                }
            }
            ActionType::Use => {
                // validate link state
                if link.state != LinkState::Active {
                    return Err(CanisterError::ValidationErrors(
                        "Link is not active".to_string(),
                    ));
                }

                if link.link_type != Some(LinkType::ReceivePayment) {
                    // validate link balance
                    let asset = link.asset_info.clone().ok_or_else(|| {
                        CanisterError::HandleLogicError("Asset info not found".to_string())
                    })?;

                    let Some(asset) = asset.first() else {
                        return Err(CanisterError::HandleLogicError(
                            "Asset info is empty".to_string(),
                        ));
                    };

                    let asset_address_text = asset.address.clone();
                    let asset_address =
                        Principal::from_text(asset_address_text.as_str()).map_err(|e| {
                            CanisterError::HandleLogicError(format!(
                                "Error converting token address to principal: {e:?}"
                            ))
                        })?;

                    let link_balance = self
                        .icrc_service
                        .balance_of(
                            asset_address,
                            Account {
                                owner: self.ic_env.id(),
                                subaccount: Some(to_subaccount(&link.id)?),
                            },
                        )
                        .await?;

                    if link_balance == 0u64 {
                        return Err(CanisterError::ValidationErrors(
                            "Not enough asset".to_string(),
                        ));
                    }
                }

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

    async fn link_validate_user_update_action_async(
        &self,
        action: &Action,
        user_id: &str,
        caller: &Principal,
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

                self.link_validate_balance_with_asset_info(&action.r#type, &link.id, caller)
                    .await?;
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
            }
            _ => {
                return Err(CanisterError::ValidationErrors(
                    "Unsupported action type".to_string(),
                ));
            }
        }

        Ok(())
    }

    // This method mostly use for "Send" link type
    async fn link_validate_balance_with_asset_info(
        &self,
        action_type: &ActionType,
        link_id: &str,
        user_wallet: &Principal,
    ) -> Result<(), CanisterError> {
        if action_type != &ActionType::CreateLink {
            return Ok(());
        }

        let link = self
            .get_link_by_id(link_id)
            .map_err(|e| CanisterError::NotFound(e.to_string()))?;

        if link.link_type == Some(LinkType::ReceivePayment) {
            return Ok(());
        }

        let asset_info = link
            .asset_info
            .clone()
            .ok_or_else(|| CanisterError::NotFound("Asset info not found".to_string()))?;

        for asset in asset_info {
            let token_pid = Principal::from_text(asset.address.as_str()).map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Error converting token address to principal: {e:?}"
                ))
            })?;

            let account = Account {
                owner: *user_wallet,
                subaccount: None,
            };

            let balance = self.icrc_service.balance_of(token_pid, account).await?;

            let expected_amount = asset.amount_per_link_use_action * link.link_use_action_max_count;

            if balance <= expected_amount {
                return Err(CanisterError::ValidationErrors(format!(
                    "Insufficient balance for asset: {}, balance: {}, required: {} and fee try smaller amount",
                    asset.address, balance, expected_amount
                )));
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

            return true;
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
            return true;
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

            return true;
        } else {
            // link type is not supported
            return false;
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

    /// Check if link exists
    fn is_link_exist(&self, link_id: &str) -> bool {
        self.link_repository.get(&link_id.to_string()).is_some()
    }
}
