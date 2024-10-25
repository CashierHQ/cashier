use candid::Principal;
use ic_cdk::update;
use ic_stable_structures::log;

use crate::{
    services::{self},
    utils::logger,
};

#[update]
async fn claim_nft(link_id: String, recipient_input: Option<String>) -> Result<(), String> {
    let recipient = match recipient_input {
        Some(recipient) => match Principal::from_text(&recipient) {
            Ok(recipient) => recipient,
            Err(e) => {
                return Err(format!("Invalid recipient: {}", e));
            }
        },
        None => ic_cdk::api::caller(),
    };
    logger::info(&format!("Claiming NFT for recipient: {}", recipient));

    match services::claim::claim_nft(link_id, recipient).await {
        Ok(_) => Ok(()),
        Err(e) => {
            logger::error(&format!("Error claiming NFT: {}", e));
            Err(e)
        }
    }
}
