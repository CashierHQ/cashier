use candid::Principal;
use ic_cdk::update;

use crate::error;
use crate::services::{self};

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

    match services::claim::claim_nft(link_id, recipient).await {
        Ok(_) => Ok(()),
        Err(e) => {
            error!("Error claiming NFT: {}", e);
            Err(e)
        }
    }
}
