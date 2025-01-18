use crate::types::link::AssetInfo;
use candid::CandidType;
use cashier_essentials::storable;

#[derive(Debug, CandidType, Clone)]
#[storable]
pub struct Link {
    pub pk: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub nft_image: Option<String>,
    pub link_image_url: Option<String>,
    pub link_type: Option<String>,
    pub asset_info: Option<Vec<AssetInfo>>,
    pub template: Option<String>,
    pub state: Option<String>,
    pub creator: Option<String>,
    pub create_at: Option<u64>,
}

pub const PK_PREFIX: &str = "link";

impl Link {
    pub fn build_pk(id: String) -> String {
        format!("{}#{}", PK_PREFIX, id)
    }

    pub fn split_pk(pk: &str) -> String {
        pk.split('#').collect::<Vec<&str>>()[1].to_string()
    }
}
