#[cfg(test)]
pub mod transaction_manager;

#[cfg(test)]
pub mod tests {

    use std::{collections::HashMap, future::Future, time::Duration};

    use cashier_types::{
        Action, ActionIntent, ActionState, ActionType, Asset, AssetInfo, Chain, FromCallType,
        IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent, IntentState,
        IntentTask, IntentTransaction, IntentType, Link, LinkState, LinkType, Protocol,
        Transaction, TransactionState, TransferData, TransferFromData, Wallet,
    };

    use candid::Principal;
    use ic_cdk_timers::TimerId;
    #[cfg(test)]
    use rand::Rng;
    use uuid::Uuid;

    use crate::{
        types::icrc_112_transaction::{Icrc112Request, Icrc112Requests},
        utils::runtime::IcEnvironment,
    };

    pub const TX_TIMEOUT: u64 = 300_000_000_000; // 5 minute in nanoseconds

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

    pub fn create_dummy_link() -> Link {
        let asset_info = AssetInfo {
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
            chain: Chain::IC,
            total_amount: 100,
            amount_per_claim: 100,
            total_claim: 0,
            label: "dummy".to_string(),
        };

        Link {
            id: Uuid::new_v4().to_string(),
            state: LinkState::ChooseLinkType,
            title: Some("dummy link".to_string()),
            description: Some("dummy link".to_string()),
            link_type: Some(LinkType::TipLink),
            asset_info: Some(vec![asset_info]),
            template: None,
            creator: generate_random_principal().to_text(),
            create_at: generate_timestamp(),
            metadata: None,
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
                0 => IntentType::Transfer(TransferData::dummy(rng)),
                _ => IntentType::TransferFrom(TransferFromData::dummy(rng)),
            }
        }
    }

    impl Dummy<TransferData> for TransferData {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            TransferData {
                from: Wallet::dummy(rng),
                to: Wallet::dummy(rng),
                asset: Asset::dummy(rng),
                amount: generate_amount(),
            }
        }
    }

    impl Dummy<TransferFromData> for TransferFromData {
        fn dummy<R: Rng>(rng: &mut R) -> Self {
            TransferFromData {
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
                group: 1,
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
                link_id: Uuid::new_v4().to_string(),
            }
        }
    }

    pub fn convert_txs_to_dummy_icrc_112_request(txs: Vec<Transaction>) -> Icrc112Requests {
        let mut icrc_112_requests: Icrc112Requests = vec![];

        for tx in txs {
            let icrc_112_request = convert_tx_to_dummy_icrc_112_request(&tx);
            icrc_112_requests.push(vec![icrc_112_request]);
        }

        return icrc_112_requests;
    }

    pub fn convert_tx_to_dummy_icrc_112_request(tx: &Transaction) -> Icrc112Request {
        return Icrc112Request {
            canister_id: "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
            method: "dummy".to_string(),
            arg: "dummy".to_string(),
            nonce: Some(tx.id.clone()),
        };
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
            label: "1001".to_string(),
        }
    }

    pub fn create_dummy_transaction(state: TransactionState) -> Transaction {
        let mut rng = rand::thread_rng();
        Transaction {
            id: Uuid::new_v4().to_string(),
            created_at: generate_timestamp(),
            state,
            dependency: None,
            group: 1,
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
            group: 1,
            from_call_type: FromCallType::dummy(&mut rng),
            protocol: protocol,
            start_ts: None,
        }
    }

    pub fn create_dummy_tx_protocol_for_tip_link(
        state: TransactionState,
        protocol_str: &str,
        expected_sender: &Wallet,
        expected_fee_walelt: &Wallet,
        expected_spender: &Wallet,
    ) -> Transaction {
        let mut rng = rand::thread_rng();

        let transfer_asset = Asset {
            address: generate_token_address().to_text(),
            chain: Chain::IC,
        };

        let fee_asset = Asset {
            address: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai")
                .unwrap()
                .to_text(),
            chain: Chain::IC,
        };

        let from_wallet = expected_sender;

        let to_wallet = expected_spender;

        let fee_wallet = expected_fee_walelt;

        let spender_wallet = expected_spender;

        let protocol = match protocol_str {
            "icrc1_transfer" => {
                let mut icrc1_transfer = Icrc1Transfer::dummy(&mut rng);
                icrc1_transfer.asset = transfer_asset;
                icrc1_transfer.from = from_wallet.clone();
                icrc1_transfer.to = to_wallet.clone();
                Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer))
            }
            "icrc2_approve" => {
                let mut icrc2_approve = Icrc2Approve::dummy(&mut rng);
                icrc2_approve.asset = fee_asset;
                icrc2_approve.from = from_wallet.clone();
                icrc2_approve.spender = spender_wallet.clone();
                Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve))
            }
            "icrc2_transfer_from" => {
                let mut icrc2_transfer_from = Icrc2TransferFrom::dummy(&mut rng);
                icrc2_transfer_from.asset = fee_asset;
                icrc2_transfer_from.from = from_wallet.clone();
                icrc2_transfer_from.to = fee_wallet.clone();
                icrc2_transfer_from.spender = spender_wallet.clone();

                Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from))
            }
            _ => Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer::dummy(&mut rng))),
        };

        let from_call_type = match protocol_str {
            "icrc1_transfer" => FromCallType::Wallet,
            "icrc2_approve" => FromCallType::Wallet,
            "icrc2_transfer_from" => FromCallType::Canister,
            _ => FromCallType::Wallet,
        };

        Transaction {
            id: Uuid::new_v4().to_string(),
            created_at: generate_timestamp(),
            state,
            dependency: None,
            group: 1,
            from_call_type,
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
            link_id: Uuid::new_v4().to_string(),
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
        pub time: u64,
    }

    impl Clone for MockIcEnvironment {
        fn clone(&self) -> Self {
            MockIcEnvironment::faux()
        }
    }

    #[faux::methods]
    impl MockIcEnvironment {
        pub fn new_with_time(ts: u64) -> Self {
            Self {
                caller: generate_random_principal(),
                time: ts,
            }
        }
    }

    #[faux::methods]
    impl IcEnvironment for MockIcEnvironment {
        fn new() -> Self {
            Self {
                caller: generate_random_principal(),
                time: generate_timestamp(),
            }
        }
        fn caller(&self) -> Principal {
            self.caller
        }
        fn id(&self) -> Principal {
            Principal::from_text("jjio5-5aaaa-aaaam-adhaq-cai").unwrap()
        }
        fn time(&self) -> u64 {
            self.time
        }
        fn println(&self, _message: &str) {}

        fn spawn<F>(&self, _future: F)
        where
            F: Future<Output = ()> + 'static,
        {
            todo!()
        }

        fn set_timer(&self, _delay: Duration, _f: impl FnOnce() + 'static) -> TimerId {
            todo!();
        }
    }
}
