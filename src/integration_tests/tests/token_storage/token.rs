use crate::utils::{principal::TestUser, with_pocket_ic_context};
use ic_mple_client::CanisterClientError;
use token_storage_types::{
    TokenId,
    token::{AddTokenInput, UpdateTokenInput},
};

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

#[tokio::test]
async fn should_error_update_token_enable_for_default_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());

        let tokens = client.list_tokens().await.unwrap().unwrap();
        let icp_token = tokens
            .tokens
            .iter()
            .find(|token| token.symbol == "ICP")
            .unwrap();
        let token_id = icp_token.id.clone();
        let update_input = UpdateTokenInput {
            token_id,
            is_enabled: false,
        };

        // Act
        let result = client.update_token_enable(update_input).await;

        // Assert
        assert!(result.is_err());
        if let Err(CanisterClientError::PocketIcTestError(err)) = result {
            assert!(
                err.reject_message
                    .contains("is default and cannot be toggled")
            );
        } else {
            panic!("Expected TokenStorageError, got {:?}", result);
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn should_success_update_token_enable_for_non_default_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());

        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();

        // Act : add DOGE token to user's list
        let add_input = AddTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            index_id: None,
        };
        let add_result = client.add_token(add_input).await;

        // Assert : add DOGE token
        assert!(add_result.is_ok());
        let list_result = client.list_tokens().await.unwrap().unwrap();
        let doge_in_list = list_result
            .tokens
            .iter()
            .find(|token| token.symbol == "DOGE")
            .unwrap();
        assert!(doge_in_list.enabled);

        // Act : disable DOGE token
        let update_input = UpdateTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            is_enabled: false,
        };
        let update_result = client.update_token_enable(update_input).await;

        // Assert : disable DOGE token
        assert!(update_result.is_ok());
        let list_result = client.list_tokens().await.unwrap().unwrap();
        let doge_in_list = list_result
            .tokens
            .iter()
            .find(|token| token.symbol == "DOGE")
            .unwrap();
        assert!(!doge_in_list.enabled);

        Ok(())
    })
    .await
    .unwrap();
}
