// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        asset_info::v3::AssetInfoV3,
        link::{v1::LinkType, v3::LinkV3},
    },
};

use crate::apps::link_v3::links::{
    LinkV3Types, airdrop_link::AirdropLink, tip_link::TipLink, token_basket_link::TokenBasketLink,
};

pub struct LinkFactoryV3;

impl LinkFactoryV3 {
    /// Creates a new LinkV3 instance based on the provided parameters.
    /// # Arguments
    /// * `link_type` - The type of link to create (e.g., SendTip, SendAirdrop, SendTokenBasket)
    /// * `title` - The title of the link
    /// * `asset_info` - A vector of AssetInfoV3 representing the assets associated with the link
    /// * `max_use` - The maximum number of times the link can be used (applicable for certain link types)
    /// * `creator` - The Principal of the creator of the link
    /// * `created_at_ts` - The timestamp when the link is created
    /// * `canister_id` - The Principal of the canister where the link will be created
    /// # Returns
    /// * `Ok(LinkV3)` - The created LinkV3 instance if successful
    /// * `Err(CanisterError)` - An error if the link type is unsupported
    pub fn create_link(
        link_type: LinkType,
        title: String,
        asset_info: Vec<AssetInfoV3>,
        max_use: u64,
        creator: Principal,
        created_at: u64,
        canister_id: Principal,
    ) -> Result<LinkV3, CanisterError> {
        match link_type {
            LinkType::SendTip => {
                Ok(TipLink::create(creator, title, asset_info, created_at, canister_id).link)
            }
            LinkType::SendAirdrop => Ok(AirdropLink::create(
                creator,
                title,
                asset_info,
                max_use,
                created_at,
                canister_id,
            )
            .link),
            LinkType::SendTokenBasket => Ok(TokenBasketLink::create(
                creator,
                title,
                asset_info,
                max_use,
                created_at,
                canister_id,
            )
            .link),
            _ => Err(CanisterError::InvalidInput(
                "Unsupported link type".to_string(),
            )),
        }
    }

    /// Converts a Link model to a corresponding LinkV3 instance.
    /// # Arguments
    /// * `link` - The Link model to convert.
    /// # Returns
    /// * `Ok(LinkV3Types)` - The corresponding LinkV3 instance if the link type is supported.
    /// * `Err(CanisterError)` - An error if the link type is unsupported
    pub fn create_from_link_model(
        link: LinkV3,
        canister_id: Principal,
    ) -> Result<LinkV3Types, CanisterError> {
        match link.link_type {
            LinkType::SendTip => Ok(LinkV3Types::TipLink(TipLink::new(link, canister_id))),
            LinkType::SendAirdrop => Ok(LinkV3Types::AirdropLink(AirdropLink::new(
                link,
                canister_id,
            ))),
            LinkType::SendTokenBasket => Ok(LinkV3Types::TokenBasketLink(TokenBasketLink::new(
                link,
                canister_id,
            ))),
            _ => Err(CanisterError::InvalidInput(
                "Unsupported link type".to_string(),
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_backend_types::repository::{
        asset::v3::{AssetV3, TokenStandardV3},
        link::v3::LinkState,
    };
    use cashier_common::test_utils::random_principal_id;
    use uuid::Uuid;

    fn fixture_of_asset_info_v3(address: Principal) -> AssetInfoV3 {
        AssetInfoV3 {
            asset: AssetV3 {
                address,
                network_fee: None,
                token_standard: TokenStandardV3::ICRC1,
            },
            label: "asset".to_string(),
            amount: candid::Nat::from(1000u64),
            available_amount: None,
        }
    }

    fn fixture_of_link_v3(link_type: LinkType, creator: Principal, created_at: u64) -> LinkV3 {
        LinkV3 {
            id: Uuid::new_v4().to_string(),
            title: "Test Link".to_string(),
            link_type,
            asset_info: vec![fixture_of_asset_info_v3(random_principal_id())],
            max_use: 5,
            use_count: 0,
            creator,
            state: LinkState::Created,
            created_at,
        }
    }

    #[test]
    fn it_should_fail_create_link_due_to_unsupported_link_type() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();

        // Act
        let result = LinkFactoryV3::create_link(
            LinkType::ReceivePayment,
            "Unsupported".to_string(),
            vec![fixture_of_asset_info_v3(random_principal_id())],
            3,
            creator,
            1_000_000,
            canister_id,
        );

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidInput(_))));
    }

    #[test]
    fn it_should_fail_create_from_link_model_due_to_unsupported_link_type() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let link = fixture_of_link_v3(LinkType::ReceivePayment, creator, 1_000_000);

        // Act
        let result = LinkFactoryV3::create_from_link_model(link, canister_id);

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidInput(_))));
    }

    #[test]
    fn it_should_succeed_create_tip_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;

        // Act
        let result = LinkFactoryV3::create_link(
            LinkType::SendTip,
            "Tip".to_string(),
            vec![fixture_of_asset_info_v3(random_principal_id())],
            99,
            creator,
            created_at,
            canister_id,
        );

        // Assert
        assert!(result.is_ok());
        let link = result.expect("tip link should be created");
        assert_eq!(link.link_type, LinkType::SendTip);
        assert_eq!(link.max_use, 1);
        assert_eq!(link.state, LinkState::Created);
        assert_eq!(link.creator, creator);
        assert_eq!(link.created_at, created_at);
    }

    #[test]
    fn it_should_succeed_create_airdrop_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;

        // Act
        let result = LinkFactoryV3::create_link(
            LinkType::SendAirdrop,
            "Airdrop".to_string(),
            vec![fixture_of_asset_info_v3(random_principal_id())],
            7,
            creator,
            created_at,
            canister_id,
        );

        // Assert
        assert!(result.is_ok());
        let link = result.expect("airdrop link should be created");
        assert_eq!(link.link_type, LinkType::SendAirdrop);
        assert_eq!(link.max_use, 7);
        assert_eq!(link.state, LinkState::Created);
    }

    #[test]
    fn it_should_succeed_create_token_basket_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000u64;

        // Act
        let result = LinkFactoryV3::create_link(
            LinkType::SendTokenBasket,
            "Basket".to_string(),
            vec![fixture_of_asset_info_v3(random_principal_id())],
            9,
            creator,
            created_at,
            canister_id,
        );

        // Assert
        assert!(result.is_ok());
        let link = result.expect("token basket link should be created");
        assert_eq!(link.link_type, LinkType::SendTokenBasket);
        assert_eq!(link.max_use, 9);
        assert_eq!(link.state, LinkState::Created);
    }

    #[test]
    fn it_should_succeed_create_from_link_model_tip_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let link = fixture_of_link_v3(LinkType::SendTip, creator, 1_000_000);

        // Act
        let result = LinkFactoryV3::create_from_link_model(link, canister_id);

        // Assert
        assert!(matches!(result, Ok(LinkV3Types::TipLink(_))));
    }

    #[test]
    fn it_should_succeed_create_from_link_model_airdrop_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let link = fixture_of_link_v3(LinkType::SendAirdrop, creator, 1_000_000);

        // Act
        let result = LinkFactoryV3::create_from_link_model(link, canister_id);

        // Assert
        assert!(matches!(result, Ok(LinkV3Types::AirdropLink(_))));
    }

    #[test]
    fn it_should_succeed_create_from_link_model_token_basket_link() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let link = fixture_of_link_v3(LinkType::SendTokenBasket, creator, 1_000_000);

        // Act
        let result = LinkFactoryV3::create_from_link_model(link, canister_id);

        // Assert
        assert!(matches!(result, Ok(LinkV3Types::TokenBasketLink(_))));
    }
}
