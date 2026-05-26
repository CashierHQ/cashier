// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::{
    TokenId,
    error::CanisterError,
    token::{AddTokenInput, AddTokensInput, RuneInfo},
};

use crate::utils::{principal::TestUser, with_pocket_ic_context};

fn fixture_of_rune_info(rune_id: &str, token_id: &str) -> RuneInfo {
    RuneInfo {
        rune_id: rune_id.to_string(),
        token_id: token_id.to_string(),
        icon: None,
    }
}

#[tokio::test]
async fn it_should_fail_do_user_add_token_batch_due_to_no_tokens_existing_in_registry() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let client = ctx.new_token_storage_client(caller);
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let input = AddTokensInput {
            token_ids: vec![AddTokenInput {
                token_id: TokenId::IC {
                    ledger_id: *doge_token,
                },
                index_id: None,
                is_rune: Some(true),
                rune_info: None,
            }],
        };

        // Act
        let result = client.user_add_token_batch(input).await.unwrap();

        // Assert
        assert!(result.is_err());
        match result {
            Err(CanisterError::HandleLogicError(message)) => {
                assert_eq!(message, "None of the provided tokens exist in the registry");
            }
            _ => panic!("Expected HandleLogicError, got {:?}", result),
        }

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_user_add_token_batch_with_valid_rune_info() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let client = ctx.new_token_storage_client(caller);
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let input = AddTokensInput {
            token_ids: vec![AddTokenInput {
                token_id: TokenId::IC {
                    ledger_id: *doge_token,
                },
                index_id: None,
                is_rune: Some(true),
                rune_info: Some(fixture_of_rune_info(
                    "840000:1",
                    "omnity-rune-token-id",
                )),
            }],
        };

        // Act
        let result = client.user_add_token_batch(input).await.unwrap();
        let list_result = client.list_tokens().await.unwrap().unwrap();

        // Assert
        assert!(result.is_ok());
        let doge_in_list = list_result
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
        assert_eq!(
            doge_in_list.rune_info,
            Some(fixture_of_rune_info(
                "840000:1",
                "omnity-rune-token-id",
            ))
        );

        Ok(())
    })
    .await
    .unwrap();
}

#[tokio::test]
async fn it_should_do_user_add_token_batch_with_only_valid_registry_tokens() {
    with_pocket_ic_context::<_, ()>(async move |ctx| {
        // Arrange
        let caller = TestUser::User1.get_principal();
        let client = ctx.new_token_storage_client(caller);
        let doge_token = ctx.icrc_token_map.get("DOGE").unwrap();
        let icp_token = candid::Principal::from_text(crate::constant::ICP_PRINCIPAL).unwrap();
        let input = AddTokensInput {
            token_ids: vec![
                AddTokenInput {
                    token_id: TokenId::IC {
                        ledger_id: *doge_token,
                    },
                    index_id: None,
                    is_rune: None,
                    rune_info: None,
                },
                AddTokenInput {
                    token_id: TokenId::IC {
                        ledger_id: icp_token,
                    },
                    index_id: None,
                    is_rune: None,
                    rune_info: None,
                },
            ],
        };

        // Act
        let result = client.user_add_token_batch(input).await.unwrap();
        let list_result = client.list_tokens().await.unwrap().unwrap();

        // Assert
        assert!(result.is_ok());
        assert!(list_result.tokens.iter().any(|token| token.id
            == TokenId::IC {
                ledger_id: *doge_token
            }));
        assert!(list_result.tokens.iter().any(|token| token.id
            == TokenId::IC {
                ledger_id: icp_token
            }));

        Ok(())
    })
    .await
    .unwrap();
}
