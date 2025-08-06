use candid::Nat;

use crate::{
    cashier_backend::link::fixture::LinkTestFixture,
    types::Account,
    utils::{principal::get_user_principal, with_pocket_ic_context},
};
pub mod fixture;

pub mod create_action;
pub mod create_link;
pub mod process_action;

#[tokio::test]
async fn should_setup_environment_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller: candid::Principal = get_user_principal("user1");
        let mut fixture = LinkTestFixture::new(ctx, &caller).await;

        let icp_ledger_client = ctx.new_icp_ledger_client(caller);
        let icrc_ledger_client = ctx.new_icrc_ledger_client("ckBTC", caller);

        fixture.airdrop_icp(ctx, 10000000000, &caller).await; // 0.01 ICP
        fixture.airdrop_icrc(ctx, "ckBTC", 1000000, &caller).await; // 0.01 ckBTC

        let account = Account {
            owner: caller,
            subaccount: None,
        };

        let user = fixture.setup_user().await;
        let icp_balance = icp_ledger_client.balance_of(&account).await.unwrap();
        let icrc_balance = icrc_ledger_client.balance_of(&account).await.unwrap();

        assert_eq!(icp_balance, Nat::from(10000000000u64));
        assert_eq!(icrc_balance, Nat::from(1000000u64));
        assert!(!user.id.is_empty());
        assert!(!user.wallet.is_empty());

        Ok(())
    })
    .await
    .unwrap();
}
