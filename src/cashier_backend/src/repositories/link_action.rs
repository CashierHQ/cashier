// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::repository::{
    action::v1::ActionType,
    link_action::v1::{LinkAction, LinkActionCodec},
};
use ic_mple_log::service::Storage;
use ic_mple_structures::{BTreeMapStructure, VersionedBTreeMap};
use ic_stable_structures::{DefaultMemoryImpl, memory_manager::VirtualMemory};

pub type LinkActionRepositoryStorage =
    VersionedBTreeMap<String, LinkAction, LinkActionCodec, VirtualMemory<DefaultMemoryImpl>>;

#[derive(Debug, Clone)]
struct LinkActionKey<'a> {
    pub link_id: &'a str,
    pub action_type: &'a ActionType,
    pub action_id: &'a str,
    pub user_id: &'a Principal,
}

impl<'a> LinkActionKey<'a> {
    pub fn to_str(&self) -> String {
        format!(
            "LINK#{}#USER#{}#TYPE#{}#ACTION#{}",
            self.link_id, self.user_id, self.action_type, self.action_id
        )
    }
}

#[derive(Clone)]
pub struct LinkActionRepository<S: Storage<LinkActionRepositoryStorage>> {
    storage: S,
}

impl<S: Storage<LinkActionRepositoryStorage>> LinkActionRepository<S> {
    pub fn new(storage: S) -> Self {
        Self { storage }
    }

    pub fn create(&mut self, link_action: LinkAction) {
        self.storage.with_borrow_mut(|store| {
            let id: LinkActionKey = LinkActionKey {
                link_id: &link_action.link_id,
                action_type: &link_action.action_type,
                action_id: &link_action.action_id,
                user_id: &link_action.user_id,
            };
            store.insert(id.to_str(), link_action);
        });
    }
}
