use crate::{
    cashier_backend::link::fixtures::CreateLinkTestFixture,
    utils::{principal::get_user_principal, with_pocket_ic_context},
};
pub mod fixtures;

pub mod create_action;
pub mod create_link;
pub mod process_action;

#[tokio::test]
async fn should_setup_environment_success() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let caller = get_user_principal("user1");
        let cashier_backend_client = ctx.new_cashier_backend_client(caller);
        let mut fixture = CreateLinkTestFixture::new(cashier_backend_client);

        fixture.setup_environment(ctx).await;

        assert!(!fixture.user.id.is_empty());
        assert!(!fixture.user.wallet.is_empty());
        Ok(())
    })
    .await
    .unwrap();
}
