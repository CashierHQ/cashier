use crate::{
    dto::action::{ActionDto, Icrc112Requests, IntentDto, TransactionDto},
    repository::{action::v1::Action, intent::v1::Intent, transaction::v1::Transaction},
};
use candid::{Nat, Principal};
use std::collections::HashMap;

/// Result of calculating transfer amounts grouped by direction
/// Groups amounts by intent task type for easy amount_available calculation
#[derive(Debug, Clone, Default)]
pub struct TransferAmountsResult {
    /// Amounts transferred FROM wallet TO link (per asset)
    /// Used by: CreateLink, Send actions
    pub wallet_to_link: HashMap<Principal, Nat>,

    /// Amounts transferred FROM link TO wallet (per asset)
    /// Used by: Receive, Withdraw actions
    pub link_to_wallet: HashMap<Principal, Nat>,
}

impl TransferAmountsResult {
    pub fn new() -> Self {
        Self::default()
    }

    /// Add amount for wallet-to-link transfer
    pub fn add_wallet_to_link(&mut self, asset: Principal, amount: Nat) {
        self.wallet_to_link
            .entry(asset)
            .and_modify(|a| *a += amount.clone())
            .or_insert(amount);
    }

    /// Add amount for link-to-wallet transfer
    pub fn add_link_to_wallet(&mut self, asset: Principal, amount: Nat) {
        self.link_to_wallet
            .entry(asset)
            .and_modify(|a| *a += amount.clone())
            .or_insert(amount);
    }

    /// Get wallet-to-link amount for asset (0 if none)
    pub fn get_wallet_to_link(&self, asset: &Principal) -> Nat {
        self.wallet_to_link
            .get(asset)
            .cloned()
            .unwrap_or(Nat::from(0u64))
    }

    /// Get link-to-wallet amount for asset (0 if none)
    pub fn get_link_to_wallet(&self, asset: &Principal) -> Nat {
        self.link_to_wallet
            .get(asset)
            .cloned()
            .unwrap_or(Nat::from(0u64))
    }

    /// Check if any transfers occurred
    pub fn is_empty(&self) -> bool {
        self.wallet_to_link.is_empty() && self.link_to_wallet.is_empty()
    }
}

#[derive(Debug, Clone)]
pub struct CreateActionResult {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
    pub icrc112_requests: Option<Icrc112Requests>,
}

impl From<CreateActionResult> for ActionDto {
    fn from(create_action_result: CreateActionResult) -> Self {
        let intents_dto: Vec<IntentDto> = create_action_result
            .intents
            .into_iter()
            .map(|intent| {
                // let transactions = intent_hashmap.get(&intent.id).unwrap();
                let intent_id = intent.id.clone();
                let mut intent_dto = IntentDto::from(intent);
                let txs = create_action_result
                    .intent_txs_map
                    .get(&intent_id)
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .map(TransactionDto::from)
                    .collect();

                intent_dto.transactions = txs;
                intent_dto
            })
            .collect();

        ActionDto {
            id: create_action_result.action.id,
            r#type: create_action_result.action.r#type,
            state: create_action_result.action.state,
            creator: create_action_result.action.creator,
            intents: intents_dto,
            icrc_112_requests: create_action_result.icrc112_requests,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ProcessActionResult {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
    pub icrc112_requests: Option<Icrc112Requests>,
    pub is_success: bool,
    pub errors: Vec<String>,
    /// Transfer amounts grouped by direction (wallet_to_link vs link_to_wallet)
    /// Calculated from successful transactions based on intent task type
    pub transfer_amounts: TransferAmountsResult,
}

impl From<ProcessActionResult> for ActionDto {
    fn from(process_action_result: ProcessActionResult) -> Self {
        ActionDto {
            id: process_action_result.action.id,
            r#type: process_action_result.action.r#type,
            state: process_action_result.action.state,
            creator: process_action_result.action.creator,
            intents: process_action_result
                .intents
                .into_iter()
                .map(IntentDto::from)
                .collect(),
            icrc_112_requests: process_action_result.icrc112_requests,
        }
    }
}
