use crate::{
    services::adapter::IntentAdapterImpl,
    utils::helper::{convert_nat_to_u64, to_subaccount},
};
use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        asset_info::AssetInfo,
        common::{Asset, Chain, Wallet},
        intent::v2::{Intent, IntentState, IntentTask, IntentType},
        transaction::v2::Transaction,
    },
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

pub struct TransferLinkToWalletIntent {
    pub intent: Intent,
    pub transactions: Vec<Transaction>,
}

impl TransferLinkToWalletIntent {
    pub fn new(intent: Intent, transactions: Vec<Transaction>) -> Self {
        Self {
            intent,
            transactions,
        }
    }

    pub fn create(
        label: String,
        asset: Asset,
        sending_amount: u64,
        receiver_id: Principal,
        link_account: Account,
        created_at_ts: u64,
    ) -> Result<Self, CanisterError> {
        let mut intent = Intent {
            id: Uuid::new_v4().to_string(),
            label,
            state: IntentState::Created,
            created_at: created_at_ts,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToLink,
            r#type: IntentType::default_transfer(),
        };

        // enrich the intent with asset info
        let to_wallet = Wallet::new(receiver_id);
        let from_wallet: Wallet = link_account.into();

        let mut transfer_data = intent.r#type.as_transfer().ok_or_else(|| {
            CanisterError::HandleLogicError("Transfer data not found".to_string())
        })?;
        transfer_data.amount = Nat::from(sending_amount);
        transfer_data.asset = asset;
        transfer_data.from = from_wallet;
        transfer_data.to = to_wallet;
        intent.r#type = IntentType::Transfer(transfer_data);

        // generate the blockchain transactions
        let intent_adapter = IntentAdapterImpl::new();
        let transactions =
            intent_adapter.intent_to_transactions(&intent.chain, created_at_ts, &intent)?;

        Ok(Self {
            intent,
            transactions,
        })
    }
}
