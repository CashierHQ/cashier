use crate::utils::{principal::TestUser, with_pocket_ic_context};
use cashier_backend_types::{
    constant,
    repository::{action::v1::ActionState, intent::v1::IntentState},
};
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;
use std::time::Duration;

#[cfg(test)]
mod test_canister_upgrade {
    use crate::{cashier_backend::link::fixture::LinkTestFixture, utils::PocketIcTestContext};

    use super::*;
    use candid::Nat;
    use cashier_backend_types::{
        dto::{action::ActionDto, link::LinkDto},
        repository::action::v1::ActionType,
    };

    struct UpgradeTestData {
        link: LinkDto,
        fixture: LinkTestFixture,
        processing_action: ActionDto,
    }

    // Setup test data for upgrade tests
    async fn setup_upgrade_test(ctx: &PocketIcTestContext) -> UpgradeTestData {
        let caller = TestUser::User1.get_principal();
        let mut fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        fixture
            .airdrop_icp(Nat::from(1_000_000_000u64), &caller)
            .await;

        // Create tip link with 1 ICP
        let tip_link_amount = Nat::from(100_000_000u64);
        let link = fixture
            .create_tip_link(constant::ICP_TOKEN, tip_link_amount)
            .await;
        let action = fixture
            .create_action(&link.id, ActionType::CreateLink)
            .await;

        let user_account = Account {
            owner: caller,
            subaccount: None,
        };

        let _ = ctx
            .new_icp_ledger_client(caller)
            .balance_of(&user_account)
            .await
            .unwrap();

        // Process action to get it into processing state
        let processing_action = fixture
            .process_action(&link.id, &action.id, ActionType::CreateLink)
            .await;

        UpgradeTestData {
            link,
            fixture,
            processing_action,
        }
    }

    #[tokio::test]
    async fn should_timeout_transaction_after_upgrade() {
        with_pocket_ic_context::<_, ()>(async move |ctx| {
            // Arrange
            let test_data = setup_upgrade_test(ctx).await;

            // Verify action is in processing state
            assert_eq!(test_data.processing_action.state, ActionState::Processing);

            // Act - Upgrade the canister
            let new_bytecode = crate::utils::get_cashier_backend_canister_bytecode();
            ctx.upgrade_canister(ctx.cashier_backend_principal, None, new_bytecode, ())
                .await;

            // Wait a bit for post_upgrade to complete
            ctx.advance_time(Duration::from_secs(1)).await;

            // Advance time to trigger timeout (5 minutes + buffer)
            ctx.advance_time(Duration::from_secs(60 * 5)).await;
            for _ in 0..10 {
                ctx.advance_time(Duration::from_secs(1)).await;
            }

            // Assert - Action should be failed after timeout
            let action_after_timeout = test_data.fixture.get_action(&test_data.link.id).await;

            assert_eq!(action_after_timeout.state, ActionState::Fail);

            // Verify intents are also failed
            assert_eq!(action_after_timeout.intents.len(), 2);
            assert!(
                action_after_timeout
                    .intents
                    .iter()
                    .all(|intent| intent.state == IntentState::Fail)
            );

            Ok(())
        })
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn should_handle_multiple_upgrades_with_persistent_timers() {
        with_pocket_ic_context::<_, ()>(async move |ctx| {
            // Arrange
            let test_data = setup_upgrade_test(ctx).await;

            // Verify action is in processing state
            assert_eq!(test_data.processing_action.state, ActionState::Processing);

            // Act - First upgrade
            let new_bytecode = crate::utils::get_cashier_backend_canister_bytecode();
            ctx.upgrade_canister(
                ctx.cashier_backend_principal,
                None,
                new_bytecode.clone(),
                (),
            )
            .await;

            ctx.advance_time(Duration::from_secs(1)).await;

            // Verify still processing after first upgrade
            let action_after_first_upgrade = test_data.fixture.get_action(&test_data.link.id).await;

            assert_eq!(action_after_first_upgrade.state, ActionState::Processing);

            // Second upgrade
            ctx.upgrade_canister(ctx.cashier_backend_principal, None, new_bytecode, ())
                .await;

            ctx.advance_time(Duration::from_secs(1)).await;

            // Verify still processing after second upgrade
            let action_after_second_upgrade =
                test_data.fixture.get_action(&test_data.link.id).await;

            assert_eq!(action_after_second_upgrade.state, ActionState::Processing);

            // Advance time to trigger timeout
            ctx.advance_time(Duration::from_secs(60 * 5)).await;
            for _ in 0..10 {
                ctx.advance_time(Duration::from_secs(1)).await;
            }

            // Assert - Action should be failed after timeout despite multiple upgrades
            let action_after_timeout = test_data.fixture.get_action(&test_data.link.id).await;

            assert_eq!(action_after_timeout.state, ActionState::Fail);

            Ok(())
        })
        .await
        .unwrap();
    }
}
