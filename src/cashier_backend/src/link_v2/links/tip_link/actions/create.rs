use crate::link_v2::intents::{
    transfer_wallet_to_link::TransferWalletToLinkIntent,
    transfer_wallet_to_treasury::TransferWalletToTreasuryIntent,
};
use candid::Principal;
use cashier_backend_types::{
    constant::{INTENT_LABEL_LINK_CREATION_FEE, INTENT_LABEL_SEND_TIP_ASSET},
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        intent::v2::Intent,
        transaction::v2::Transaction,
    },
};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug)]
pub struct CreateAction {
    pub link_id: String,
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
}

impl CreateAction {
    pub fn new(
        link_id: String,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Self {
        Self {
            link_id,
            action,
            intents,
            intent_txs_map,
        }
    }

    pub fn create(
        link_id: String,
        creator: Principal,
        created_at_ts: u64,
    ) -> Result<Self, CanisterError> {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::CreateLink,
            link_id: link_id.clone(),
            creator,
            state: ActionState::Created,
        };

        let deposit_intent = TransferWalletToLinkIntent::create(
            action.id.clone(),
            INTENT_LABEL_SEND_TIP_ASSET.to_string(),
            created_at_ts,
        )?;
        let dintent_id = deposit_intent.intent.id.clone();

        let fee_intent = TransferWalletToTreasuryIntent::create(
            action.id.clone(),
            INTENT_LABEL_LINK_CREATION_FEE.to_string(),
            created_at_ts,
        )?;
        let fintent_id = fee_intent.intent.id.clone();

        let intents = vec![deposit_intent.intent, fee_intent.intent];

        let mut intent_txs_map = HashMap::<String, Vec<Transaction>>::new();
        intent_txs_map.insert(dintent_id, deposit_intent.transactions);
        intent_txs_map.insert(fintent_id, fee_intent.transactions);

        Ok(Self::new(link_id, action, intents, intent_txs_map))
    }
}
