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

use crate::repositories::ACTION_STORE;
use cashier_types::{Action, ActionKey};

use super::base_repository::Store;

#[cfg_attr(test, faux::create)]
#[derive(Clone)]
pub struct ActionRepository {}

#[cfg_attr(test, faux::methods)]
impl ActionRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, action: Action) {
        ACTION_STORE.with_borrow_mut(|store| {
            store.insert(action.id.clone(), action);
        });
    }

    pub fn get(&self, action_id: ActionKey) -> Option<Action> {
        ACTION_STORE.with_borrow(|store| store.get(&action_id).clone())
    }

    pub fn batch_get(&self, ids: Vec<ActionKey>) -> Vec<Action> {
        ACTION_STORE.with_borrow(|store| store.batch_get(ids))
    }

    pub fn update(&self, action: Action) {
        ACTION_STORE.with_borrow_mut(|store| {
            let id = action.id.clone();
            store.insert(id, action);
        });
    }
}
