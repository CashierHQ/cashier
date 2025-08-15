use candid::Principal;

use crate::utils::with_pocket_ic_context;

pub mod link;
pub mod rate_limit;
pub mod request_lock;
pub mod upgrade;

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

/// Tests that the `get_canister_build_data` method of the cashier backend canister works.
#[tokio::test]
async fn test_canister_build_data() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let cashier_backend_client = ctx.new_cashier_backend_client(Principal::anonymous());
        let build_data = cashier_backend_client
            .get_canister_build_data()
            .await
            .unwrap();
        assert!(build_data.pkg_name.contains("cashier_backend"));

        Ok(())
    })
    .await
    .unwrap();
}
