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

use candid::Principal;

static ANONYMOUS: Principal = Principal::anonymous();

pub fn is_not_anonymous() -> Result<(), String> {
    let caller = ic_cdk::caller();
    assert!(caller != ANONYMOUS, "Anonymous caller is not allowed");
    Ok(())
}

pub fn is_not_admin() -> Result<(), String> {
    let caller = ic_cdk::caller();
    assert!(caller != ANONYMOUS, "Anonymous caller is not allowed");
    let msg = format!("Caller is not admin");
    assert!(
        caller
            == Principal::from_text(
                "rvc37-afcl7-ag74c-jyr6z-zoprx-finqf-px5k5-dqpaa-jgmzy-jgmht-dqe"
            )
            .unwrap(),
        "{}",
        msg
    );
    Ok(())
}
