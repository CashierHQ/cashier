// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{
    bitcoin::{bridge_address::BridgeAddress, omnity_bitcoin::GetBtcAddressArgs},
    error::CanisterError,
};

use crate::{
    repository::{Repositories, user_bridge_address::UserBridgeAddressRepository},
    runes::traits::OmnityBitcoinTrait,
};

const OMNITY_TARGET_CHAIN_ID: &str = "eICP";

pub struct UserRunesService<R: Repositories> {
    pub user_bridge_address_repository: UserBridgeAddressRepository<R::UserBridgeAddress>,
    pub omnity_bitcoin_id: Principal,
}

impl<R: Repositories> UserRunesService<R> {
    pub fn new(repo: &R, omnity_bitcoin_id: Principal) -> Self {
        Self {
            user_bridge_address_repository: repo.user_bridge_address(),
            omnity_bitcoin_id,
        }
    }

    /// Get the Rune address for a user, fetching from Omnity Bitcoin if not cached.
    /// # Arguments
    /// * `user` - The principal id of the user
    /// * `omnity_bitcoin` - The Omnity Bitcoin client
    /// # Returns
    /// * `Result<String, CanisterError>` - The Rune address if it exists
    pub async fn get_rune_address<B>(
        &mut self,
        user: Principal,
        omnity_bitcoin: &B,
    ) -> Result<String, CanisterError>
    where
        B: OmnityBitcoinTrait,
    {
        if let Some(bridge_address) = self.user_bridge_address_repository.get_address(&user)
            && let Some(rune_address) = bridge_address.rune_address
        {
            return Ok(rune_address);
        }

        let rune_address = omnity_bitcoin
            .get_btc_address(
                self.omnity_bitcoin_id,
                GetBtcAddressArgs {
                    target_chain_id: OMNITY_TARGET_CHAIN_ID.to_string(),
                    receiver: user.to_text(),
                },
            )
            .await?;

        let mut bridge_address = self
            .user_bridge_address_repository
            .get_address(&user)
            .unwrap_or(BridgeAddress {
                btc_address: String::new(),
                rune_address: None,
            });
        bridge_address.rune_address = Some(rune_address.clone());
        self.user_bridge_address_repository
            .set_address(user, bridge_address)
            .map_err(CanisterError::StorageError)?;

        Ok(rune_address)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        repository::{Repositories, tests::TestRepositories},
        runes::ic_omnity_bitcoin::tests::MockOmnityBitcoin,
    };
    use cashier_common::test_utils::random_principal_id;

    fn fixture_of_bridge_address(btc_address: &str, rune_address: Option<&str>) -> BridgeAddress {
        BridgeAddress {
            btc_address: btc_address.to_string(),
            rune_address: rune_address.map(ToString::to_string),
        }
    }

    #[tokio::test]
    async fn it_should_do_get_rune_address_from_cache() {
        // Arrange
        let repo = TestRepositories::new();
        let user_id = random_principal_id();
        let omnity_bitcoin_id = random_principal_id();
        let mut service = UserRunesService::new(&repo, omnity_bitcoin_id);
        let mock_omnity_bitcoin = MockOmnityBitcoin::new();
        repo.user_bridge_address()
            .set_address(
                user_id,
                fixture_of_bridge_address("tb1qbtcaddress", Some("tb1qruneaddress")),
            )
            .unwrap();

        // Act
        let result = service
            .get_rune_address(user_id, &mock_omnity_bitcoin)
            .await;

        // Assert
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "tb1qruneaddress");
        assert!(mock_omnity_bitcoin.call_args.borrow().is_empty());
    }

    #[tokio::test]
    async fn it_should_do_get_rune_address_from_omnity_and_cache_it() {
        // Arrange
        let repo = TestRepositories::new();
        let user_id = random_principal_id();
        let omnity_bitcoin_id = random_principal_id();
        let mut service = UserRunesService::new(&repo, omnity_bitcoin_id);
        let mut mock_omnity_bitcoin = MockOmnityBitcoin::new();
        mock_omnity_bitcoin.set_btc_address(&user_id.to_text(), "tb1qruneaddress");

        // Act
        let result = service
            .get_rune_address(user_id, &mock_omnity_bitcoin)
            .await;

        // Assert
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "tb1qruneaddress");
        assert_eq!(mock_omnity_bitcoin.call_args.borrow().len(), 1);
        let cached_address = repo.user_bridge_address().get_address(&user_id).unwrap();
        assert_eq!(cached_address.btc_address, "");
        assert_eq!(
            cached_address.rune_address,
            Some("tb1qruneaddress".to_string())
        );
    }

    #[tokio::test]
    async fn it_should_do_get_rune_address_preserving_existing_btc_address() {
        // Arrange
        let repo = TestRepositories::new();
        let user_id = random_principal_id();
        let omnity_bitcoin_id = random_principal_id();
        let mut service = UserRunesService::new(&repo, omnity_bitcoin_id);
        let mut mock_omnity_bitcoin = MockOmnityBitcoin::new();
        mock_omnity_bitcoin.set_btc_address(&user_id.to_text(), "tb1qruneaddress");
        repo.user_bridge_address()
            .set_address(user_id, fixture_of_bridge_address("tb1qbtcaddress", None))
            .unwrap();

        // Act
        let result = service
            .get_rune_address(user_id, &mock_omnity_bitcoin)
            .await;

        // Assert
        assert!(result.is_ok());
        let cached_address = repo.user_bridge_address().get_address(&user_id).unwrap();
        assert_eq!(cached_address.btc_address, "tb1qbtcaddress");
        assert_eq!(
            cached_address.rune_address,
            Some("tb1qruneaddress".to_string())
        );
    }

    #[tokio::test]
    async fn it_should_fail_get_rune_address_due_to_omnity_error() {
        // Arrange
        let repo = TestRepositories::new();
        let user_id = random_principal_id();
        let omnity_bitcoin_id = random_principal_id();
        let mut service = UserRunesService::new(&repo, omnity_bitcoin_id);
        let mut mock_omnity_bitcoin = MockOmnityBitcoin::new();
        mock_omnity_bitcoin.set_error(CanisterError::NotFound(
            "Rune address not found".to_string(),
        ));

        // Act
        let result = service
            .get_rune_address(user_id, &mock_omnity_bitcoin)
            .await;

        // Assert
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CanisterError::NotFound(_)));
        assert!(repo.user_bridge_address().get_address(&user_id).is_none());
    }

    #[tokio::test]
    async fn it_should_do_get_rune_address_with_expected_omnity_args() {
        // Arrange
        let repo = TestRepositories::new();
        let user_id = random_principal_id();
        let omnity_bitcoin_id = random_principal_id();
        let mut service = UserRunesService::new(&repo, omnity_bitcoin_id);
        let mut mock_omnity_bitcoin = MockOmnityBitcoin::new();
        mock_omnity_bitcoin.set_btc_address(&user_id.to_text(), "tb1qruneaddress");

        // Act
        let result = service
            .get_rune_address(user_id, &mock_omnity_bitcoin)
            .await;

        // Assert
        assert!(result.is_ok());
        let call_args = mock_omnity_bitcoin.call_args.borrow();
        assert_eq!(call_args.len(), 1);
        assert_eq!(call_args[0].target_chain_id, "eICP");
        assert_eq!(call_args[0].receiver, user_id.to_text());
    }
}
