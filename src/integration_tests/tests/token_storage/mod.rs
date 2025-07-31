use candid::Principal;

use crate::utils::with_pocket_ic_context;

/// Tests that the token storage canister can be deployed.
#[tokio::test]
async fn should_deploy_the_token_storage_canister() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        assert_ne!(ctx.token_storage_principal, Principal::anonymous());
        Ok(())
    })
    .await
    .unwrap();
}
