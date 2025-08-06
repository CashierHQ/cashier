use crate::{
    cashier_backend::link::context::LinkTestContext,
    utils::{principal::get_user_principal, with_pocket_ic_context},
};
pub mod context;

pub mod create_action;
pub mod create_link;
pub mod process_action;

#[tokio::test]
async fn should_setup_environment_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller: candid::Principal = get_user_principal("user1");
        let mut context = LinkTestContext::new();

        context.setup(ctx, &caller).await;

        context.airdrop_icp(ctx, 10000000000, &caller).await; // 0.01 ICP
        context.airdrop_icrc(ctx, "ckBTC", 1000000, &caller).await; // 0.01 ckBTC

        let user = context.user.as_ref().unwrap();
        assert!(!user.id.is_empty());
        assert!(!user.wallet.is_empty());
        Ok(())
    })
    .await
    .unwrap();
}
