use ic_cdk::query;

use crate::core::action::types::{ActionDto, TransactionDto};
use crate::core::guard::is_not_admin;
use crate::core::link::types::LinkDto;
use crate::core::CanisterError;
use crate::services::action::ActionService;
use crate::services::link::v2::LinkService;
use crate::services::transaction::TransactionService;
use crate::utils::runtime::RealIcEnvironment;

#[query(guard = "is_not_admin")]
pub async fn admin_get_transaction(
    transaction_id: String,
) -> Result<TransactionDto, CanisterError> {
    let tx_service: TransactionService<RealIcEnvironment> = TransactionService::get_instance();

    let tx = tx_service.get_tx_by_id(&transaction_id.to_string())?;

    let dto = TransactionDto::from(tx);
    Ok(dto)
}

#[query(guard = "is_not_admin")]
pub async fn admin_get_intent(action_id: String) -> Result<ActionDto, CanisterError> {
    let action_service: ActionService<RealIcEnvironment> = ActionService::get_instance();

    let data = action_service
        .get_action_data(action_id.to_string())
        .map_err(|e| {
            CanisterError::ValidationErrors(format!("Failed to get action data: {}", e))
        })?;

    Ok(ActionDto::from_with_tx(
        data.action,
        data.intents,
        data.intent_txs,
    ))
}

#[query(guard = "is_not_admin")]
pub async fn admin_get_link(link_id: String) -> Result<LinkDto, CanisterError> {
    let link_service: LinkService<RealIcEnvironment> = LinkService::get_instance();

    let link = link_service
        .get_link_by_id(link_id)
        .map_err(|e| CanisterError::ValidationErrors(format!("Failed to get link: {}", e)))?;

    Ok(LinkDto::from(link))
}
