// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;

use crate::repositories::user_wallet::UserWalletRepository;

pub struct UserService {
    user_wallet_repository: UserWalletRepository,
}

impl UserService {
    pub fn get_instance() -> Self {
        Self {
            user_wallet_repository: UserWalletRepository::new(),
        }
    }

    pub fn get_user_id_by_wallet(&self, user_wallet: &Principal) -> Option<String> {
        let user_wallet = self.user_wallet_repository.get(&user_wallet.to_text());

        match user_wallet {
            Some(user_wallet) => Some(user_wallet.user_id),
            None => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::random_principal_id;
    use cashier_backend_types::repository::user_wallet::v1::UserWallet;

    #[test]
    fn it_should_none_get_user_id_by_wallet() {
        let user_service = UserService::get_instance();
        let principal_id = random_principal_id();
        let user_id =
            user_service.get_user_id_by_wallet(&Principal::from_text(principal_id).unwrap());
        assert!(user_id.is_none());
    }

    #[test]
    fn it_should_get_user_id_by_wallet() {
        let user_service = UserService::get_instance();
        let principal_id = random_principal_id();
        user_service.user_wallet_repository.create(
            principal_id.clone(),
            UserWallet {
                user_id: principal_id.clone(),
            },
        );

        let user_id = user_service
            .get_user_id_by_wallet(&Principal::from_text(principal_id.clone()).unwrap());
        assert!(user_id.is_some());
        assert_eq!(user_id.unwrap(), principal_id);
    }
}
