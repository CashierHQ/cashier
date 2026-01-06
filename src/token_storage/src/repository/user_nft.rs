// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
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
    pub fn add_nft(&mut self, user_id: Principal, nft: Nft) -> Result<(), String> {
        self.nft_store.with_borrow_mut(|store| {
            let mut user_nft_list = store.get(&user_id).unwrap_or_else(|| HashSet::new());

            user_nft_list.insert(nft);
            store.insert(user_id, user_nft_list);
            Ok(())
        })
    }

    pub fn get_nfts(&self, user_id: &Principal) -> Vec<Nft> {
        self.nft_store.with_borrow(|store| {
            store
                .get(user_id)
                .map(|nft_set| nft_set.into_iter().collect())
                .unwrap_or_else(Vec::new)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::tests::TestRepositories;
    use cashier_common::test_utils::{random_id_string, random_principal_id};
}
