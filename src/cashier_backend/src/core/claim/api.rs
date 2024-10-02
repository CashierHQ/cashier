use ic_cdk::update;

use crate::{
    core::guard::is_not_anonymous,
    services::{self},
    utils::logger,
};

#[update(guard = "is_not_anonymous")]
async fn claim_nft(id: String) -> Result<(), String> {
    let caller = ic_cdk::api::caller();

    match services::claim::claim_nft(id, caller).await {
        Ok(_) => Ok(()),
        Err(e) => {
            logger::error(&format!("Error claiming NFT: {}", e));
            Err(e)
        }
    }
}
