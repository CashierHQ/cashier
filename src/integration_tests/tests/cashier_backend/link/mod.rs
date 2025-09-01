use candid::Nat;
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    cashier_backend::link::fixture::LinkTestFixture,
    utils::{principal::TestUser, with_pocket_ic_context},
};
use std::sync::Arc;

pub mod fixture;
pub mod receive_payment;
pub mod send_airdrop;
pub mod send_tip;
pub mod send_token_basket;

#[tokio::test]
async fn should_setup_environment_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller: candid::Principal = TestUser::User1.get_principal();
        let mut fixture = LinkTestFixture::new(Arc::new(ctx.clone()), &caller).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icrc_ledger_client = ctx.new_icrc_ledger_client("ckBTC", caller);

        fixture.airdrop_icp(10000000000, &caller).await; // 0.01 ICP
        fixture.airdrop_icrc("ckBTC", 1000000, &caller).await; // 0.01 ckBTC

        let account = Account {
            owner: caller,
            subaccount: None,
        };

        let icp_balance = icp_ledger_client.balance_of(&account).await.unwrap();
        let icrc_balance = icrc_ledger_client.balance_of(&account).await.unwrap();

        assert_eq!(icp_balance, Nat::from(10000000000u64));
        assert_eq!(icrc_balance, Nat::from(1000000u64));

        Ok(())
    })
    .await
    .unwrap();
}
