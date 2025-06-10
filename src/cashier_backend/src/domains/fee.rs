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

#[derive(Clone, Copy)]
// If you change this, make sure to update the fee in the frontend as well
// src/cashier_frontend/src/services/fee.constants.ts
pub enum Fee {
    // 1_0000_0000 = 1 ICP
    // 100_000 = 0.001 ICP
    // 10_000 = 0.0001 ICP
    // CreateTipLinkFeeIcp = 100_000,
    // TODO: change back to 0.001, this is for testing only
    // CreateTipLinkFeeIcp = 20_000,
    CreateTipLinkFeeIcp = 30_000,
}

impl Fee {
    pub fn as_u64(&self) -> u64 {
        *self as u64
    }
}
