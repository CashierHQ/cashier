use crate::cashier_backend::link::fixture::LinkTestFixture;
use crate::{
    constant::ICP_PRINCIPAL,
    utils::{link_id_to_account::link_id_to_account, principal::TestUser, with_pocket_ic_context},
};
use candid::{Nat, Principal};
use cashier_backend_types::repository::common::Wallet;
use cashier_backend_types::repository::intent::v2::{IntentTask, IntentType};
use cashier_backend_types::repository::transaction::v2::{IcTransaction, Protocol};
use cashier_backend_types::{constant, repository::link::v1::LinkType};
use cashier_common::{constant::CREATE_LINK_FEE, test_utils};
use icrc_ledger_types::icrc1::account::Account;
use std::sync::Arc;

#[tokio::test]
async fn it_should_create_icp_token_tip_linkv2_successfully() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let mut test_fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);

        let initial_balance = 1_000_000_000u64;
        let tip_amount = 1_000_000u64;
        let caller_account = Account {
            owner: caller,
            subaccount: None,
        };
        let icp_ledger_fee = icp_ledger_client.fee().await.unwrap();

        // Act
        test_fixture.airdrop_icp(initial_balance, &caller).await;

        // Assert
        let caller_balance_before = icp_ledger_client.balance_of(&caller_account).await.unwrap();
        assert_eq!(caller_balance_before, initial_balance);

        // Act
        let result = test_fixture
            .create_tip_link_v2(constant::ICP_TOKEN, tip_amount)
            .await;

        // Assert
        let link = result.link;
        let action = result.action;

        assert!(!link.id.is_empty());
        assert_eq!(link.link_type, LinkType::SendTip);
        assert_eq!(link.asset_info.len(), 1);
        assert_eq!(link.asset_info[0].amount_per_link_use_action, tip_amount);

        assert!(action.is_some());
        let action = action.unwrap();
        assert_eq!(action.intents.len(), 2);
        let intent1 = &action.intents[0];
        let intent2 = &action.intents[1];
        assert_eq!(intent1.task, IntentTask::TransferWalletToLink);
        match intent1.r#type {
            IntentType::Transfer(ref transfer) => {
                assert_eq!(transfer.from, Wallet::new(caller));
                assert_eq!(transfer.to, link_id_to_account(ctx, &link.id).into());
                assert_eq!(
                    transfer.amount,
                    Nat::from(test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        &icp_ledger_fee,
                        1
                    ))
                );
            }
            _ => panic!("Expected Transfer intent type"),
        }
        assert_eq!(intent1.transactions.len(), 1);
        let tx0 = &intent1.transactions[0];
        match tx0.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, link_id_to_account(ctx, &link.id).into());
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_amount_for_wallet_to_link_transfer(
                        tip_amount,
                        &icp_ledger_fee,
                        1
                    ))
                );
            }
            _ => panic!("Expected Icrc1Transfer transaction"),
        }

        assert_eq!(intent2.task, IntentTask::TransferWalletToTreasury);
        match intent2.r#type {
            IntentType::TransferFrom(ref transfer_from) => {
                assert_eq!(transfer_from.from, Wallet::new(caller));
                assert_eq!(
                    transfer_from.to,
                    Wallet::new(constant::FEE_TREASURY_PRINCIPAL)
                );
                assert_eq!(
                    transfer_from.spender,
                    Wallet::new(ctx.cashier_backend_principal)
                );
                assert_eq!(
                    transfer_from.approve_amount,
                    Some(
                        test_utils::calculate_approval_amount_for_create_link(&icp_ledger_fee)
                            .into()
                    )
                );
            }
            _ => panic!("Expected TransferFrom intent type"),
        }
        assert_eq!(intent2.transactions.len(), 2);
        let tx1 = &intent2.transactions[0];
        match tx1.protocol {
            Protocol::IC(IcTransaction::Icrc2Approve(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(
                    data.amount,
                    Nat::from(test_utils::calculate_approval_amount_for_create_link(
                        &icp_ledger_fee
                    ))
                );
            }
            _ => panic!("Expected Icrc2Approve transaction"),
        }
        let tx2 = &intent2.transactions[1];
        match tx2.protocol {
            Protocol::IC(IcTransaction::Icrc2TransferFrom(ref data)) => {
                assert_eq!(data.from, Wallet::new(caller));
                assert_eq!(data.to, Wallet::new(constant::FEE_TREASURY_PRINCIPAL));
                assert_eq!(data.spender, Wallet::new(ctx.cashier_backend_principal));
                assert_eq!(data.amount, Nat::from(CREATE_LINK_FEE));
            }
            _ => panic!("Expected Icrc2TransferFrom transaction"),
        }

        assert!(action.icrc_112_requests.is_some());
        let icrc112_requests = action.icrc_112_requests.unwrap();
        assert_eq!(icrc112_requests.len(), 1);
        let requests = &icrc112_requests[0];

        assert_eq!(requests.len(), 2);
        let req0 = &requests[0];
        assert_eq!(req0.method, "icrc1_transfer");
        assert_eq!(
            req0.canister_id,
            Principal::from_text(ICP_PRINCIPAL).unwrap()
        );

        let req1 = &requests[1];
        assert_eq!(req1.method, "icrc2_approve");
        assert_eq!(
            req1.canister_id,
            Principal::from_text(ICP_PRINCIPAL).unwrap()
        );

        Ok(())
    })
    .await
    .unwrap();
}
