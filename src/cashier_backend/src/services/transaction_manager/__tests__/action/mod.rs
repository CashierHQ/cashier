pub mod get_action_by_tx_id;
// pub mod roll_up_action_state;
// pub mod roll_up_intent_state;
pub mod roll_up_state;
#[cfg(test)]
mod tests {

    use std::collections::HashMap;

    use crate::repositories::{
        action::ActionRepository, action_intent::ActionIntentRepository, intent::IntentRepository,
        intent_transaction::IntentTransactionRepository, transaction::TransactionRepository,
    };

    use cashier_types::{
        Action, ActionIntent, ActionState, ActionType, Asset, Chain, FromCallType, IcTransaction,
        Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent, IntentState, IntentTask,
        IntentTransaction, IntentType, Protocol, Transaction, TransactionState, TransferFromIntent,
        TransferIntent, Wallet,
    };

    use candid::Principal;
    #[cfg(test)]
    use rand::Rng;

    #[cfg(test)]
    pub fn generate_random_principal() -> Principal {
        let mut rng = rand::thread_rng();
        let random_bytes: Vec<u8> = (0..29).map(|_| rng.gen()).collect();
        Principal::from_slice(&random_bytes)
    }

    #[cfg(test)]
    pub trait Dummy<T> {
        fn dummy<R: Rng>(rng: &mut R) -> T;
    }

