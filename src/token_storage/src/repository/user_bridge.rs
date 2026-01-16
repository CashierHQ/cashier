// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_mple_structures::{DefaultMemoryImpl, VirtualMemory};
use ic_mple_utils::store::Storage;
use std::{cell::RefCell, thread::LocalKey};
use token_storage_types::bitcoin::bridge_address::{BridgeAddress, BridgeAddressCodec};

// Store for UserBridgeAddressRepository
pub type UserBridgeAddressRepositoryStorage = VersionedBTreeMap<
    Principal,
    BridgeAddress,
    BridgeAddressCodec,
    VirtualMemory<DefaultMemoryImpl>,
>;
pub type ThreadlocalUserBridgeAddressRepositoryStorage =
    &'static LocalKey<RefCell<UserBridgeAddressRepositoryStorage>>;

pub struct UserBridgeAddressRepository<S: Storage<UserBridgeAddressRepositoryStorage>> {
    address_store: S,
}

impl<S: Storage<UserBridgeAddressRepositoryStorage>> UserBridgeAddressRepository<S> {
    /// Create a new UserBridgeAddressRepository
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
    pub fn set_address(
        &mut self,
        user_id: Principal,
        address: BridgeAddress,
    ) -> Result<(), String> {
        self.address_store.with_borrow_mut(|store| {
            store.insert(user_id, address);
            Ok(())
        })
    }

    /// Get CKBTC address by user_id
    /// # Arguments
    /// * `user_id` - The Principal of the user
    /// # Returns
    /// * `Option<BridgeAddress>` - Some(BridgeAddress) if found, None if not found
    pub fn get_address(&self, user_id: &Principal) -> Option<BridgeAddress> {
        self.address_store.with_borrow(|store| store.get(user_id))
    }
}
