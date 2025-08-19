use candid::Nat;
use cashier_backend_types::{
    constant,
    repository::{
        action::v1::{ActionState, ActionType},
        intent::v2::IntentState,
    },
};
use icrc_ledger_types::icrc1::account::Account;

use super::super::fixture::LinkTestFixture;
use crate::{
    constant::LINK_CREATE_FEE,
    utils::{
        PocketIcTestContext, icrc_112::execute_icrc112_request,
        link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context,
    },
};
use std::sync::Arc;

#[cfg(test)]
mod test_token_basket_3_tokens {
    use super::*;
    use cashier_backend_types::dto::{action::ActionDto, link::LinkDto};

    struct TokenBasketTestData {
        link: LinkDto,
        action: ActionDto,
        caller: candid::Principal,
        user: cashier_backend_types::dto::user::UserDto,
        user_balance_before_create_link: Nat,
        ckbtc_balance_before: Nat,
        ckusdc_balance_before: Nat,
        fixture: LinkTestFixture,
    }

    // This method is used to setup the test data for the test
    // It creates a token basket link with ICP, ckBTC, and ckUSDC and returns the test data
    // this mimic the same flow in the frontend
    // backend call flow: create link -> create action
    async fn setup_token_basket(ctx: &PocketIcTestContext) -> TokenBasketTestData {
        let caller = TestUser::User1.get_principal();
        let mut fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        let user = fixture.setup_user().await;
        fixture.airdrop_icp(1_000_000_000, &caller).await;
        fixture.airdrop_icrc("ckBTC", 100_000_000, &caller).await;
        fixture
            .airdrop_icrc("ckUSDC", 10_000_000_000, &caller)
            .await;

        let link = fixture.create_token_basket_link().await;
        let action = fixture.create_action(&link.id, "CreateLink").await;

        let user_account = Account {
            owner: caller,
            subaccount: None,
        };

        // Get initial balances
        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let ckbtc_ledger_client = ctx.new_icrc_ledger_client("ckBTC", caller);
        let ckusdc_ledger_client = ctx.new_icrc_ledger_client("ckUSDC", caller);

        let user_balance_before_create_link =
            icp_ledger_client.balance_of(&user_account).await.unwrap();
        let ckbtc_balance_before = ckbtc_ledger_client.balance_of(&user_account).await.unwrap();
        let ckusdc_balance_before = ckusdc_ledger_client
            .balance_of(&user_account)
            .await
            .unwrap();

        TokenBasketTestData {
            link,
            action,
            caller,
            user,
            user_balance_before_create_link,
            ckbtc_balance_before,
            ckusdc_balance_before,
            fixture,
        }
    }

