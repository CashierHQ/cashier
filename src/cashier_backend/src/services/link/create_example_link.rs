use uuid::Uuid;

use crate::{
    repositories::{link_store, user_link_store},
    types::{
        link::{
            chain::Chain, link_state::LinkState, link_type::LinkType, template::Template,
            AssetInfo, Link,
        },
        user_link::UserLink,
    },
};

use super::example_data::{LINK_1_NFT_IMAGE, LINK_2_NFT_IMAGE};

const LINK_1_TITLE: &str = "Example 1: Special moments";
const LINK_1_DESCRIPTION: &str = "I wanted to capture this special moment forever. And I’d like to share it with my closest of friends.";
const LINK_1_LINK_URL: &str = "";

const LINK_2_TITLE: &str = "Example 2: Proof of attendance";
const LINK_2_DESCRIPTION: &str = "Thank you for attending our coffee brewing workshop. Here is an NFT as a proof of your attendance.";
const LINK_2_LINK_URL: &str = "";

pub fn create_example_link(user_id: String) -> Result<(), String> {
    let ts = ic_cdk::api::time();
    let id1 = Uuid::new_v4();
    let id2 = Uuid::new_v4();
    let link1_id_str = id1.to_string();
    let link2_id_str = id2.to_string();

    let asset_info: AssetInfo = AssetInfo {
        address: "".into(),
        chain: Chain::IC.to_string(),
        current_amount: 10,
        total_amount: 10,
        amount_per_claim: 1,
        total_claim: 1,
    };

    let new_link_1 = Link::new(
        link1_id_str.clone(),
        LINK_1_TITLE.to_string().into(),
        LINK_1_DESCRIPTION.to_string().into(),
        LinkType::NftCreateAndAirdrop.to_string().into(),
        Some(vec![asset_info.clone()]),
        Template::Central.to_string().into(),
        LinkState::Active.to_string().into(),
        user_id.clone().into(),
        ts.into(),
        Some(LINK_1_LINK_URL.to_string()),
        Some(LINK_1_NFT_IMAGE.to_string()),
    );
    let new_user_link_1 = UserLink::new(user_id.clone(), link1_id_str, ts);

    let new_link_2 = Link::new(
        link2_id_str.clone(),
        LINK_2_TITLE.to_string().into(),
        LINK_2_DESCRIPTION.to_string().into(),
        LinkType::NftCreateAndAirdrop.to_string().into(),
        Some(vec![asset_info]),
        Template::Central.to_string().into(),
        LinkState::Active.to_string().into(),
        user_id.clone().into(),
        ts.into(),
        Some(LINK_2_LINK_URL.to_string()),
        Some(LINK_2_NFT_IMAGE.to_string()),
    );
    let new_user_link_2 = UserLink::new(user_id, link2_id_str, ts);

    let links_to_create = vec![
        Link::from(new_link_1).to_persistence(),
        Link::from(new_link_2).to_persistence(),
    ];
    let user_links_to_create = vec![
        new_user_link_1.to_persistence(),
        new_user_link_2.to_persistence(),
    ];

    link_store::batch_create(links_to_create);
    user_link_store::batch_create(user_links_to_create);

    //TODO: create intent for user

    Ok(())
}
