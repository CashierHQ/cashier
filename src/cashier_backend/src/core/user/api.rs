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

use ic_cdk::{query, update};

use crate::{core::guard::is_not_anonymous, services};

use super::types::UserDto;

#[update(guard = "is_not_anonymous")]
fn create_user() -> Result<UserDto, String> {
    let user = services::user::create_new();
    match user {
        Ok(user) => Ok(user),
        Err(e) => Err(e),
    }
}

#[query(guard = "is_not_anonymous")]
async fn get_user() -> Result<UserDto, String> {
    let user = services::user::get().ok_or("User not found")?;
    Ok(user)
}
