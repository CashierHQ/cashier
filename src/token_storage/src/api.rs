use candid::Principal;
use ic_cdk::{query, update};

use crate::{
    repository::{token::TokenRepository, user_preference::UserPreferenceRepository},
    types::{
        AddTokenInput, Chain, RemoveTokenInput, UserPreference, UserPreferenceInput, UserToken,
        UserTokenDto,
    },
};

#[update]
pub fn add_token(input: AddTokenInput) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allow anonymous call".to_string());
    }

    let record = UserToken::try_from(input.clone())
        .map_err(|e| format!("Failed to convert AddTokenInput: {}", e))?;

    let repository = TokenRepository::new();
    repository.add_token(caller.to_text(), record);
    Ok(())
}

#[update]
pub fn remove_token(input: RemoveTokenInput) -> Result<(), String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Not allow anonymous call".to_string());
    }

    let chain =
        Chain::from_str(&input.chain).map_err(|e| format!("Failed to convert chain: {}", e))?;

    if chain == Chain::IC {
        if input.ledger_id.is_none() {
            return Err("Ledger ID is required for IC chain".to_string());
        } else {
            let repository = TokenRepository::new();

            let find = |t: &UserToken| t.chain == Chain::IC && t.icrc_ledger_id == input.ledger_id;

            // method to find the token
            repository.remove_token(&caller.to_text(), &find);
        }
    }

    Ok(())
}

#[query]
pub fn list_tokens() -> Result<Vec<UserTokenDto>, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allow anonymous call".to_string());
    }

    let repository = TokenRepository::new();
    let result = repository
        .list_tokens(&caller.to_text())
        .iter()
        .map(|token| UserTokenDto::from(token.clone()))
        .collect();

    Ok(result)
}

#[query]
pub fn get_user_preference() -> Result<UserPreference, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allow anonymous call".to_string());
    }

    let user_preference = UserPreferenceRepository::new();
    let result = user_preference.get(&caller.to_text());

    Ok(result)
}

#[update]
pub fn update_user_preference(input: UserPreferenceInput) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Not allow anonymous call".to_string());
    }

    let user_preference = UserPreferenceRepository::new();

    let record = UserPreference::try_from(input.clone())
        .map_err(|e| format!("Failed to convert UserPreferenceInput: {}", e))?;

    user_preference.update(caller.to_text(), record);

    Ok(())
}

#[query]
pub fn default_list_tokens() -> Result<Vec<UserTokenDto>, String> {
    let tokens: Vec<UserToken> = vec![
        UserToken {
            icrc_ledger_id: Some(Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap()),
            icrc_index_id: Some(Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap()),
            symbol: Some("ICP".to_string()),
            decimals: Some(8),
            enabled: true,
            unknown: true,
            chain: Chain::IC,
        },
        UserToken {
            icrc_ledger_id: Some(Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap()),
            icrc_index_id: Some(Principal::from_text("n5wcd-faaaa-aaaar-qaaea-cai").unwrap()),
            symbol: Some("ckBTC".to_string()),
            decimals: Some(8),
            enabled: true,
            unknown: true,
            chain: Chain::IC,
        },
        UserToken {
            icrc_ledger_id: Some(Principal::from_text("ss2fx-dyaaa-aaaar-qacoq-cai").unwrap()),
            icrc_index_id: Some(Principal::from_text("s3zol-vqaaa-aaaar-qacpa-cai").unwrap()),
            symbol: Some("ckETH".to_string()),
            decimals: Some(18),
            enabled: true,
            unknown: true,
            chain: Chain::IC,
        },
        UserToken {
            icrc_ledger_id: Some(Principal::from_text("xevnm-gaaaa-aaaar-qafnq-cai").unwrap()),
            icrc_index_id: Some(Principal::from_text("xrs4b-hiaaa-aaaar-qafoa-cai").unwrap()),
            symbol: Some("ckUSDC".to_string()),
            decimals: Some(8),
            enabled: true,
            unknown: true,
            chain: Chain::IC,
        },
    ];

    let tokens: Vec<UserTokenDto> = tokens
        .iter()
        .map(|token| UserTokenDto::from(token.clone()))
        .collect();

    Ok(tokens)
}

ic_cdk::export_candid!();
