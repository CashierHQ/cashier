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

use cashier_types::{User, UserWallet};
use uuid::Uuid;

use crate::{
    core::user::types::UserDto,
    repositories::{self},
};

pub mod v2;

pub fn create_new() -> Result<UserDto, String> {
    if is_existed() {
        return Err("User already existed".to_string());
    }

    let id = Uuid::new_v4();
    let id_str = id.to_string();

    let user = User {
        id: id_str.clone(),
        email: None,
    };

    let user_wallet = UserWallet {
        user_id: id_str.clone(),
    };

    let caller = ic_cdk::api::caller();

    let user_repository = repositories::user::UserRepository::new();
    let user_wallet_repository = repositories::user_wallet::UserWalletRepository::new();

    user_repository.create(user.clone());
    user_wallet_repository.create(caller.to_text(), user_wallet.clone());

    Ok(UserDto {
        id: id_str,
        email: None,
        wallet: caller.to_text(),
    })
}

pub fn get() -> Option<UserDto> {
    let user_repository = repositories::user::UserRepository::new();
    let user_wallet_repository = repositories::user_wallet::UserWalletRepository::new();
    let caller = ic_cdk::api::caller();

    let user_wallet = match user_wallet_repository.get(&caller.to_string()) {
        Some(user_id) => user_id,
        None => return None,
    };

    let user = user_repository.get(&user_wallet.user_id);

    match user {
        Some(user) => Some(UserDto {
            id: user.id,
            email: user.email,
            wallet: caller.to_text(),
        }),
        None => None,
    }
}

pub fn is_existed() -> bool {
    let caller = ic_cdk::api::caller();
    let user_wallet_repository = repositories::user_wallet::UserWalletRepository::new();
    user_wallet_repository.get(&caller.to_string()).is_some()
}
