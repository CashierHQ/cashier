use candid::Principal;

use crate::utils::with_pocket_ic_context;

/// Tests that the cashier backend canister can be deployed.
#[tokio::test]
async fn should_deploy_the_cashier_backend_canister() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        assert_ne!(ctx.cashier_backend_principal, Principal::anonymous());
        Ok(())
    })
    .await
    .unwrap();
}
