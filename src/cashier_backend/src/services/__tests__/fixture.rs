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

use crate::{
    services::{
        __tests__::tests::MockIcEnvironment,
        action::ActionService,
        adapter::{
            ic::{action::IcActionAdapter, intent::IcIntentAdapter},
            IntentAdapterImpl,
        },
        transaction::TransactionService,
    },
    utils::icrc::IcrcService,
};

/// A test fixture for transaction manager tests that standardizes test setup
pub struct TransactionManagerTestFixture {}

impl TransactionManagerTestFixture {
    /// Create a new fixture with mocked services
    pub fn setup() -> (
        TransactionService<MockIcEnvironment>,
        ActionService<MockIcEnvironment>,
        MockIcEnvironment,
        IcrcService,
        IntentAdapterImpl<MockIcEnvironment>,
    ) {
        let transaction_service = TransactionService::faux();
        let action_service = ActionService::faux();
        let ic_env = MockIcEnvironment::faux();
        let icrc_service = IcrcService::faux();
        let ic_intent_adapter = IntentAdapterImpl::faux();

        (
            transaction_service,
            action_service,
            ic_env,
            icrc_service,
            ic_intent_adapter,
        )
    }
}
