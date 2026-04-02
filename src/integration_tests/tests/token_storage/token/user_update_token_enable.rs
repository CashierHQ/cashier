// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::{
    TokenId,
    error::CanisterError,
    token::{AddTokenInput, UpdateTokenInput},
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

#[tokio::test]
async fn it_should_fail_do_user_update_token_enable_due_to_default_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());
        let tokens = client.list_tokens().await.unwrap().unwrap();
        let icp_token = tokens
            .tokens
            .iter()
            .find(|token| token.symbol == "ICP")
            .expect("ICP token should exist");
        let update_input = UpdateTokenInput {
            token_id: icp_token.id.clone(),
            is_enabled: false,
        };

        // Act
        let result = client.user_update_token_enable(update_input).await.unwrap();

        // Assert
        assert!(result.is_err());
        match result {
            Err(CanisterError::HandleLogicError(message)) => {
                assert!(message.contains("is default and cannot be toggled"));
            }
            _ => panic!("Expected HandleLogicError, got {:?}", result),
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_user_update_token_enable_for_non_default_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let add_input = AddTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            index_id: None,
            is_rune: None,
            rune_info: None,
        };
        client.user_add_token(add_input).await.unwrap().unwrap();

        // Act
        let disable_result = client
            .user_update_token_enable(UpdateTokenInput {
                token_id: TokenId::IC {
                    ledger_id: *doge_token,
                },
                is_enabled: false,
            })
            .await
            .unwrap();
        let tokens_after_disable = client.list_tokens().await.unwrap().unwrap();
        let enable_result = client
            .user_update_token_enable(UpdateTokenInput {
                token_id: TokenId::IC {
                    ledger_id: *doge_token,
                },
                is_enabled: true,
            })
            .await
            .unwrap();
        let tokens_after_enable = client.list_tokens().await.unwrap().unwrap();

        // Assert
        assert!(disable_result.is_ok());
        let doge_after_disable = tokens_after_disable
            .tokens
            .iter()
            .find(|token| token.id == TokenId::IC { ledger_id: *doge_token })
            .expect("DOGE token should exist after disable");
        assert!(!doge_after_disable.enabled);

        assert!(enable_result.is_ok());
        let doge_after_enable = tokens_after_enable
            .tokens
            .iter()
            .find(|token| token.id == TokenId::IC { ledger_id: *doge_token })
            .expect("DOGE token should exist after enable");
        assert!(doge_after_enable.enabled);

        Ok(())
    })
    .await
    .unwrap();
}
