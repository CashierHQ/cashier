use fake::{Dummy, Fake, Faker, Rng};
use uuid::Uuid;

use crate::{
    Action, ActionIntent, ActionState, ActionType, Asset, Chain, FromCallType, IcTransaction,
    Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Intent, IntentState, IntentTask,
    IntentTransaction, IntentType, Protocol, Transaction, TransactionState, TransferFromIntent,
    TransferIntent, Wallet,
};

impl Dummy<Faker> for Chain {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=0) {
            0 => Chain::IC,
            _ => Chain::IC,
        }
    }
}

impl Dummy<Faker> for Asset {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, _: &mut R) -> Self {
        Asset {
            address: Faker.fake(),
            chain: Faker.fake(),
        }
    }
}

impl Dummy<Faker> for Wallet {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, _: &mut R) -> Self {
        Wallet {
            address: Faker.fake(),
            chain: Faker.fake(),
        }
    }
}

impl Dummy<Faker> for IntentState {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=3) {
            0 => IntentState::Created,
            1 => IntentState::Processing,
            2 => IntentState::Success,
            _ => IntentState::Fail,
        }
    }
}

impl Intent {
    pub fn create_dummy(state: IntentState) -> Self {
        Intent {
            id: Uuid::new_v4().to_string(),
            state,
            created_at: Faker.fake(),
            dependency: vec![Faker.fake(), Faker.fake()],
            chain: Faker.fake(),
            task: Faker.fake(),
            r#type: Faker.fake(),
        }
    }
}

impl Dummy<Faker> for IntentType {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=1) {
            0 => IntentType::Transfer(Faker.fake()),
            _ => IntentType::TransferFrom(Faker.fake()),
        }
    }
}

impl Dummy<Faker> for TransferIntent {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        TransferIntent {
            from: Faker.fake(),
            to: Faker.fake(),
            asset: Faker.fake(),
            amount: rng.random_range(1..1000),
        }
    }
}

impl Dummy<Faker> for TransferFromIntent {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        TransferFromIntent {
            from: Faker.fake(),
            to: Faker.fake(),
            spender: Faker.fake(),
            asset: Faker.fake(),
            amount: rng.random_range(1..1000),
        }
    }
}

impl Dummy<Faker> for IntentTask {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=1) {
            0 => IntentTask::TransferWalletToTreasury,
            _ => IntentTask::TransferWalletToLink,
        }
    }
}

impl Dummy<Faker> for IntentTransaction {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, _: &mut R) -> Self {
        IntentTransaction {
            intent_id: Faker.fake(),
            transaction_id: Faker.fake(),
        }
    }
}

impl Transaction {
    pub fn create_dummy(state: TransactionState) -> Transaction {
        Transaction {
            id: Uuid::new_v4().to_string(),
            created_at: Faker.fake(),
            state,
            dependency: None,
            group: None,
            from_call_type: Faker.fake(),
            protocol: Faker.fake(),
            start_ts: Some(Faker.fake()),
        }
    }
}

impl Dummy<Faker> for TransactionState {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=3) {
            0 => TransactionState::Created,
            1 => TransactionState::Processing,
            2 => TransactionState::Success,
            _ => TransactionState::Fail,
        }
    }
}

impl Dummy<Faker> for FromCallType {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=1) {
            0 => FromCallType::Wallet,
            _ => FromCallType::Wallet,
        }
    }
}

impl Dummy<Faker> for Protocol {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=1) {
            0 => Protocol::IC(Faker.fake()),
            _ => Protocol::IC(Faker.fake()),
        }
    }
}

impl Dummy<Faker> for Icrc1Transfer {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
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
            amount: rng.random_range(1..1000),
            memo: None,
            ts: Some(rng.random_range(1..1000000)),
        }
    }
}

impl Dummy<Faker> for Icrc2Approve {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
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
            amount: rng.random_range(1..1000),
        }
    }
}

impl Dummy<Faker> for Icrc2TransferFrom {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
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
            amount: rng.random_range(1..1000),
            memo: None,
            ts: Some(rng.random_range(1..1000000)),
        }
    }
}

impl Dummy<Faker> for IcTransaction {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=2) {
            0 => IcTransaction::Icrc1Transfer(Faker.fake()),
            1 => IcTransaction::Icrc2Approve(Faker.fake()),
            _ => IcTransaction::Icrc2TransferFrom(Faker.fake()),
        }
    }
}

impl Dummy<Faker> for ActionType {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=2) {
            0 => ActionType::CreateLink,
            1 => ActionType::Withdraw,
            _ => ActionType::Claim,
        }
    }
}

impl Dummy<Faker> for ActionState {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, rng: &mut R) -> Self {
        match rng.random_range(0..=3) {
            0 => ActionState::Created,
            1 => ActionState::Processing,
            2 => ActionState::Success,
            _ => ActionState::Fail,
        }
    }
}

impl Dummy<Faker> for Action {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, _rng: &mut R) -> Self {
        Action {
            id: Uuid::new_v4().to_string(),
            r#type: Faker.fake(),
            state: Faker.fake(),
            creator: Faker.fake(),
        }
    }
}

impl Dummy<Faker> for ActionIntent {
    fn dummy_with_rng<R: Rng + ?Sized>(_: &Faker, _: &mut R) -> Self {
        ActionIntent {
            action_id: Uuid::new_v4().to_string(),
            intent_id: Uuid::new_v4().to_string(),
        }
    }
}
