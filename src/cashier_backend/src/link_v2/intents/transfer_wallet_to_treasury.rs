use crate::constant::FEE_TREASURY_PRINCIPAL;
use crate::services::adapter::IntentAdapterImpl;
use candid::{Nat, Principal};
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::{Asset, Chain, Wallet},
        intent::v2::{Intent, IntentState, IntentTask, IntentType},
        transaction::v2::Transaction,
    },
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

pub struct TransferWalletToTreasuryIntent {
    pub intent: Intent,
    pub transactions: Vec<Transaction>,
}

impl TransferWalletToTreasuryIntent {
    pub fn new(intent: Intent, transactions: Vec<Transaction>) -> Self {
        Self {
            intent,
            transactions,
        }
    }

    pub fn create(
        label: String,
        asset: Asset,
        actual_amount: u64,
        approval_amount: u64,
        sender_id: Principal,
        spender_account: Account,
        created_at_ts: u64,
    ) -> Result<Self, CanisterError> {
        let mut intent = Intent {
            id: Uuid::new_v4().to_string(),
            label,
            state: IntentState::Created,
            created_at: created_at_ts,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::default_transfer_from(),
        };

        // enrich the intent with asset info
        let from_wallet = Wallet::new(sender_id);
        let to_wallet: Wallet = Account {
            owner: FEE_TREASURY_PRINCIPAL,
            subaccount: None,
        }
        .into();
        let spender_wallet: Wallet = spender_account.into();

        // TransferFrom case
        let mut transfer_from_data = intent.r#type.as_transfer_from().ok_or_else(|| {
            CanisterError::HandleLogicError("TransferFrom data not found".to_string())
        })?;
        transfer_from_data.amount = Nat::from(actual_amount);
        transfer_from_data.approve_amount = Some(Nat::from(approval_amount));
        transfer_from_data.actual_amount = Some(Nat::from(actual_amount));
        transfer_from_data.asset = asset;
        transfer_from_data.from = from_wallet;
        transfer_from_data.to = to_wallet;
        transfer_from_data.spender = spender_wallet;
        intent.r#type = IntentType::TransferFrom(transfer_from_data);

        // generate the blockchain transactions
        let intent_adapter = IntentAdapterImpl::new();
        let transactions =
            intent_adapter.intent_to_transactions(&intent.chain, created_at_ts, &intent)?;

        Ok(Self::new(intent, transactions))
    }
}
