use super::TransactionBuilder;
use crate::core::action::types::TriggerTransactionInput;
use crate::types::icrc_112_transaction::Icrc112Request;
use crate::utils::runtime::IcEnvironment;
use base64::engine::general_purpose;
use base64::Engine;
use candid::Encode;

pub struct TriggerTransactionBuilder<'a, E: IcEnvironment + Clone> {
    pub link_id: String,
    pub action_id: String,
    pub tx_id: String,
    pub ic_env: &'a E,
}

impl<'a, E: IcEnvironment + Clone> TransactionBuilder for TriggerTransactionBuilder<'a, E> {
    fn build(&self) -> Icrc112Request {
        let input = TriggerTransactionInput {
            link_id: self.link_id.clone(),
            action_id: self.action_id.clone(),
            transaction_id: self.tx_id.clone(),
        };

        let canister_id = self.ic_env.id();
        let method = "trigger_transaction".to_string();
        let arg = general_purpose::STANDARD.encode(Encode!(&input).unwrap());

        return Icrc112Request {
            canister_id: canister_id.to_text(),
            method,
            arg,
            nonce: Some(self.tx_id.clone()),
        };
    }
}
