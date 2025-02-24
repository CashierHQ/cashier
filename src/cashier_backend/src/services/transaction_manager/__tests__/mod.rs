#[cfg(test)]
pub mod action;
#[cfg(test)]
pub mod manual_check_status;
#[cfg(test)]
pub mod transaction;

#[cfg(test)]
pub mod has_dependency;

#[cfg(test)]
pub mod tests {

    use std::collections::HashMap;

    use async_trait::async_trait;
    use cashier_types::{
        Action, ActionIntent, ActionState, ActionType, Asset, Chain, FromCallType, IcTransaction,
        Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent, IntentState, IntentTask,
        IntentTransaction, IntentType, Protocol, Transaction, TransactionState, TransferFromIntent,
        TransferIntent, Wallet,
    };

    use candid::Principal;
    #[cfg(test)]
    use rand::Rng;
    use uuid::Uuid;

    use crate::{types::transaction_manager::ActionResp, utils::runtime::IcEnvironment};

    pub const TX_TIMEOUT: u64 = 120_000_000_000; // 1 minute in nanoseconds

    pub const ONE_HOUR_IN_NANOSECONDS: u64 = 3600_000_000_000;

    #[cfg(test)]
    pub fn generate_random_principal() -> Principal {
        let mut rng = rand::thread_rng();
        let random_bytes: Vec<u8> = (0..29).map(|_| rng.gen()).collect();
        Principal::from_slice(&random_bytes)
    }

    #[cfg(test)]
    pub fn generate_token_address() -> Principal {
        let mut rng = rand::thread_rng();
        let assets = vec![
            "zfcdd-tqaaa-aaaaq-aaaga-cai",
            "ryjl3-tyaaa-aaaaa-aaaba-cai",
            "tyyy3-4aaaa-aaaaq-aab7a-cai",
            "o7oak-iyaaa-aaaaq-aadzq-cai",
        ];

        let random_index = rng.gen_range(0..assets.len());
        Principal::from_text(assets[random_index]).unwrap()
    }

    #[cfg(test)]
    pub fn generate_amount() -> u64 {
        let mut rng = rand::thread_rng();
        rng.gen_range(1_0000_00..1000_0000_0000)
    }

