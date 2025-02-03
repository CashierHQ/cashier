use crate::services::transaction_manager::build_tx::BuildTxResp;
use crate::types::consent_messsage::ConsentType;
use base64::engine::general_purpose;
use base64::Engine;
use candid::Encode;
use uuid::Uuid;

use super::TransactionBuilder;

pub struct UpdateIntentBuilder {
    pub link_id: String,
    pub intent_id: String,
}

impl TransactionBuilder for UpdateIntentBuilder {
    fn build(&self) -> BuildTxResp {
        let id: Uuid = Uuid::new_v4();

        let input = UpdateIntentInput {
            link_id: self.link_id.clone(),
            intent_id: self.intent_id.clone(),
            icrcx_responses: None,
        };

        let canister_id = ic_cdk::id().to_string();
        let method = "update_intent".to_string();
        let arg = general_purpose::STANDARD.encode(Encode!(&input).unwrap());
        let state = TransactionState::Created.to_string();

        let transaction = Transaction::new(id.to_string(), canister_id, method, arg, state);

        BuildTxResp {
            transaction,
            consent: ConsentType::None,
        }
    }
}
