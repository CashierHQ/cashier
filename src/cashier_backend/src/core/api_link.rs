use ic_cdk::query;

use crate::types::link_detail::{
    Action, AssetAirdropInfo, Chain, LinkDetail, LinkType, State, Template,
};

#[query]
async fn get_links() -> Result<Vec<LinkDetail>, String> {
    // Mock data for Vec<LinkDetail>
    let mock_data: Vec<LinkDetail> = vec![
        LinkDetail {
            id: "1".to_string(),
            title: "First Link".to_string(),
            description: "This is the first link".to_string(),
            image: "first_image.png".to_string(),
            link_type: LinkType::NftCreateAndAirdrop,
            asset_info: AssetAirdropInfo {
                address: "address1".to_string(),
                chain: Chain::IC,
                amount: 100,
            },
            actions: vec![
                Action {
                    canister_id: "canister1".to_string(),
                    label: "Action1".to_string(),
                    method: "method1".to_string(),
                    arg: "arg1".to_string(),
                },
                Action {
                    canister_id: "canister2".to_string(),
                    label: "Action2".to_string(),
                    method: "method2".to_string(),
                    arg: "arg2".to_string(),
                },
            ],
            template: Template::Left,
            state: State::Active,
            creator: "creator1".to_string(),
        },
        LinkDetail {
            id: "2".to_string(),
            title: "Second Link".to_string(),
            description: "This is the second link".to_string(),
            image: "second_image.png".to_string(),
            link_type: LinkType::NftCreateAndAirdrop,
            asset_info: AssetAirdropInfo {
                address: "address2".to_string(),
                chain: Chain::IC,
                amount: 200,
            },
            actions: vec![Action {
                canister_id: "canister3".to_string(),
                label: "Action3".to_string(),
                method: "method3".to_string(),
                arg: "arg3".to_string(),
            }],
            template: Template::Right,
            state: State::PendingDetail,
            creator: "creator2".to_string(),
        },
    ];

    // Print the mock data
    println!("{:#?}", mock_data);

    Ok(mock_data)
}
