use candid::Principal;
use ic_cdk::update;

use crate::{
    repository::{token_registry::TokenRegistryRepository, user_token::TokenRepository},
    types::{RegisterTokenInput, TokenId},
};

// Token Registry Management APIs
#[update]
pub fn register_token(input: RegisterTokenInput) -> Result<TokenId, String> {
    let caller = ic_cdk::caller();

    // Only admin can register tokens (you may want to add proper access control)
    // if caller != admin_principal() {
    //     return Err("Not authorized to register tokens".to_string());
    // }

    let registry = TokenRegistryRepository::new();
    registry.register_token(input)
}

// Administrative APIs
#[update]
pub fn reset_user_tokens(address: String) -> Result<(), String> {
    // Admin check should be implemented here
    let caller = ic_cdk::caller();

    // Example simple admin check
    // if caller != Principal::from_text("your-admin-principal-id").unwrap() {
    //     return Err("Not authorized for admin operations".to_string());
    // }

    let token_repository = TokenRepository::new();
    token_repository.reset_token_list(&address);
    Ok(())
}

#[update]
pub fn initialize_registry() -> Result<(), String> {
    // Admin check should be implemented here
    let caller = ic_cdk::caller();

    // Example simple admin check
    // if caller != Principal::from_text("your-admin-principal-id").unwrap() {
    //     return Err("Not authorized for admin operations".to_string());
    // }

    let registry = TokenRegistryRepository::new();

    let default_tokens = vec![
        RegisterTokenInput {
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap()),
            index_id: Some(Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap()),
            symbol: "ICP".to_string(),
            name: "Internet Computer".to_string(),
            decimals: 8,
            logo_url: None,
            is_default: Some(true),
        },
        RegisterTokenInput {
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap()),
            index_id: Some(Principal::from_text("n5wcd-faaaa-aaaar-qaaea-cai").unwrap()),
            symbol: "ckBTC".to_string(),
            name: "Chain Key Bitcoin".to_string(),
            decimals: 8,
            logo_url: None,
            is_default: Some(true),
        },
        RegisterTokenInput {
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("ss2fx-dyaaa-aaaar-qacoq-cai").unwrap()),
            index_id: Some(Principal::from_text("s3zol-vqaaa-aaaar-qacpa-cai").unwrap()),
            symbol: "ckETH".to_string(),
            name: "Chain Key Ethereum".to_string(),
            decimals: 18,
            logo_url: None,
            is_default: Some(true),
        },
        RegisterTokenInput {
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("xevnm-gaaaa-aaaar-qafnq-cai").unwrap()),
            index_id: Some(Principal::from_text("xrs4b-hiaaa-aaaar-qafoa-cai").unwrap()),
            symbol: "ckUSDC".to_string(),
            name: "Chain Key USD Coin".to_string(),
            decimals: 8,
            logo_url: None,
            is_default: Some(true),
        },
        RegisterTokenInput {
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("x5qut-viaaa-aaaar-qajda-cai").unwrap()),
            index_id: None,
            symbol: "tICP".to_string(),
            name: "Test Internet Computer".to_string(),
            decimals: 8,
            logo_url: None,
            is_default: Some(true),
        },
    ];

    registry.add_bulk_tokens(default_tokens)?;

    Ok(())
}
