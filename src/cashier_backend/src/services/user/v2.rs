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
