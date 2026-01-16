// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_structures::{DefaultMemoryImpl, VirtualMemory};
use ic_mple_utils::store::Storage;
use std::{cell::RefCell, thread::LocalKey};
use token_storage_types::bitcoin::bridge_address::{BtcAddress, BtcAddressCodec};

// Store for UserCkbtcAddressRepository
pub type UserCkbtcAddressRepositoryStorage =
    VersionedBTreeMap<Principal, BtcAddress, BtcAddressCodec, VirtualMemory<DefaultMemoryImpl>>;
pub type ThreadlocalUserCkbtcAddressRepositoryStorage =
    &'static LocalKey<RefCell<UserCkbtcAddressRepositoryStorage>>;

pub struct UserCkbtcAddressRepository<S: Storage<UserCkbtcAddressRepositoryStorage>> {
    address_store: S,
}

impl<S: Storage<UserCkbtcAddressRepositoryStorage>> UserCkbtcAddressRepository<S> {
    /// Create a new UserCkbtcAddressRepository
    pub fn new(storage: S) -> Self {
        Self {
            address_store: storage,
        }
    }

    /// Set CKBTC address for a user
    /// # Arguments
    /// * `user_id` - The Principal of the user
    /// * `address` - The BtcAddress to be set
    /// # Returns
    /// * `Result<(), String>` - Ok if successful, Err with message if failed
    pub fn set_address(&mut self, user_id: Principal, address: BtcAddress) -> Result<(), String> {
        self.address_store.with_borrow_mut(|store| {
            store.insert(user_id, address);
            Ok(())
        })
    }

    /// Get CKBTC address by user_id
    /// # Arguments
    /// * `user_id` - The Principal of the user
    /// # Returns
    /// * `Option<BtcAddress>` - Some(BtcAddress) if found, None if not found
    pub fn get_address(&self, user_id: &Principal) -> Option<BtcAddress> {
        self.address_store.with_borrow(|store| store.get(user_id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn test_set_and_get_ckbtc_address() {
        // Arrange
        let mut repo = TestRepositories::new().user_ckbtc_address();
        let user_id = random_principal_id();
        let address = BtcAddress {
            address: "ckbtc1qyqszqgpqyqszqgpqyqszqgpqyqszqgp6m5x7f7".to_string(),
        };

        // Act
        repo.set_address(user_id, address.clone())
            .expect("Failed to set CKBTC address");
        let retrieved_address = repo.get_address(&user_id).expect("CKBTC address not found");

        // Assert
        assert_eq!(retrieved_address, address);
    }
}
