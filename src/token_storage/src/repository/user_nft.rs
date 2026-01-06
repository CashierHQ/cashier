// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_utils::store::Storage;
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};
use std::{cell::RefCell, collections::HashSet, thread::LocalKey};
use token_storage_types::nft::{Nft, UserNftCodec};

/// Store for UserNftRepository
pub type UserNftRepositoryStorage =
    VersionedBTreeMap<Principal, HashSet<Nft>, UserNftCodec, VirtualMemory<DefaultMemoryImpl>>;
pub type ThreadlocalUserNftRepositoryStorage = &'static LocalKey<RefCell<UserNftRepositoryStorage>>;
pub struct UserNftRepository<S: Storage<UserNftRepositoryStorage>> {
    nft_store: S,
}

impl<S: Storage<UserNftRepositoryStorage>> UserNftRepository<S> {
    /// Create a new UserNftRepository
    pub fn new(storage: S) -> Self {
        Self { nft_store: storage }
    }

    /// Add NFT to user's NFT list
    /// # Arguments
    /// * `user_id` - The Principal of the user
    /// * `nft` - The Nft to be added
    /// # Returns
    /// * `Result<(), String>` - Ok if successful, Err with message if failed
    pub fn add_nft(&mut self, user_id: Principal, nft: Nft) -> Result<(), String> {
        self.nft_store.with_borrow_mut(|store| {
            let mut user_nft_list = store.get(&user_id).unwrap_or_else(HashSet::new);

            user_nft_list.insert(nft);
            store.insert(user_id, user_nft_list);
            Ok(())
        })
    }

    /// Get NFTs by user_id
    /// # Arguments
    /// * `user_id` - The Principal of the user
    /// * `start` - Optional start index for pagination
    /// * `limit` - Optional limit for pagination
    /// # Returns
    /// * `Vec<Nft>` - List of NFTs owned by the user
    pub fn get_nfts(
        &self,
        user_id: &Principal,
        start: Option<u32>,
        limit: Option<u32>,
    ) -> Vec<Nft> {
        let nfts = self.nft_store.with_borrow(|store| {
            store
                .get(user_id)
                .map(|nft_set| nft_set.into_iter().collect())
                .unwrap_or_else(Vec::new)
        });

        let start_idx = start.unwrap_or(0) as usize;
        let limit = limit.unwrap_or(nfts.len() as u32) as usize;

        nfts.into_iter().skip(start_idx).take(limit).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    #[test]
    fn it_should_add_and_get_user_nft() {
        // Arrange
        let mut repo = TestRepositories::new().user_nft();
        let user_id = random_principal_id();
        let nft = Nft {
            collection_id: random_principal_id(),
            token_id: Nat::from(0u32),
        };

        // Act
        repo.add_nft(user_id, nft.clone()).unwrap();

        // Assert
        let nfts = repo.get_nfts(&user_id, None, None);
        assert_eq!(nfts.len(), 1);
        assert_eq!(nfts[0], nft);
    }

    #[test]
    fn it_should_paginate_user_nfts() {
        // Arrange
        let mut repo = TestRepositories::new().user_nft();
        let user_id = random_principal_id();
        for i in 0..10 {
            let nft = Nft {
                collection_id: random_principal_id(),
                token_id: Nat::from(i as u32),
            };
            repo.add_nft(user_id, nft).unwrap();
        }

        // Act
        let nfts_page_1 = repo.get_nfts(&user_id, Some(0), Some(5));
        let nfts_page_2 = repo.get_nfts(&user_id, Some(5), Some(5));
        let nfts_page_3 = repo.get_nfts(&user_id, Some(10), Some(5));

        // Assert
        assert_eq!(nfts_page_1.len(), 5);
        assert_eq!(nfts_page_2.len(), 5);
        assert_eq!(nfts_page_3.len(), 0);
        assert_ne!(nfts_page_1, nfts_page_2);
    }
}
