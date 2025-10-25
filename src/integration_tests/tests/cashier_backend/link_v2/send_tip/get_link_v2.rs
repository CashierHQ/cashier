// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::cashier_backend::link::fixture::{
    LinkTestFixture, activate_tip_link_v2_fixture, create_tip_linkv2_fixture,
};
use crate::utils::principal::TestUser;
use crate::utils::{link_id_to_account::link_id_to_account, with_pocket_ic_context};
use candid::Nat;
use cashier_backend_types::constant::{CKBTC_ICRC_TOKEN, ICP_TOKEN};
use cashier_backend_types::dto::action::CreateActionInput;
use cashier_backend_types::error::CanisterError;
use cashier_backend_types::link_v2::dto::ProcessActionV2Input;
use cashier_backend_types::repository::action::v1::{ActionState, ActionType};
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v1::{IntentState, IntentTask, IntentType};
use cashier_backend_types::repository::link::v1::LinkState;
use cashier_backend_types::repository::transaction::v1::{IcTransaction, Protocol};
use cashier_backend_types::service::link::PaginateInput;
use icrc_ledger_types::icrc1::account::Account;

#[tokio::test]
async fn it_should_succeed_get_icp_token_tip_linkv2_with_no_paginate_option() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, ICP_TOKEN, tip_amount).await;

        // Act
        let _link_id = create_link_result.link.id.clone();
        let get_links_result = test_fixture.get_links_v2(None).await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 1);
        let link = &links.data[0];
        assert_eq!(link.id, create_link_result.link.id);
        assert_eq!(link.link_type, create_link_result.link.link_type);
        assert_eq!(link.state, LinkState::Active);

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_succeed_get_icp_token_tip_linkv2_with_paginate_option() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let tip_amount = 1_000_000u64;
        let (test_fixture, create_link_result) =
            activate_tip_link_v2_fixture(ctx, ICP_TOKEN, tip_amount).await;

        // Act
        let _link_id = create_link_result.link.id.clone();
        let input = PaginateInput {
            limit: 10,
            offset: 0,
        };
        let get_links_result = test_fixture.get_links_v2(Some(input)).await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 1);
        let link = &links.data[0];
        assert_eq!(link.id, create_link_result.link.id);
        assert_eq!(link.link_type, create_link_result.link.link_type);
        assert_eq!(link.state, LinkState::Active);

        // Act
        let _link_id = create_link_result.link.id.clone();
        let input = PaginateInput {
            limit: 10,
            offset: 10,
        };
        let get_links_result = test_fixture.get_links_v2(Some(input)).await;

        // Assert
        assert!(get_links_result.is_ok());
        let links = get_links_result.unwrap();
        assert_eq!(links.data.len(), 0);

        Ok(())
    })
    .await
    .unwrap();
}
