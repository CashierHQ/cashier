// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::ckbtc::traits::CkBtcMinterTrait;
use crate::repository::{Repositories, user_ckbtc_address::UserCkbtcAddressRepository};
use candid::Principal;
use token_storage_types::{bitcoin::bridge_address::BtcAddress, error::CanisterError};

pub struct UserCkBtcService<R: Repositories, M: CkBtcMinterTrait> {
    pub user_ckbtc_address_repository: UserCkbtcAddressRepository<R::UserCkbtcAddress>,
    pub ckbtc_minter: M,
}

impl<R: Repositories, M: CkBtcMinterTrait> UserCkBtcService<R, M> {
    pub fn new(repo: &R, ckbtc_minter: M) -> Self {
        Self {
            user_ckbtc_address_repository: repo.user_ckbtc_address(),
            ckbtc_minter,
        }
    }

    /// Get the BTC address for a user, fetching from the CkBtcMinter if not cached
    /// # Arguments
    /// * `user` - The principal ID of the user
    /// # Returns
    /// * `Result<String, CanisterError>` - The BTC address if it exists
    pub async fn get_btc_address(
        &mut self,
        user: Principal,
        ckbtc_minter: Principal,
    ) -> Result<String, CanisterError> {
        if let Some(btc_address) = self.user_ckbtc_address_repository.get_address(&user) {
            Ok(btc_address.address)
        } else {
            let address = self
                .ckbtc_minter
                .get_btc_address(user, ckbtc_minter)
                .await?;
            self.user_ckbtc_address_repository.set_address(
                user,
                BtcAddress {
                    address: address.clone(),
                },
            )?;

            Ok(address)
        }
    }

    pub async fn update_balance(
        &self,
        user: Principal,
        ckbtc_minter: Principal,
    ) -> Result<candid::Nat, CanisterError> {
        self.ckbtc_minter.update_balance(user, ckbtc_minter).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ckbtc::ic_ckbtc_minter_client::tests::MockCkBtcMinterClient;
    use crate::repository::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::random_principal_id;

    #[tokio::test]
    async fn test_get_btc_address() {
        // Arrange
        let repo = TestRepositories::new();
        let mut mock_minter = MockCkBtcMinterClient::new();
        let user_id = random_principal_id();
        let expected_address = "btc_address_123".to_string();
        mock_minter.set_btc_address(user_id, expected_address.clone());

        let mut service = UserCkBtcService::new(&repo, mock_minter);
        // Act
        let address = service
            .get_btc_address(user_id, random_principal_id())
            .await
            .unwrap();

        // Assert
        assert_eq!(address, expected_address);

        // Act: Verify caching in repository
        let cached_address = repo.user_ckbtc_address().get_address(&user_id).unwrap();

        // Assert
        assert_eq!(cached_address.address, expected_address);
    }
}
