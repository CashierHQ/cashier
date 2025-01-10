use candid::Principal;

use crate::{repositories::link_store, types::link::link_state::LinkState};

use super::ext::{
    cashier_nft::mint_nft,
    types::{MintNftArgs, NftAssetsInfo},
};

pub async fn claim_nft(id: String, _caller: Principal) -> Result<(), String> {
    let link = link_store::get(&id);

    if link.is_none() {
        return Err("Link not found".to_string());
    }

    let link = link.unwrap();
    if link.state.unwrap() != LinkState::Active.to_string() {
        return Err("Link is not active".to_string());
    }

    // TODO: Check if user has already claimed the link

    let url = link.link_image_url.unwrap();
    let mine = "image/jpeg".to_string();
    let purpose = "icrc97:image".to_string();

    let assets = vec![NftAssetsInfo { url, mine, purpose }];

    let mint_nft_args = MintNftArgs {
        name: link.title.unwrap(),
        description: link.description.unwrap(),
        assets: assets,
    };

    let _result = match mint_nft(mint_nft_args).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };

    //TODO: Add caller to claimed list

    Ok(())
}
