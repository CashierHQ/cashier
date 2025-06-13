// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use super::VERSIONED_LINK_ACTION_STORE;
use cashier_types::{
    keys::ActionTypeKey, versioned::VersionedLinkAction, LinkAction, LinkActionKey, LinkKey,
};

const CURRENT_DATA_VERSION: u32 = 1;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct LinkActionRepository {}

#[cfg_attr(test, faux::methods)]
impl LinkActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, link_action: LinkAction) {
        VERSIONED_LINK_ACTION_STORE.with_borrow_mut(|store| {
            let id: LinkActionKey = LinkActionKey {
                link_id: link_action.link_id.clone(),
                action_type: link_action.action_type.clone(),
                action_id: link_action.action_id.clone(),
                user_id: link_action.user_id.clone(),
            };
            let versioned_link_action =
                VersionedLinkAction::build(CURRENT_DATA_VERSION, link_action)
                    .expect("Failed to create versioned link action");
            store.insert(id.to_str(), versioned_link_action);
        });
    }

    pub fn update(&self, link_action: LinkAction) {
        VERSIONED_LINK_ACTION_STORE.with_borrow_mut(|store| {
            let id: LinkActionKey = LinkActionKey {
                link_id: link_action.link_id.clone(),
                action_type: link_action.action_type.clone(),
                action_id: link_action.action_id.clone(),
                user_id: link_action.user_id.clone(),
            };
            let versioned_link_action =
                VersionedLinkAction::build(CURRENT_DATA_VERSION, link_action)
                    .expect("Failed to create versioned link action");
            store.insert(id.to_str(), versioned_link_action);
        });
    }

    pub fn get(&self, id: LinkActionKey) -> Option<LinkAction> {
        VERSIONED_LINK_ACTION_STORE.with_borrow(|store| {
            store
                .get(&id.to_str())
                .map(|versioned_data| versioned_data.into_link_action())
        })
    }

    // Query by link_id, action_type, user_id, skip action_id
    pub fn get_by_prefix(
        &self,
        link_id: LinkKey,
        action_type: ActionTypeKey,
        user_id: String,
    ) -> Vec<LinkAction> {
        VERSIONED_LINK_ACTION_STORE.with_borrow(|store| {
            let key: LinkActionKey = LinkActionKey {
                link_id: link_id.clone(),
                action_type: action_type.clone(),
                user_id: user_id.clone(),
                action_id: "".to_string(),
            };

            let prefix = key.to_str().clone();

            let link_actions: Vec<_> = store
                .range(prefix.clone()..)
                .filter(|(key, _)| key.starts_with(&prefix))
                .map(|(_, value)| value.into_link_action())
                .collect();

            link_actions
        })
    }

    pub fn delete(&self, id: LinkActionKey) {
        VERSIONED_LINK_ACTION_STORE.with_borrow_mut(|store| {
            store.remove(&id.to_str());
        });
    }
}
