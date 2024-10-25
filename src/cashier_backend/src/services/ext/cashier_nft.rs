use crate::{
    constant::CASHIER_NFT_CANISTER_ID,
    types::{
        self,
        ext::cashier_nft::{Account, NftInput, SetNftItemRequest, SetNftResult},
    },
};
use candid::Principal;
use serde_bytes::ByteBuf;

use super::types::MintNftArgs;

pub async fn mint_nft(args: MintNftArgs, owner: Principal) -> Result<Vec<SetNftResult>, String> {
    let cashier_nft_pid = Principal::from_text(CASHIER_NFT_CANISTER_ID)
        .map_err(|e| format!("Error parsing cashier nft canister id: {:?}", e))?;

    let service = types::ext::cashier_nft::Service(cashier_nft_pid);

    let id = service.icrc_7_total_supply().await;
    let (next_id,) = id.map_err(|e| format!("Error getting total supply: {:?}", e))?;

    let ts = ic_cdk::api::time();
    let memo = ByteBuf::from("123");

    let nft_metadata = args.to_icrc97_metadata();
    let metadata = NftInput::Map(vec![("icrc97:metadata".to_string(), nft_metadata)]);

    let new_nft_record = SetNftItemRequest {
        token_id: next_id,
        owner: Some(Account {
            owner: owner,
            subaccount: None,
        }),
        metadata: metadata,
        memo: Some(memo),
        r#override: true,
        created_at_time: Some(ts),
    };

    match service.mint(vec![new_nft_record]).await {
        Ok((result,)) => {
            return Ok(result);
        }
        Err(e) => return Err(format!("Error minting NFT: {:?}", e)),
    };
}