    #[tokio::test]
    async fn should_active_send_token_basket_link_successfully() {
        with_pocket_ic_context::<_, ()>(async move |ctx| {
            // Arrange
            let test_data = setup_token_basket(ctx).await;

            // Act - backend call flow: process action -> execute icrc112 -> update action
            let processing_action = test_data
                .fixture
                .process_action(
                    &test_data.link.id,
                    &test_data.action.id,
                    constant::CREATE_LINK_ACTION,
                )
                .await;
            let icrc112_execution_result = execute_icrc112_request(
                processing_action.icrc_112_requests.as_ref().unwrap(),
                test_data.caller,
                ctx,
            )
            .await;
            let updated_action = test_data
                .fixture
                .update_action(&test_data.link.id, &test_data.action.id)
                .await;

            // Assert
            assert!(test_data.action.icrc_112_requests.is_none());
            assert_eq!(test_data.action.state, ActionState::Created.to_string());

            assert_eq!(processing_action.id, test_data.action.id);
            assert_eq!(processing_action.r#type, ActionType::CreateLink.to_string());
            assert_eq!(processing_action.state, ActionState::Processing.to_string());
            assert_eq!(processing_action.creator, test_data.user.id);
            assert_eq!(processing_action.intents.len(), 4);
            assert!(
                processing_action
                    .intents
                    .iter()
                    .all(|intent| { intent.state == IntentState::Processing.to_string() })
            );

            assert!(icrc112_execution_result.is_ok());
            assert_eq!(updated_action.state, ActionState::Success.to_string());
            assert_eq!(updated_action.intents.len(), 4);
            assert!(
                updated_action
                    .intents
                    .iter()
                    .all(|intent| { intent.state == IntentState::Success.to_string() })
            );

            Ok(())
        })
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn should_verify_token_basket_link_balances() {
        with_pocket_ic_context::<_, ()>(async move |ctx| {
            // Arrange
            let test_data = setup_token_basket(ctx).await;
            let icp_ledger_client = ctx.new_icp_ledger_client(test_data.caller);
            let ckbtc_ledger_client = ctx.new_icrc_ledger_client("ckBTC", test_data.caller);
            let ckusdc_ledger_client = ctx.new_icrc_ledger_client("ckUSDC", test_data.caller);

            let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();
            let ckbtc_ledger_fee = ckbtc_ledger_client.fee().await.unwrap();
            let ckusdc_ledger_fee = ckusdc_ledger_client.fee().await.unwrap();

            let user_account = Account {
                owner: test_data.caller,
                subaccount: None,
            };

            let link_account = link_id_to_account(ctx, &test_data.link.id);

            // Act - backend call flow: process action -> execute icrc112 -> update action
            let processing_action = test_data
                .fixture
                .process_action(
                    &test_data.link.id,
                    &test_data.action.id,
                    constant::CREATE_LINK_ACTION,
                )
                .await;
            let _icrc112_execution_result = execute_icrc112_request(
                processing_action.icrc_112_requests.as_ref().unwrap(),
                test_data.caller,
                ctx,
            )
            .await;
            let _updated_action = test_data
                .fixture
                .update_action(&test_data.link.id, &test_data.action.id)
                .await;

            let user_balance_after_active_link =
                icp_ledger_client.balance_of(&user_account).await.unwrap();
            let ckbtc_balance_after = ckbtc_ledger_client.balance_of(&user_account).await.unwrap();
            let ckusdc_balance_after = ckusdc_ledger_client
                .balance_of(&user_account)
                .await
                .unwrap();

            let link_icp_balance_after = icp_ledger_client.balance_of(&link_account).await.unwrap();
            let link_ckbtc_balance_after =
                ckbtc_ledger_client.balance_of(&link_account).await.unwrap();
            let link_ckusdc_balance_after = ckusdc_ledger_client
                .balance_of(&link_account)
                .await
                .unwrap();

            // Assert
            // Calculate expected balances for token basket
            // Token amounts from fixture: ICP=10_000_000, ckBTC=1_000_000, ckUSDC=10_000_000
            // the amount added one more ledger fee for subsidize the fee
            let expected_icp_amount_in_link = Nat::from(10_000_000u64) + icp_ledger_fee.clone();
            let expected_ckbtc_amount_in_link = Nat::from(1_000_000u64) + ckbtc_ledger_fee.clone();
            let expected_ckusdc_amount_in_link =
                Nat::from(10_000_000u64) + ckusdc_ledger_fee.clone();

            // For non-ICP tokens: amount_before - amount_in_link - fee
            let expected_user_ckbtc_balance = test_data.ckbtc_balance_before
                - expected_ckbtc_amount_in_link.clone()
                - ckbtc_ledger_fee.clone();
            let expected_user_ckusdc_balance = test_data.ckusdc_balance_before
                - expected_ckusdc_amount_in_link.clone()
                - ckusdc_ledger_fee.clone();

            // For ICP: amount_before - amount_in_link - 1fee - link_create_fee - 2*fee (for approve and transfer to treasury)
            let expected_user_icp_balance = test_data.user_balance_before_create_link
                - expected_icp_amount_in_link.clone()
                - icp_ledger_fee.clone()
                - Nat::from(LINK_CREATE_FEE)
                - icp_ledger_fee.clone() * Nat::from(2u64);

            // Verify user account balances
            assert_eq!(ckbtc_balance_after, expected_user_ckbtc_balance);
            assert_eq!(ckusdc_balance_after, expected_user_ckusdc_balance);
            assert_eq!(user_balance_after_active_link, expected_user_icp_balance);

            // Verify link account balances
            assert_eq!(link_ckbtc_balance_after, expected_ckbtc_amount_in_link);
            assert_eq!(link_ckusdc_balance_after, expected_ckusdc_amount_in_link);
            assert_eq!(link_icp_balance_after, expected_icp_amount_in_link);

            Ok(())
        })
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn should_have_correct_token_basket_icrc112_order() {
        with_pocket_ic_context::<_, ()>(async move |ctx| {
            // Arrange
            let test_data = setup_token_basket(ctx).await;

            // Act
            let processing_action = test_data
                .fixture
                .process_action(
                    &test_data.link.id,
                    &test_data.action.id,
                    constant::CREATE_LINK_ACTION,
                )
                .await;
            let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

            let mut group0_methods: Vec<String> = icrc_112_requests[0]
                .iter()
                .map(|r| r.method.clone())
                .collect();
            group0_methods.sort();
            let mut expected_group0 = vec![
                "icrc2_approve".to_string(),
                "icrc1_transfer".to_string(),
                "icrc1_transfer".to_string(),
                "icrc1_transfer".to_string(),
            ];
            expected_group0.sort();

            // Check that we have trigger_transaction in the last group
            let last_group_methods: Vec<String> = icrc_112_requests[icrc_112_requests.len() - 1]
                .iter()
                .map(|r| r.method.clone())
                .collect();
            let expected_last_group = vec!["trigger_transaction".to_string()];

            // Assert
            // Token basket should have more ICRC-112 requests due to multiple tokens
            assert_eq!(icrc_112_requests.len(), 2);
            assert_eq!(group0_methods, expected_group0);
            assert_eq!(last_group_methods, expected_last_group);

            Ok(())
        })
        .await
        .unwrap();
    }
}
