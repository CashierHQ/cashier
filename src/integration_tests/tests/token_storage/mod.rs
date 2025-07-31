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

#[tokio::test]
async fn test_canister_build_data() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        let token_storage_client = ctx.new_token_storage_client(Principal::anonymous());
        let build_data = token_storage_client
            .get_canister_build_data()
            .await
            .unwrap();
        assert!(build_data.pkg_name.contains("token_storage"));

        Ok(())
    })
    .await
    .unwrap();
}
