use candid::Principal;
use cashier_types::Link;
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    repositories::{action, user_wallet},
    utils::icrc::IcrcService,
};

#[cfg_attr(test, faux::create)]
pub struct ValidateService {
    icrc_service: IcrcService,
    user_wallet_repository: user_wallet::UserWalletRepository,
    action_repository: action::ActionRepository,
}

#[cfg_attr(test, faux::methods)]
impl ValidateService {
    pub fn get_instance() -> Self {
        ValidateService::new(
            IcrcService::new(),
            user_wallet::UserWalletRepository::new(),
            action::ActionRepository::new(),
        )
    }
    pub fn new(
        icrc_service: IcrcService,
        user_wallet_repository: user_wallet::UserWalletRepository,
        action_repository: action::ActionRepository,
    ) -> Self {
        Self {
            icrc_service,
            user_wallet_repository,
            action_repository,
        }
    }

    pub async fn validate_balance_with_asset_info(
        &self,
        link: &Link,
        user: &Principal,
    ) -> Result<(), String> {
        let asset_info = link
            .asset_info
            .clone()
            .ok_or_else(|| "Asset info not found".to_string())?;

        for asset in asset_info {
            let token_pid = Principal::from_text(asset.address.as_str())
                .map_err(|e| format!("Error converting token address to principal: {:?}", e))?;

            let account = Account {
                owner: *user,
                subaccount: None,
            };

            let balance = self
                .icrc_service
                .balance_of(token_pid, account)
                .await
                .map_err(|e| {
                    format!(
                        "Error getting balance for asset: {}, error: {:?}",
                        asset.address, e
                    )
                })?;

            if balance <= asset.total_amount {
                return Err(format!(
                    "Insufficient balance for asset: {}, balance: {}, required: {} and fee try smaller amount",
                    asset.address, balance, asset.total_amount
                ));
            }
        }

        Ok(())
    }

    pub fn is_action_creator(&self, caller: String, action_id: String) -> Result<bool, String> {
        let user_wallet = match self.user_wallet_repository.get(&caller) {
            Some(user_id) => user_id,
            None => {
                return Err("User not found".to_string());
            }
        };
        let action = self.action_repository.get(action_id);
        match action {
            Some(action) => Ok(action.creator == user_wallet.user_id),
            None => {
                return Err("Action not found".to_string());
            }
        }
    }
}
