// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use token_storage_types::{
    dto::nft::{NftDto, UserNftDto},
    error::CanisterError,
    nft::Nft,
};

use crate::repository::{Repositories, user_nft::UserNftRepository};

pub struct UserNftService<R: Repositories> {
    user_nft_repository: UserNftRepository<R::UserNft>,
}

impl<R: Repositories> UserNftService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            user_nft_repository: repo.user_nft(),
        }
    }

    /// Adds an NFT to the user's collection
    /// # Arguments
    /// * `user_id` - The principal of the user
    /// * `nft` - The NFT to add
    /// # Returns
    /// * `Result<(), String>` - Ok if successful, Err with message if failed
    pub fn add_nft(&mut self, user_id: Principal, nft: Nft) -> Result<UserNftDto, CanisterError> {
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
    use crate::repository::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    fn user_nft_service_fixture() -> UserNftService<TestRepositories> {
        let repo = TestRepositories::new();
        UserNftService::new(&repo)
    }

    #[test]
    fn it_should_add_and_get_nft() {
        // Arrange
        let mut service = user_nft_service_fixture();
        let user_id = random_principal_id();
        let nft = Nft {
            collection_id: random_principal_id(),
            token_id: random_id_string(),
        };

        // Act
        service.add_nft(user_id, nft.clone()).unwrap();

        // Assert
        let nfts = service.get_nfts(&user_id, None, None);
        assert_eq!(nfts.len(), 1);
        assert_eq!(nfts[0], NftDto::from(nft));
    }

    #[test]
    fn it_should_get_nfts_with_pagination() {
        // Arrange
        let mut service = user_nft_service_fixture();
        let user_id = random_principal_id();
        for _ in 0..10 {
            let nft = Nft {
                collection_id: random_principal_id(),
                token_id: random_id_string(),
            };
            service.add_nft(user_id, nft).unwrap();
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
