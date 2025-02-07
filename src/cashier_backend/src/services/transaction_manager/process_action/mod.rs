use crate::services;

use super::{
    action::{self, flatten_tx_hashmap::flatten_tx_hashmap},
    manual_check_status::manual_check_status,
};

pub struct ProcessActionArgs {
    pub action_id: String,
    pub options: Option<ProcessActionOptions>,
}

pub struct ProcessActionOptions {
    pub skip_manual_check_status: bool,
}

pub async fn process_action(action_id: String) -> Result<(), String> {
    let args = ProcessActionArgs {
        action_id,
        options: None,
    };

    process_action_with_args(args).await
}

pub async fn process_action_with_args(args: ProcessActionArgs) -> Result<(), String> {
    let mut skip_manual_check_status = false;

    if args.options.is_some() {
        let options = args.options.unwrap();
        skip_manual_check_status = options.skip_manual_check_status;
    }

    if !skip_manual_check_status {
        let resp = action::get(args.action_id).ok_or_else(|| "action not found")?;

        let txs = flatten_tx_hashmap(&resp.intent_txs);

        for tx in txs {
            let state = manual_check_status(tx.id.clone()).await?;

            if state.is_none() {
                continue;
            } else {
                services::transaction_manager::update_tx_state::update_tx_state(
                    tx.id,
                    state.unwrap(),
                )
                .map_err(|e| format!("update_tx_state failed: {}", e))?;
            }
        }
    }

    //created or failed txs
    //call HasDependency for each tx and if returns false, the tx is eligible to be executed

    return Ok(());
}
