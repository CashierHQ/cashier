use super::TransactionBuilder;
use crate::core::link::types::UpdateActionInput;
use crate::types::icrc_112_transaction::Icrc112Request;
use base64::engine::general_purpose;
use base64::Engine;
use candid::Encode;

pub struct UpdateActionBuilder {
    pub link_id: String,
    pub action_id: String,
}

impl TransactionBuilder for UpdateActionBuilder {
    fn build(&self) -> Icrc112Request {
        let input = UpdateActionInput {
            link_id: self.link_id.clone(),
            action_id: self.action_id.clone(),
            external: true,
        };

        let canister_id = ic_cdk::id().to_string();
        let method = "update_action".to_string();
        let arg = general_purpose::STANDARD.encode(Encode!(&input).unwrap());

        return Icrc112Request {
            canister_id,
            method,
            arg,
            nonce: Some(self.action_id.clone()),
        };
    }
}