    #[cfg(test)]
    pub fn generate_timestamp() -> u64 {
        let mut rng = rand::thread_rng();
        rng.gen_range(1720154181000000000..1740154204000000000)
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
                amount: generate_amount(),
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
                amount: generate_amount(),
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

    impl Dummy<Transaction> for Transaction {
        fn dummy<R: Rng>(_: &mut R) -> Self {
            let rand = &mut rand::thread_rng();
            Transaction {
                id: Uuid::new_v4().to_string(),
                created_at: generate_timestamp(),
                state: TransactionState::dummy(rand),
                dependency: None,
                group: None,
                from_call_type: FromCallType::dummy(rand),
                protocol: Protocol::dummy(rand),
                start_ts: Some(generate_timestamp()),
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
        fn dummy<R: Rng>(_: &mut R) -> Self {
            Icrc1Transfer {
                from: Wallet {
                    address: generate_random_principal().to_text(),
                    chain: Chain::IC,
                },
                to: Wallet {
                    address: generate_random_principal().to_text(),
                    chain: Chain::IC,
                },
                asset: Asset {
                    address: generate_token_address().to_text(),
                    chain: Chain::IC,
                },
                amount: generate_amount(),
                memo: None,
                ts: Some(generate_timestamp()),
            }
        }
    }

    impl Dummy<Icrc2Approve> for Icrc2Approve {
        fn dummy<R: Rng>(_: &mut R) -> Self {
            Icrc2Approve {
                from: Wallet {
                    address: generate_random_principal().to_text(),
                    chain: Chain::IC,
                },
                spender: Wallet {
                    address: generate_random_principal().to_text(),
                    chain: Chain::IC,
                },
                asset: Asset {
                    address: generate_token_address().to_text(),
                    chain: Chain::IC,
                },
                amount: generate_amount(),
            }
        }
    }

    impl Dummy<Icrc2TransferFrom> for Icrc2TransferFrom {
        fn dummy<R: Rng>(_: &mut R) -> Self {
            Icrc2TransferFrom {
                from: Wallet {
                    address: generate_random_principal().to_text(),
                    chain: Chain::IC,
                },
                to: Wallet {
                    address: generate_random_principal().to_text(),
                    chain: Chain::IC,
                },
                spender: Wallet {
                    address: generate_random_principal().to_text(),
                    chain: Chain::IC,
                },
                asset: Asset {
                    address: generate_token_address().to_text(),
                    chain: Chain::IC,
                },
                amount: generate_amount(),
                memo: None,
                ts: Some(generate_timestamp()),
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
                id: Uuid::new_v4().to_string(),
                r#type: ActionType::dummy(rng),
                state: ActionState::dummy(rng),
                creator: generate_random_principal().to_text(),
            }
        }
    }

    pub fn create_dummy_intent(state: IntentState) -> Intent {
        let mut rng = rand::thread_rng();
        Intent {
            id: Uuid::new_v4().to_string(),
            state,
            created_at: 1,
            dependency: vec![],
            chain: Chain::dummy(&mut rng),
            task: IntentTask::dummy(&mut rng),
            r#type: IntentType::dummy(&mut rng),
        }
    }

    pub fn create_dummy_transaction(state: TransactionState) -> Transaction {
        let mut rng = rand::thread_rng();
        Transaction {
            id: Uuid::new_v4().to_string(),
            created_at: generate_timestamp(),
            state,
            dependency: None,
            group: None,
            from_call_type: FromCallType::dummy(&mut rng),
            protocol: Protocol::dummy(&mut rng),
            start_ts: None,
        }
    }

    pub fn create_dummy_tx_protocol(state: TransactionState, protocol_str: &str) -> Transaction {
        let mut rng = rand::thread_rng();

        let protocol = match protocol_str {
            "icrc1_transfer" => {
                Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer::dummy(&mut rng)))
            }
            "icrc2_approve" => {
                Protocol::IC(IcTransaction::Icrc2Approve(Icrc2Approve::dummy(&mut rng)))
            }
            "icrc2_transfer_from" => Protocol::IC(IcTransaction::Icrc2TransferFrom(
                Icrc2TransferFrom::dummy(&mut rng),
            )),
            _ => Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer::dummy(&mut rng))),
        };

        Transaction {
            id: Uuid::new_v4().to_string(),
            created_at: generate_timestamp(),
            state,
            dependency: None,
            group: None,
            from_call_type: FromCallType::dummy(&mut rng),
            protocol: protocol,
            start_ts: None,
        }
    }

    pub fn create_dummy_action(state: ActionState) -> Action {
        let mut rng = rand::thread_rng();
        Action {
            id: Uuid::new_v4().to_string(),
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

    pub fn merge_hashmaps<K, V>(mut map1: HashMap<K, V>, map2: HashMap<K, V>) -> HashMap<K, V>
    where
        K: std::cmp::Eq + std::hash::Hash,
    {
        for (key, value) in map2 {
            map1.insert(key, value);
        }
        map1
    }

    #[faux::create]
    pub struct MockIcEnvironment {
        pub caller: Principal,
        pub canister_id: Principal,
        pub time: u64,
    }

    #[faux::methods]
    impl MockIcEnvironment {
        pub fn new_with_time(ts: u64) -> Self {
            Self {
                caller: generate_random_principal(),
                canister_id: generate_random_principal(),
                time: ts,
            }
        }
    }

    #[async_trait]
    #[faux::methods]
    impl IcEnvironment for MockIcEnvironment {
        fn new() -> Self {
            Self {
                caller: generate_random_principal(),
                canister_id: generate_random_principal(),
                time: generate_timestamp(),
            }
        }
        fn caller(&self) -> Principal {
            self.caller
        }
        fn canister_id(&self) -> Principal {
            self.canister_id
        }
        fn time(&self) -> u64 {
            self.time
        }
        fn println(&self, _message: &str) {}
    }
}
