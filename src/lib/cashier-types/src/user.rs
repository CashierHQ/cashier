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

use candid::CandidType;
use cashier_macros::storable;

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct User {
    pub id: String,
    pub email: Option<String>,
}

#[derive(Clone, Debug, Default, CandidType, PartialEq)]
#[storable]
pub struct UserWallet {
    pub user_id: String,
}

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct UserLink {
    pub user_id: String,
    pub link_id: String,
}

#[derive(Clone, Debug, Default, CandidType)]
#[storable]
pub struct UserAction {
    pub user_id: String,
    pub action_id: String,
}