    #[cfg(test)]
    impl Dummy<Chain> for Chain {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=0) {
                0 => Chain::IC,
                _ => Chain::IC,
            }
        }
    }

    #[cfg(test)]
    impl Dummy<Asset> for Asset {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            Asset {
                address: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai")
                    .unwrap()
                    .to_text(),
                chain: Chain::dummy(rng),
            }
        }
    }

    impl Dummy<Wallet> for Wallet {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            Wallet {
                address: generate_random_principal().to_text(),
                chain: Chain::dummy(rng),
            }
        }
    }

    impl Dummy<IntentState> for IntentState {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=3) {
                0 => IntentState::Created,
                1 => IntentState::Processing,
                2 => IntentState::Success,
                _ => IntentState::Fail,
            }
        }
    }

    impl Dummy<IntentType> for IntentType {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=1) {
                0 => IntentType::Transfer(TransferIntent::dummy(rng)),
                _ => IntentType::TransferFrom(TransferFromIntent::dummy(rng)),
            }
        }
    }

    impl Dummy<TransferIntent> for TransferIntent {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            TransferIntent {
                from: Wallet::dummy(rng),
                to: Wallet::dummy(rng),
                asset: Asset::dummy(rng),
                amount: rng.gen_range(1..1000),
            }
        }
    }

    impl Dummy<TransferFromIntent> for TransferFromIntent {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            TransferFromIntent {
                from: Wallet::dummy(rng),
                to: Wallet::dummy(rng),
                asset: Asset::dummy(rng),
                spender: Wallet::dummy(rng),
                amount: rng.gen_range(1..1000),
            }
        }
    }

    impl Dummy<IntentTask> for IntentTask {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=1) {
                0 => IntentTask::TransferWalletToTreasury,
                _ => IntentTask::TransferWalletToLink,
            }
        }
    }

    impl Dummy<IntentTransaction> for IntentTransaction {
        fn dummy<R: Rng>(_: &mut R) -> Self {
            IntentTransaction {
                intent_id: "11111".to_string(),
                transaction_id: "11111".to_string(),
            }
        }
    }

    impl Dummy<Transaction> for Transaction {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            let rand = &mut rand::thread_rng();
            Transaction {
                id: "11111".to_string(),
                created_at: rng.gen_range(1..1000000),
                state: TransactionState::dummy(rand),
                dependency: None,
                group: None,
                from_call_type: FromCallType::dummy(rand),
                protocol: Protocol::dummy(rand),
                start_ts: Some(rng.gen_range(1..1000000)),
            }
        }
    }

    impl Dummy<TransactionState> for TransactionState {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=3) {
                0 => TransactionState::Created,
                1 => TransactionState::Processing,
                2 => TransactionState::Success,
                _ => TransactionState::Fail,
            }
        }
    }

    impl Dummy<FromCallType> for FromCallType {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=1) {
                0 => FromCallType::Wallet,
                _ => FromCallType::Wallet,
            }
        }
    }

    impl Dummy<Protocol> for Protocol {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=1) {
                0 => Protocol::IC(IcTransaction::dummy(rng)),
                _ => Protocol::IC(IcTransaction::dummy(rng)),
            }
        }
    }

    impl Dummy<Icrc1Transfer> for Icrc1Transfer {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            Icrc1Transfer {
                from: Wallet {
                    address: "aaaaa-aa".to_string(),
                    chain: Chain::IC,
                },
                to: Wallet {
                    address: "bbbbb-bb".to_string(),
                    chain: Chain::IC,
                },
                asset: Asset {
                    address: "ICP".to_string(),
                    chain: Chain::IC,
                },
                amount: rng.gen_range(1..1000),
                memo: None,
                ts: Some(rng.gen_range(1..1000000)),
            }
        }
    }

    impl Dummy<Icrc2Approve> for Icrc2Approve {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            Icrc2Approve {
                from: Wallet {
                    address: "aaaaa-aa".to_string(),
                    chain: Chain::IC,
                },
                spender: Wallet {
                    address: "ccccc-cc".to_string(),
                    chain: Chain::IC,
                },
                asset: Asset {
                    address: "ICP".to_string(),
                    chain: Chain::IC,
                },
                amount: rng.gen_range(1..1000),
            }
        }
    }

    impl Dummy<Icrc2TransferFrom> for Icrc2TransferFrom {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            Icrc2TransferFrom {
                from: Wallet {
                    address: "aaaaa-aa".to_string(),
                    chain: Chain::IC,
                },
                to: Wallet {
                    address: "bbbbb-bb".to_string(),
                    chain: Chain::IC,
                },
                spender: Wallet {
                    address: "ccccc-cc".to_string(),
                    chain: Chain::IC,
                },
                asset: Asset {
                    address: "ICP".to_string(),
                    chain: Chain::IC,
                },
                amount: rng.gen_range(1..1000),
                memo: None,
                ts: Some(rng.gen_range(1..1000000)),
            }
        }
    }

    impl Dummy<IcTransaction> for IcTransaction {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=2) {
                0 => IcTransaction::Icrc1Transfer(Icrc1Transfer::dummy(rng)),
                1 => IcTransaction::Icrc2Approve(Icrc2Approve::dummy(rng)),
                _ => IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom::dummy(rng)),
            }
        }
    }

    impl Dummy<ActionType> for ActionType {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=2) {
                0 => ActionType::CreateLink,
                1 => ActionType::Withdraw,
                _ => ActionType::Claim,
            }
        }
    }

    impl Dummy<ActionState> for ActionState {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            match rng.gen_range(0..=3) {
                0 => ActionState::Created,
                1 => ActionState::Processing,
                2 => ActionState::Success,
                _ => ActionState::Fail,
            }
        }
    }

    impl Dummy<Action> for Action {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            Action {
                id: "11111".to_string(),
                r#type: ActionType::dummy(rng),
                state: ActionState::dummy(rng),
                creator: "aaaaa-aa".to_string(),
            }
        }
    }

    impl Dummy<ActionIntent> for ActionIntent {
        fn dummy<R: Rng>(_: &mut R) -> Self {
            ActionIntent {
                action_id: "11111".to_string(),
                intent_id: "11111".to_string(),
            }
        }
    }

    pub fn create_dummy_intent(state: IntentState) -> Intent {
        let mut rng = rand::thread_rng();
        Intent {
            id: "11111".to_string(),
            state,
            created_at: 1,
            dependency: vec!["1".to_string(), "2".to_string()],
            chain: Chain::dummy(&mut rng),
            task: IntentTask::dummy(&mut rng),
            r#type: IntentType::dummy(&mut rng),
        }
    }

    pub fn create_dummy_transaction(state: TransactionState) -> Transaction {
        let mut rng = rand::thread_rng();
        Transaction {
            id: "11111".to_string(),
            created_at: rng.gen_range(1..1000000),
            state,
            dependency: None,
            group: None,
            from_call_type: FromCallType::dummy(&mut rng),
            protocol: Protocol::dummy(&mut rng),
            start_ts: Some(rng.gen_range(1..1000000)),
        }
    }

    pub fn create_dummy_action(state: ActionState) -> Action {
        let mut rng = rand::thread_rng();
        Action {
            id: "11111".to_string(),
            r#type: ActionType::dummy(&mut rng),
            state,
            creator: generate_random_principal().to_text(),
        }
    }

    pub fn generate_action_intent(action: Action, intents: Vec<Intent>) -> Vec<ActionIntent> {
        intents
            .iter()
            .map(|intent| ActionIntent {
                action_id: action.id.clone(),
                intent_id: intent.id.clone(),
            })
            .collect()
    }

    pub fn generate_intents_and_txs(
        intent: Intent,
        txs: Vec<Transaction>,
    ) -> (
        HashMap<String, Vec<IntentTransaction>>,
        HashMap<String, Vec<Transaction>>,
        HashMap<String, Transaction>,
    ) {
        let mut intent_tx_relation: HashMap<String, Vec<IntentTransaction>> = HashMap::new();
        let mut intent_txs: HashMap<String, Vec<Transaction>> = HashMap::new();
        let mut txs_hash_map: HashMap<String, Transaction> = HashMap::new();

        intent_txs.insert(intent.id.clone(), txs.clone());

        let mut relation_array: Vec<IntentTransaction> = vec![];

        for tx in txs {
            let intent_transaction = IntentTransaction {
                intent_id: intent.id.clone(),
                transaction_id: tx.id.clone(),
            };

            relation_array.push(intent_transaction.clone());
            txs_hash_map.insert(tx.id.clone(), tx.clone());
        }

        intent_tx_relation.insert(intent.id.clone(), relation_array);

        return (intent_tx_relation, intent_txs, txs_hash_map);
    }

    fn merge_hashmaps<K, V>(mut map1: HashMap<K, V>, map2: HashMap<K, V>) -> HashMap<K, V>
    where
        K: std::cmp::Eq + std::hash::Hash,
    {
        for (key, value) in map2 {
            map1.insert(key, value);
        }
        map1
    }

    pub fn generate_action_success() -> (
        Action,
        Vec<Intent>,
        Vec<ActionIntent>,
        HashMap<String, Vec<Transaction>>,
        HashMap<String, Vec<IntentTransaction>>,
        HashMap<String, Transaction>,
    ) {
        let mut action = create_dummy_action(ActionState::Success);
        let mut intent1 = create_dummy_intent(IntentState::Success);
        let mut intent2 = create_dummy_intent(IntentState::Success);
        let mut tx1 = create_dummy_transaction(TransactionState::Success);
        let mut tx2 = create_dummy_transaction(TransactionState::Success);
        let mut tx3 = create_dummy_transaction(TransactionState::Success);
        let mut tx4 = create_dummy_transaction(TransactionState::Success);

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
        let mut action = create_dummy_action(ActionState::Processing);
        action.id = "action_11111".to_string();
        let mut intent1 = create_dummy_intent(IntentState::Processing);
        intent1.id = "intent_11111".to_string();
        let mut intent2 = create_dummy_intent(IntentState::Processing);
        intent2.id = "intent_22222".to_string();
        let mut tx1 = create_dummy_transaction(TransactionState::Created);
        let mut tx2 = create_dummy_transaction(TransactionState::Processing);
        let mut tx3 = create_dummy_transaction(TransactionState::Success);
        let mut tx4 = create_dummy_transaction(TransactionState::Processing);
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
    ) {
        let action_repository = ActionRepository::faux();
        let intent_repository = IntentRepository::faux();
        let action_intent_repository = ActionIntentRepository::faux();
        let transaction_repository = TransactionRepository::faux();
        let intent_transaction_repository = IntentTransactionRepository::faux();

        (
            action_repository,
            intent_repository,
            action_intent_repository,
            transaction_repository,
            intent_transaction_repository,
        )
    }
}

pub use tests::*;
