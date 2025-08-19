use cashier_backend_types::{
    constant,
    repository::{
        action::v1::{ActionState, ActionType},
        common::Chain,
        intent::v2::IntentState,
        link::v1::{LinkType, Template},
    },
};
use cashier_common::utils;

use super::super::fixture::LinkTestFixture;
use crate::utils::principal::TestUser;
use crate::utils::{PocketIcTestContextBuilder, icrc_112, with_pocket_ic_context};
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;

#[tokio::test]
async fn should_create_token_basket_link_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        fixture.setup_user().await;

        // Act
        let link = fixture.create_token_basket_link().await;

        // Assert
        assert_eq!(link.link_type, Some(LinkType::SendTokenBasket.to_string()));
        assert_eq!(link.template, Some(Template::Central.to_string()));
        assert_eq!(link.asset_info.as_ref().unwrap().len(), 3);

        // Check ICP asset
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].address,
            ctx.icp_ledger_principal.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].chain,
            Chain::IC.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].label,
            format!(
                "{}_{}",
                constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                ctx.icp_ledger_principal.to_text()
            )
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[0].amount_per_link_use_action,
            10_000_000
        );

        // Check ckBTC asset
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].address,
            ctx.icrc_token_map["ckBTC"].to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].chain,
            Chain::IC.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].label,
            format!(
                "{}_{}",
                constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                ctx.icrc_token_map["ckBTC"].to_text()
            )
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[1].amount_per_link_use_action,
            1_000_000
        );

        // Check ckUSDC asset
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].address,
            ctx.icrc_token_map["ckUSDC"].to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].chain,
            Chain::IC.to_string()
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].label,
            format!(
                "{}_{}",
                constant::INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
                ctx.icrc_token_map["ckUSDC"].to_text()
            )
        );
        assert_eq!(
            link.asset_info.as_ref().unwrap()[2].amount_per_link_use_action,
            10_000_000
        );

        assert_eq!(link.link_use_action_max_count, 1);
        assert_eq!(link.title, Some("Test Link".to_string()));
        assert!(!link.id.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_create_link_send_token_basket_successfully() {
    // Arrange
    let ctx = PocketIcTestContextBuilder::new()
        .with_cashier_backend()
        .with_icp_ledger()
        .with_icrc_tokens(vec![
            constant::CKBTC_ICRC_TOKEN.to_string(),
            constant::CKUSDC_ICRC_TOKEN.to_string(),
        ])
        .build_async()
        .await;

    let caller = TestUser::User1.get_principal();
    let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;
    test_fixture.setup_user().await;

    let icp_ledger_client = ctx.new_icp_ledger_client(caller);
    let ckbtc_ledger_client = ctx.new_icrc_ledger_client(constant::CKBTC_ICRC_TOKEN, caller);
    let ckusdc_ledger_client = ctx.new_icrc_ledger_client(constant::CKUSDC_ICRC_TOKEN, caller);
    let icp_initial_balance = 1_000_000_000u64;
    let ckbtc_initial_balance = 1_000_000_000u64;
    let ckusdc_initial_balance = 1_000_000_000u64;

    // Act
    test_fixture.airdrop_icp(icp_initial_balance, &caller).await;
    test_fixture
        .airdrop_icrc(constant::CKBTC_ICRC_TOKEN, ckbtc_initial_balance, &caller)
        .await;
    test_fixture
        .airdrop_icrc(constant::CKUSDC_ICRC_TOKEN, ckusdc_initial_balance, &caller)
        .await;

    // Assert
    let caller_account = Account {
        owner: caller,
        subaccount: None,
    };
    let icp_balance = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    let ckbtc_balance = ckbtc_ledger_client
        .balance_of(&caller_account)
        .await
        .unwrap();
    let ckusdc_balance = ckusdc_ledger_client
        .balance_of(&caller_account)
        .await
        .unwrap();

    assert_eq!(icp_balance, icp_initial_balance);
    assert_eq!(ckbtc_balance, ckbtc_initial_balance);
    assert_eq!(ckusdc_balance, ckusdc_initial_balance);

    // Arrange
    let icp_link_amount = 10_000_000u64;
    let ckbtc_link_amount = 1_000u64;
    let ckusdc_link_amount = 50_000_000u64;
    let link_input = test_fixture
        .token_basket_link_input(
            vec![
                constant::ICP_TOKEN.to_string(),
                constant::CKBTC_ICRC_TOKEN.to_string(),
                constant::CKUSDC_ICRC_TOKEN.to_string(),
            ],
            vec![icp_link_amount, ckbtc_link_amount, ckusdc_link_amount],
        )
        .unwrap();

    // Act
    let link = test_fixture.create_link(link_input).await;

    // Assert
    assert!(!link.id.is_empty());
    assert_eq!(link.link_type, Some(LinkType::SendTokenBasket.to_string()));
    assert!(link.asset_info.is_some());
    assert_eq!(link.asset_info.as_ref().unwrap().len(), 3);

    // Act
    let create_action = test_fixture
        .create_action(&link.id, constant::CREATE_LINK_ACTION)
        .await;

    // Assert
    assert!(!create_action.id.is_empty());
    assert_eq!(create_action.r#type, ActionType::CreateLink.to_string());
    assert_eq!(create_action.state, ActionState::Created.to_string());
    assert_eq!(create_action.intents.len(), 4);

    // Act
    let processing_action = test_fixture
        .process_action(&link.id, &create_action.id)
        .await;

    // Assert
    assert_eq!(processing_action.id, create_action.id);
    assert_eq!(processing_action.r#type, ActionType::CreateLink.to_string());
    assert_eq!(processing_action.state, ActionState::Processing.to_string());
    assert!(processing_action.icrc_112_requests.is_some());
    assert_eq!(
        processing_action.icrc_112_requests.as_ref().unwrap().len(),
        2
    );
    assert_eq!(
        processing_action.icrc_112_requests.as_ref().unwrap()[0].len(),
        4,
        "First request should have 4 elements"
    );
    assert_eq!(
        processing_action.icrc_112_requests.as_ref().unwrap()[1].len(),
        1,
        "Second request should have 1 element"
    );

    // Arrange
    let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

    // Act
    let icrc112_execution_result =
        icrc_112::execute_icrc112_request(icrc_112_requests, caller, &ctx).await;

    // Assert
    assert!(icrc112_execution_result.is_ok());

    // Act
    let update_action = test_fixture
        .update_action(&link.id, &processing_action.id)
        .await;

    // Assert
    assert_eq!(update_action.id, processing_action.id);
    assert_eq!(update_action.r#type, ActionType::CreateLink.to_string());
    assert_eq!(update_action.state, ActionState::Success.to_string());
    assert!(
        update_action
            .intents
            .iter()
            .all(|intent| intent.state == IntentState::Success.to_string())
    );

    let icp_balance_after = icp_ledger_client.balance_of(&caller_account).await.unwrap();
    let ckbtc_balance_after = ckbtc_ledger_client
        .balance_of(&caller_account)
        .await
        .unwrap();
    let ckusdc_balance_after = ckusdc_ledger_client
        .balance_of(&caller_account)
        .await
        .unwrap();
    let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
    let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
    let ckusdc_ledger_fee = ckusdc_ledger_client.fee().await.unwrap();

    assert_eq!(
        icp_balance_after,
        icp_initial_balance
            - icp_link_amount
            - utils::calculate_create_link_fee(constant::ICP_TOKEN, &icp_ledger_fee),
        "ICP balance after link creation is incorrect"
    );
    assert_eq!(
        ckbtc_balance_after,
        ckbtc_initial_balance
            - ckbtc_link_amount
            - utils::calculate_create_link_fee(constant::CKBTC_ICRC_TOKEN, &ckbtc_ledger_fee),
        "CKBTC balance after link creation is incorrect"
    );
    assert_eq!(
        ckusdc_balance_after,
        ckusdc_initial_balance
            - ckusdc_link_amount
            - utils::calculate_create_link_fee(constant::CKUSDC_ICRC_TOKEN, &ckusdc_ledger_fee),
        "CKUSDC balance after link creation is incorrect"
    );
}
