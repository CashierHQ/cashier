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

use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

pub type Subaccount = serde_bytes::ByteBuf;

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Subaccount>,
}

impl Account {
    pub fn new(owner: Principal, subaccount: Option<Subaccount>) -> Self {
        Self { owner, subaccount }
    }

    pub fn from_link_id(owner: Principal, link_id: String) -> Self {
        let subaccount_bytes = link_id.into_bytes();
        let subaccount = Some(subaccount_bytes.into());

        Self { owner, subaccount }
    }
}
