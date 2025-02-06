use candid::Principal;
use cashier_types::{Action, Link};

use crate::{
    core::action::types::ActionDto,
    repositories,
    services::{
        link::is_link_creator,
        transaction_manager::{self, validate::validate_balance_with_asset_info},
    },
};

use super::ExecuteAction;

pub struct ConfirmHandler {
    pub link_id: String,
    pub action_id: String,
}

impl ExecuteAction for ConfirmHandler {
    fn execute(&self) -> Result<ActionDto, String> {
        let link = repositories::link::get(&self.link_id)
            .ok_or_else(|| "[execute_action] Link not found".to_string())?;

        let action = repositories::action::get(self.action_id.clone())
            .ok_or_else(|| "[execute_action] Action not found".to_string())?;

        let caller = ic_cdk::api::caller();

        let user_wallet = match repositories::user_wallet::get(&caller.to_text()) {
            Some(id) => id,
            None => return Err("[execute_action] User not found".to_string()),
        };

        if action.creator != user_wallet.user_id {
            return Err("[execute_action] Caller is not action creator".to_string());
        }

        return Err("Not implemented".to_string());
    }
}

impl ConfirmHandler {
    async fn handle_confirm_create_link(
        &self,
        link: &Link,
        action: &Action,
        caller: &Principal,
    ) -> Result<ActionDto, String> {
        match is_link_creator(caller.to_text(), &link.id) {
            true => (),
            false => {
                return Err("[confirm_intent] Caller is not the creator of the link".to_string());
            }
        }

        // validate balance enough
        validate_balance_with_asset_info(link, caller).await?;

        // set all to processing
        let get_resp = transaction_manager::action::get(action.id.clone());

        if get_resp.is_none() {
            return Err("[confirm_intent] Action not found".to_string());
        }

        let get_resp = get_resp.unwrap();

        let flatten_tx = get_resp.transactions.values().flatten().collect::<Vec<_>>();

        return Err("Not implemented".to_string());
    }
}
