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
