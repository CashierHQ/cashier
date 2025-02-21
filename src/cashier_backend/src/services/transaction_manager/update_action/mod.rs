use cashier_types::{FromCallType, Transaction, TransactionState};

use crate::{
    core::action::types::ActionDto, services::transaction_manager::action::ActionService,
    types::icrc_112_transaction::Icrc112Requests,
};

use super::{
    manual_check_status::manual_check_status,
    transaction::{self, update_tx_state::update_tx_state},
};

pub mod execute_tx;

#[derive(Debug, Clone)]
pub struct UpdateActionArgs {
    pub action_id: String,
    pub link_id: String,
    pub external: bool,
}

pub async fn update_action(
    action_id: String,
    link_id: String,
    external: bool,
) -> Result<ActionDto, String> {
    let args = UpdateActionArgs {
        action_id: action_id.clone(),
        link_id,
        external,
    };

    let request = update_action_with_args(args).await?;

    let action_service = ActionService::new();

    let resp = action_service.get(action_id).unwrap();

    Ok(ActionDto::build(
        resp.action,
        resp.intents,
        resp.intent_txs,
        request,
    ))
}

async fn update_action_with_args(
    args: UpdateActionArgs,
) -> Result<Option<Icrc112Requests>, String> {
    //Step #1: manual status check

    let action_service = ActionService::new();

    let action_resp = action_service
        .get(args.action_id.clone())
        .ok_or_else(|| "not found")?;

    let txs = action_service.flatten_tx_hashmap(&action_resp.intent_txs);

    // manually check the status of the tx of the action
    // update status to whaterver is returned by the manual check
    for mut tx in txs.clone() {
        let new_state = manual_check_status(&tx).await?;
        if tx.state == new_state.clone() {
            continue;
        }
        update_tx_state(&mut tx, new_state)?;
    }

    // If external = false, do not run step 2,3,4 for from_call_type == wallet
    // get newest updated

    //Step #2 : Check which txs are eligible to execute - based on dependency
    let all_txs = match action_service.get(args.action_id.clone()) {
        Some(action) => action_service.flatten_tx_hashmap(&action.intent_txs),
        None => vec![],
    };

    let eligible_txs = all_txs
        .iter()
        .filter(|tx| {
            let mut eligible = true;

            if args.external {
                if tx.from_call_type == FromCallType::Wallet {
                    eligible = false;
                }
            }

            // success txs - ignores
            // processing txs - ignores
            if tx.state == TransactionState::Success || tx.state == TransactionState::Processing {
                eligible = false;
            }

            eligible
        })
        .collect::<Vec<&Transaction>>();

    // for tx in eligible_txs.clone() {
    //     let has_dep = has_dependency::has_dependency(tx, &tx_map);
    // }

    // Step #3 Construct executable tx for the tx that are eligible to execute
    let icrc_112_requests: Icrc112Requests =
        transaction::icrc_112::create(args.link_id.clone(), args.action_id.clone(), &eligible_txs);

    //Step #4 Actually execute the tx that is elibile
    // for client tx set to processing
    for tx in eligible_txs.clone() {
        execute_tx::execute_tx(&mut tx.clone())?;
    }

    // TODO: implement this
    // for backend tx execute the tx

    if icrc_112_requests.len() == 0 {
        return Ok(None);
    }
    return Ok(Some(icrc_112_requests));
}
