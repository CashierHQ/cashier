use candid::Nat;
use cashier_types::repository::{
    action::v1::{ActionState, ActionType},
    intent::v2::IntentState,
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

#[cfg(test)]
mod test_icp_tip_link {
    use super::*;
    use cashier_types::dto::{action::ActionDto, link::LinkDto};

    struct TipLinkTestData {
        link: LinkDto,
        action: ActionDto,
        caller: candid::Principal,
        user: cashier_types::dto::user::UserDto,
        tip_link_amount: u64,
        user_balance_before_create_link: Nat,
        fixture: LinkTestFixture,
    }

    // This method is used to setup the test data for the test
    // It creates a tip link with 1 ICP and returns the test data
    // this mimic the same flow in the frontend
    // backend call flow: create link -> create action
    async fn setup_tip_link(ctx: &PocketIcTestContext) -> TipLinkTestData {
        let caller = TestUser::User1.get_principal();
        let mut fixture = LinkTestFixture::new(ctx, &caller).await;

        let user = fixture.setup_user().await;
        fixture.airdrop_icp(ctx, 1_000_000_000, &caller).await;

        // create tip link with 1 ICP
        let tip_link_amount = 100_000_000u64;
        let link = fixture.create_tip_link(ctx, tip_link_amount).await;
        let action = fixture.create_action(&link.id).await;

        let user_account = Account {
            owner: caller,
            subaccount: None,
        };
        // balance before create link
        let user_balance_before_create_link = ctx
            .new_icp_ledger_client(caller)
            .balance_of(&user_account)
            .await
            .unwrap();

        TipLinkTestData {
            link,
            action,
            caller,
            user,
            tip_link_amount,
            user_balance_before_create_link,
            fixture,
        }
    }

    #[tokio::test]
    async fn should_active_send_tip_link_successfully() {
        with_pocket_ic_context::<_, ()>(async move |ctx| {
            // Arrange
            let test_data = setup_tip_link(ctx).await;

            // Act - backend call flow: process action -> execute icrc112 -> update action
            let processing_action = test_data
                .fixture
                .process_action(&test_data.link.id, &test_data.action.id)
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
            assert_eq!(processing_action.intents.len(), 2);
            assert!(
                processing_action
                    .intents
                    .iter()
                    .all(|intent| { intent.state == IntentState::Processing.to_string() })
            );

            assert!(icrc112_execution_result.is_ok());
            assert_eq!(updated_action.state, ActionState::Success.to_string());
            assert_eq!(updated_action.intents.len(), 2);
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
    async fn should_verify_send_tip_link_balances() {
        with_pocket_ic_context::<_, ()>(async move |ctx| {
            // Arrange
            let test_data = setup_tip_link(ctx).await;
            let icp_ledger_client = ctx.new_icp_ledger_client(test_data.caller);
            let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

            let user_account = Account {
                owner: test_data.caller,
                subaccount: None,
            };

            let link_account = link_id_to_account(ctx, &test_data.link.id);

            // Act - backend call flow: process action -> execute icrc112 -> update action
            let processing_action = test_data
                .fixture
                .process_action(&test_data.link.id, &test_data.action.id)
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
            let link_balance_after_active_link =
                icp_ledger_client.balance_of(&link_account).await.unwrap();

            // Assert
            // Calculate expected balances
            let amount_transferred = Nat::from(test_data.tip_link_amount) + icp_ledger_fee.clone();
            let expected_user_balance = test_data.user_balance_before_create_link
                - amount_transferred.clone()
                - icp_ledger_fee.clone()
                - Nat::from(LINK_CREATE_FEE)
                - icp_ledger_fee.clone() * Nat::from(2u64);

            // Verify final balances
            assert_eq!(user_balance_after_active_link, expected_user_balance);
            assert_eq!(link_balance_after_active_link, amount_transferred);

            Ok(())
        })
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn should_have_correct_send_tip_icrc112_order() {
        with_pocket_ic_context::<_, ()>(async move |ctx| {
            // Arrange
            let test_data = setup_tip_link(ctx).await;

            // Act
            let processing_action = test_data
                .fixture
                .process_action(&test_data.link.id, &test_data.action.id)
                .await;
            let icrc_112_requests = processing_action.icrc_112_requests.as_ref().unwrap();

            let mut group0_methods: Vec<String> = icrc_112_requests[0]
                .iter()
                .map(|r| r.method.clone())
                .collect();
            group0_methods.sort();
            let mut expected_group0 =
                vec!["icrc2_approve".to_string(), "icrc1_transfer".to_string()];
            expected_group0.sort();

            let mut group1_methods: Vec<String> = icrc_112_requests[1]
                .iter()
                .map(|r| r.method.clone())
                .collect();
            group1_methods.sort();
            let mut expected_group1 = vec!["trigger_transaction".to_string()];
            expected_group1.sort();

            // Assert
            assert_eq!(icrc_112_requests.len(), 2);
            assert_eq!(group0_methods, expected_group0);
            assert_eq!(group1_methods, expected_group1);

            Ok(())
        })
        .await
        .unwrap();
    }
}
