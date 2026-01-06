// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use token_storage_types::{
    dto::nft::{NftDto, UserNftDto},
    error::CanisterError,
    nft::Nft,
};

use crate::icrc7::traits::Icrc7ValidatorTrait;
use crate::repository::{Repositories, user_nft::UserNftRepository};

pub struct UserNftService<R: Repositories, V: Icrc7ValidatorTrait> {
    pub user_nft_repository: UserNftRepository<R::UserNft>,
    pub icrc7_validator: V,
}

impl<R: Repositories, V: Icrc7ValidatorTrait> UserNftService<R, V> {
    pub fn new(repo: &R, icrc7_validator: V) -> Self {
        Self {
            user_nft_repository: repo.user_nft(),
            icrc7_validator,
        }
    }

    /// Adds an NFT to the user's collection
    /// # Arguments
    /// * `user_id` - The principal of the user
    /// * `nft` - The NFT to add
    /// # Returns
    /// * `Result<(), String>` - Ok if successful, Err with message if failed
    pub async fn add_nft(
        &mut self,
        user_id: Principal,
        nft: Nft,
    ) -> Result<UserNftDto, CanisterError> {
        let is_owner = self
            .icrc7_validator
            .validate_owner_of(&user_id, &nft.collection_id, &nft.token_id)
            .await?;

        if !is_owner {
            return Err(CanisterError::ValidationErrors(
                "User is not the owner of the specified NFT".to_string(),
            ));
        }

        self.user_nft_repository
            .add_nft(user_id, nft.clone())
            .map_err(CanisterError::StorageError)?;

        Ok(UserNftDto { user: user_id, nft })
    }

    /// Retrieves the list of NFTs owned by the user
    /// # Arguments
    /// * `user_id` - The principal of the user
    /// * `start` - Optional start index for pagination
    /// * `limit` - Optional limit for pagination
    /// # Returns
    /// * `Vec<Nft>` - List of NFTs owned by the user
    pub fn get_nfts(
        &self,
        user_id: &Principal,
        start: Option<u32>,
        limit: Option<u32>,
    ) -> Vec<NftDto> {
        let nfts = self.user_nft_repository.get_nfts(user_id, start, limit);
        nfts.into_iter().map(NftDto::from).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::icrc7::ic_icrc7_validator::tests::MockIcrc7Validator;
    use crate::repository::tests::TestRepositories;
    use cashier_common::test_utils::random_principal_id;

    fn user_nft_service_fixture() -> UserNftService<TestRepositories, MockIcrc7Validator> {
        let repo = TestRepositories::new();
        let validator = MockIcrc7Validator::new();
        UserNftService::new(&repo, validator)
    }

    #[tokio::test]
    async fn it_should_fail_add_nft_due_to_no_ownership() {
        // Arrange
        let mut service = user_nft_service_fixture();
        let user_id = random_principal_id();
        let nft = Nft {
            collection_id: random_principal_id(),
            token_id: Nat::from(0u32),
        };

        // Act
        let result = service.add_nft(user_id, nft.clone()).await;

        // Assert
        assert!(result.is_err());
        match result {
            Err(CanisterError::ValidationErrors(msg)) => {
                assert_eq!(msg, "User is not the owner of the specified NFT");
            }
            _ => panic!("Expected ValidationErrors"),
        }
    }

    #[tokio::test]
    async fn it_should_add_nft_successfully() {
        // Arrange
        let mut service = user_nft_service_fixture();
        let user_id = random_principal_id();
        let nft = Nft {
            collection_id: random_principal_id(),
            token_id: Nat::from(0u32),
        };
        service
            .icrc7_validator
            .set_ownership(&nft.collection_id, &nft.token_id, user_id);

        // Act
        let result = service.add_nft(user_id, nft.clone()).await;

        // Assert
        assert!(result.is_ok());
        let user_nft_dto = result.unwrap();
        assert_eq!(user_nft_dto.user, user_id);
        assert_eq!(user_nft_dto.nft, nft);
    }

    #[tokio::test]
    async fn it_should_get_nfts_for_user() {
        // Arrange
        let mut service = user_nft_service_fixture();
        let user_id = random_principal_id();
        let nft = Nft {
            collection_id: random_principal_id(),
            token_id: Nat::from(0u32),
        };
        service
            .icrc7_validator
            .set_ownership(&nft.collection_id, &nft.token_id, user_id);
        let _ = service.add_nft(user_id, nft.clone()).await;

        // Act
        let nfts = service.get_nfts(&user_id, None, None);

        // Assert
        assert_eq!(nfts.len(), 1);
        assert_eq!(nfts[0].collection_id, nft.collection_id);
        assert_eq!(nfts[0].token_id, nft.token_id);
    }

    #[tokio::test]
    async fn it_should_get_nfts_with_pagination() {
        // Arrange
        let mut service = user_nft_service_fixture();
        let user_id = random_principal_id();
        let collection_id = random_principal_id();

        for i in 0..10 {
            let nft = Nft {
                collection_id,
                token_id: Nat::from(i as u32),
            };
            service
                .icrc7_validator
                .set_ownership(&nft.collection_id, &nft.token_id, user_id);

            let _ = service.add_nft(user_id, nft).await;
        }

        // Act
        let nfts_page_1 = service.get_nfts(&user_id, Some(0), Some(5));
        let nfts_page_2 = service.get_nfts(&user_id, Some(5), Some(5));
        let nfts_page_3 = service.get_nfts(&user_id, Some(10), Some(5));

        // Assert
        assert_eq!(nfts_page_1.len(), 5);
        assert_eq!(nfts_page_2.len(), 5);
        assert_eq!(nfts_page_3.len(), 0);
    }
}
