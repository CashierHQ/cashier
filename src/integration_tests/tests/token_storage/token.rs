use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn should_register_tokens_at_startup() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());

        // Act
        let tokens = client.list_tokens().await.unwrap().unwrap();

        // Assert
        assert!(!tokens.tokens.is_empty());
        assert!(tokens.tokens.iter().any(|token| { token.symbol == "ICP" }));
        assert!(tokens.tokens.iter().all(|token| token.is_default));

        Ok(())
    })
    .await
    .unwrap();
}
