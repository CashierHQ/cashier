// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    dto::user::UserDto,
    repository::{user::v1::User, user_wallet::v1::UserWallet},
};
use uuid::Uuid;

use crate::repositories::{Repositories, user::UserRepository, user_wallet::UserWalletRepository};

pub struct UserService<R: Repositories> {
    user_repository: UserRepository<R::User>,
    user_wallet_repository: UserWalletRepository<R::UserWallet>,
}

impl<R: Repositories> UserService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            user_repository: repo.user(),
            user_wallet_repository: repo.user_wallet(),
        }
    }

    pub fn create_new(&mut self, caller: Principal) -> Result<UserDto, String> {
        if self.exists(&caller) {
            return Err("User already existed".to_string());
        }

        let id = Uuid::new_v4();
        let id_str = id.to_string();

        let user = User {
            id: id_str.clone(),
            email: None,
        };

        let user_wallet = UserWallet {
            user_id: id_str.clone(),
        };

        self.user_repository.create(user);
        self.user_wallet_repository
            .create(caller.to_text(), user_wallet);

        Ok(UserDto {
            id: id_str,
            email: None,
            wallet: caller.to_text(),
        })
    }

    pub fn get_user_id_by_wallet(&self, user_wallet: &Principal) -> Option<String> {
        let user_wallet = self.user_wallet_repository.get(&user_wallet.to_text());

        match user_wallet {
            Some(user_wallet) => Some(user_wallet.user_id),
            None => None,
        }
    }

    pub fn get_user_dto(&self, caller: &Principal) -> Option<UserDto> {
        let user_wallet = self.user_wallet_repository.get(&caller.to_string())?;
        let user = self.user_repository.get(&user_wallet.user_id);

        match user {
            Some(user) => Some(UserDto {
                id: user.id,
                email: user.email,
                wallet: caller.to_text(),
            }),
            None => None,
        }
    }

    pub fn exists(&self, caller: &Principal) -> bool {
        self.user_wallet_repository
            .get(&caller.to_string())
            .is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::test_utils::random_principal_id;
    use cashier_backend_types::repository::user_wallet::v1::UserWallet;

    #[test]
    fn it_should_none_get_user_id_by_wallet() {
        // Arrange
        let user_service = UserService::get_instance();
        let principal_id = random_principal_id();

        // Act
        let user_id =
            user_service.get_user_id_by_wallet(&Principal::from_text(principal_id).unwrap());

        // Assert
        assert!(user_id.is_none());
    }

    #[test]
    fn it_should_get_user_id_by_wallet() {
        // Arrange
        let user_service = UserService::get_instance();
        let principal_id = random_principal_id();
        user_service.user_wallet_repository.create(
            principal_id.clone(),
            UserWallet {
                user_id: principal_id.clone(),
            },
        );

        // Act
        let user_id = user_service
            .get_user_id_by_wallet(&Principal::from_text(principal_id.clone()).unwrap());

        // Assert
        assert!(user_id.is_some());
        assert_eq!(user_id.unwrap(), principal_id);
    }
}
