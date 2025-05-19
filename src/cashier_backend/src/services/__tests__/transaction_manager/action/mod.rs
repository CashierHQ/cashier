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

pub mod get_action_by_tx_id;
pub mod roll_up_state;

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use cashier_types::{
        Action, ActionIntent, ActionState, Intent, IntentState, IntentTransaction, Transaction,
        TransactionState,
    };

    use crate::{
        repositories::{
            action::ActionRepository, action_intent::ActionIntentRepository,
            intent::IntentRepository, intent_transaction::IntentTransactionRepository,
            link::LinkRepository, link_action::LinkActionRepository,
            transaction::TransactionRepository, user_action::UserActionRepository,
            user_wallet::UserWalletRepository,
        },
        services::__tests__::tests::{
            create_dummy_action, create_dummy_intent, create_dummy_transaction,
            generate_action_intent, generate_intents_and_txs, merge_hashmaps,
        },
    };

    pub fn generate_action_success() -> (
        Action,
        Vec<Intent>,
        Vec<ActionIntent>,
        HashMap<String, Vec<Transaction>>,
        HashMap<String, Vec<IntentTransaction>>,
        HashMap<String, Transaction>,
    ) {
        let action = create_dummy_action(ActionState::Success);
        let intent1 = create_dummy_intent(IntentState::Success);
        let intent2 = create_dummy_intent(IntentState::Success);
        let tx1 = create_dummy_transaction(TransactionState::Success);
        let tx2 = create_dummy_transaction(TransactionState::Success);
        let tx3 = create_dummy_transaction(TransactionState::Success);
        let tx4 = create_dummy_transaction(TransactionState::Success);

        let intents: Vec<Intent> = vec![intent1.clone(), intent2.clone()];

        let action_intents = generate_action_intent(action.clone(), intents.clone());
        let (intent_tx_relation1, intent_txs1, txs_hash_map1) =
            generate_intents_and_txs(intent1, vec![tx1, tx2]);
        let (intent_tx_relation2, intent_txs2, txs_hash_map2) =
            generate_intents_and_txs(intent2, vec![tx3, tx4]);

        let intent_id_txs_hash_map = merge_hashmaps(intent_txs1, intent_txs2);
        let intent_transaction_hash_map = merge_hashmaps(intent_tx_relation1, intent_tx_relation2);
        let txs_hash_map = merge_hashmaps(txs_hash_map1, txs_hash_map2);

        (
            action,
            intents,
            action_intents,
            intent_id_txs_hash_map,
            intent_transaction_hash_map,
            txs_hash_map,
        )
    }

    pub fn generate_action_created() -> (
        Action,
        Vec<Intent>,
        Vec<ActionIntent>,
        HashMap<String, Vec<Transaction>>,
        HashMap<String, Vec<IntentTransaction>>,
        HashMap<String, Transaction>,
    ) {
        let mut action = create_dummy_action(ActionState::Created);
        action.id = "action_11111".to_string();
        let mut intent1 = create_dummy_intent(IntentState::Created);
        intent1.id = "intent_11111".to_string();
        let mut intent2 = create_dummy_intent(IntentState::Created);
        intent2.id = "intent_22222".to_string();
        let mut tx1 = create_dummy_transaction(TransactionState::Created);
        let mut tx2 = create_dummy_transaction(TransactionState::Created);
        let mut tx3 = create_dummy_transaction(TransactionState::Created);
        let mut tx4 = create_dummy_transaction(TransactionState::Created);
        tx1.id = "tx1".to_string();
        tx2.id = "tx2".to_string();
        tx3.id = "tx3".to_string();
        tx4.id = "tx4".to_string();

        let intents: Vec<Intent> = vec![intent1.clone(), intent2.clone()];

        let action_intents = generate_action_intent(action.clone(), intents.clone());
        let (intent_tx_relation1, intent_txs1, txs_hash_map1) =
            generate_intents_and_txs(intent1, vec![tx1, tx2]);
        let (intent_tx_relation2, intent_txs2, txs_hash_map2) =
            generate_intents_and_txs(intent2, vec![tx3, tx4]);

        let intent_id_txs_hash_map = merge_hashmaps(intent_txs1, intent_txs2);
        let intent_transaction_hash_map = merge_hashmaps(intent_tx_relation1, intent_tx_relation2);
        let txs_hash_map = merge_hashmaps(txs_hash_map1, txs_hash_map2);

        (
            action,
            intents,
            action_intents,
            intent_id_txs_hash_map,
            intent_transaction_hash_map,
            txs_hash_map,
        )
    }

    pub fn generate_action_with_for_processing() -> (
        Action,
        Vec<Intent>,
        Vec<ActionIntent>,
        HashMap<String, Vec<Transaction>>,
        HashMap<String, Vec<IntentTransaction>>,
        HashMap<String, Transaction>,
    ) {
        let action = create_dummy_action(ActionState::Processing);
        let intent1 = create_dummy_intent(IntentState::Processing);
        let intent2 = create_dummy_intent(IntentState::Processing);
        let tx1 = create_dummy_transaction(TransactionState::Success);
        let tx2 = create_dummy_transaction(TransactionState::Processing);
        let tx3 = create_dummy_transaction(TransactionState::Success);
        let tx4 = create_dummy_transaction(TransactionState::Processing);

        let intents: Vec<Intent> = vec![intent1.clone(), intent2.clone()];

        let action_intents = generate_action_intent(action.clone(), intents.clone());
        let (intent_tx_relation1, intent_txs1, txs_hash_map1) =
            generate_intents_and_txs(intent1, vec![tx1, tx2]);
        let (intent_tx_relation2, intent_txs2, txs_hash_map2) =
            generate_intents_and_txs(intent2, vec![tx3, tx4]);

        let intent_id_txs_hash_map = merge_hashmaps(intent_txs1, intent_txs2);
        let intent_transaction_hash_map = merge_hashmaps(intent_tx_relation1, intent_tx_relation2);
        let txs_hash_map = merge_hashmaps(txs_hash_map1, txs_hash_map2);

        (
            action,
            intents,
            action_intents,
            intent_id_txs_hash_map,
            intent_transaction_hash_map,
            txs_hash_map,
        )
    }

    pub fn generate_action_with_for_fail() -> (
        Action,
        Vec<Intent>,
        Vec<ActionIntent>,
        HashMap<String, Vec<Transaction>>,
        HashMap<String, Vec<IntentTransaction>>,
        HashMap<String, Transaction>,
    ) {
        let mut action = create_dummy_action(ActionState::Processing);
        let mut intent1 = create_dummy_intent(IntentState::Processing);
        let mut intent2 = create_dummy_intent(IntentState::Processing);
        let mut tx1 = create_dummy_transaction(TransactionState::Processing);
        let mut tx2 = create_dummy_transaction(TransactionState::Fail);
        let mut tx3 = create_dummy_transaction(TransactionState::Success);
        let mut tx4 = create_dummy_transaction(TransactionState::Processing);

        action.id = "action_11111".to_string();
        intent1.id = "intent_11111".to_string();
        intent2.id = "intent_22222".to_string();
        tx1.id = "tx1".to_string();
        tx2.id = "tx2".to_string();
        tx3.id = "tx3".to_string();
        tx4.id = "tx4".to_string();

        let intents: Vec<Intent> = vec![intent1.clone(), intent2.clone()];

        let action_intents = generate_action_intent(action.clone(), intents.clone());
        let (intent_tx_relation1, intent_txs1, txs_hash_map1) =
            generate_intents_and_txs(intent1, vec![tx1, tx2]);
        let (intent_tx_relation2, intent_txs2, txs_hash_map2) =
            generate_intents_and_txs(intent2, vec![tx3, tx4]);

        let intent_id_txs_hash_map = merge_hashmaps(intent_txs1, intent_txs2);
        let intent_transaction_hash_map = merge_hashmaps(intent_tx_relation1, intent_tx_relation2);
        let txs_hash_map = merge_hashmaps(txs_hash_map1, txs_hash_map2);

        (
            action,
            intents,
            action_intents,
            intent_id_txs_hash_map,
            intent_transaction_hash_map,
            txs_hash_map,
        )
    }

    pub fn setup_repositories() -> (
        ActionRepository,
        IntentRepository,
        ActionIntentRepository,
        TransactionRepository,
        IntentTransactionRepository,
        LinkRepository,
        LinkActionRepository,
        UserActionRepository,
        UserWalletRepository,
    ) {
        let action_repository = ActionRepository::faux();
        let intent_repository = IntentRepository::faux();
        let action_intent_repository = ActionIntentRepository::faux();
        let transaction_repository = TransactionRepository::faux();
        let intent_transaction_repository = IntentTransactionRepository::faux();
        let link_repository = LinkRepository::faux();
        let link_action_repository = LinkActionRepository::faux();
        let user_action_repository = UserActionRepository::faux();
        let user_wallet_repository = UserWalletRepository::faux();

        (
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
            link_repository,
            link_action_repository,
            user_action_repository,
            user_wallet_repository,
        )
    }
}

pub use tests::*;
