// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::{
    TokenId,
    token::{AddTokenInput, RuneInfo},
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

fn fixture_of_rune_info() -> RuneInfo {
    RuneInfo {
        rune_id: "UNCOMMON•GOODS".to_string(),
        token_id: "omnity-rune-token-id".to_string(),
        icon: Some("https://ordinals.com/content/rune-icon".to_string()),
    }
}

#[tokio::test]
async fn it_should_do_list_tokens_with_default_registry_tokens_at_startup() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let client = ctx.new_token_storage_client(TestUser::TokenDeployer.get_principal());

        // Act
        let result = client.list_tokens().await.unwrap();

        // Assert
        assert!(result.is_ok());
        let token_list = result.unwrap();
        assert!(!token_list.tokens.is_empty());
        assert!(token_list.tokens.iter().any(|token| token.symbol == "ICP"));
        assert!(token_list.tokens.iter().all(|token| token.is_default));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_list_tokens_with_rune_metadata() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let client = ctx.new_token_storage_client(caller);
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let add_input = AddTokenInput {
            token_id: TokenId::IC {
                ledger_id: *doge_token,
            },
            index_id: None,
            is_rune: Some(true),
            rune_info: Some(fixture_of_rune_info()),
        };
        client.user_add_token(add_input).await.unwrap().unwrap();

        // Act
        let result = client.list_tokens().await.unwrap();

        // Assert
        assert!(result.is_ok());
        let token_list = result.unwrap();
        let doge_in_list = token_list
            .tokens
            .iter()
            .find(|token| {
                token.id
                    == TokenId::IC {
                        ledger_id: *doge_token,
                    }
            })
            .expect("DOGE token should appear in list");
        assert_eq!(doge_in_list.is_rune, Some(true));
        assert_eq!(doge_in_list.rune_info, Some(fixture_of_rune_info()));

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_list_tokens_with_user_enabled_token() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::TokenDeployer.get_principal();
        let client = ctx.new_token_storage_client(caller);
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
        let result = client.list_tokens().await.unwrap();

        // Assert
        assert!(result.is_ok());
        let token_list = result.unwrap();
        let doge_in_list = token_list
            .tokens
            .iter()
            .find(|token| {
                token.id
                    == TokenId::IC {
                        ledger_id: *doge_token,
                    }
            })
            .expect("DOGE token should appear in list");
        assert!(doge_in_list.enabled);

        Ok(())
    })
    .await
    .unwrap();
}
