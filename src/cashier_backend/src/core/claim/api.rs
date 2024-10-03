use candid::Principal;
use ic_cdk::update;

use crate::{
    core::guard::is_not_anonymous,
    services::{self},
    utils::logger,
};

#[update(guard = "is_not_anonymous")]
async fn claim_nft(link_id: String, recipient_input: Option<String>) -> Result<(), String> {
    let recipient = recipient_input
        .ok_or_else(|| "Recipient is required".to_string())
        .and_then(|recipient| {
            Principal::from_text(&recipient).map_err(|e| format!("Invalid recipient: {}", e))
        })?;

    match services::claim::claim_nft(link_id, recipient).await {
        Ok(_) => Ok(()),
        Err(e) => {
            logger::error(&format!("Error claiming NFT: {}", e));
            Err(e)
        }
    }
}
