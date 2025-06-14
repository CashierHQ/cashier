// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)


// Create a new constant file to store the default tokens
use candid::{Nat, Principal};

use crate::api::token::types::RegisterTokenInput;

pub fn get_default_tokens() -> Vec<RegisterTokenInput> {
    vec![
        RegisterTokenInput {
            id: "IC:ryjl3-tyaaa-aaaaa-aaaba-cai".to_string(),
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap()),
            index_id: Some(Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap()),
            symbol: "ICP".to_string(),
            name: "Internet Computer".to_string(),
            decimals: 8,
            enabled_by_default: true,
            fee: Some(Nat::from(10_000u64)),
        },
        RegisterTokenInput {
            id: "IC:mxzaz-hqaaa-aaaar-qaada-cai".to_string(),
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap()),
            index_id: Some(Principal::from_text("n5wcd-faaaa-aaaar-qaaea-cai").unwrap()),
            symbol: "ckBTC".to_string(),
            name: "Chain Key Bitcoin".to_string(),
            decimals: 8,
            enabled_by_default: true,
            fee: Some(Nat::from(10u64)),
        },
        RegisterTokenInput {
            id: "IC:ss2fx-dyaaa-aaaar-qacoq-cai".to_string(),
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("ss2fx-dyaaa-aaaar-qacoq-cai").unwrap()),
            index_id: Some(Principal::from_text("s3zol-vqaaa-aaaar-qacpa-cai").unwrap()),
            symbol: "ckETH".to_string(),
            name: "Chain Key Ethereum".to_string(),
            decimals: 18,
            enabled_by_default: true,
            fee: Some(Nat::from(2_000_000_000_000u64)),
        },
        RegisterTokenInput {
            id: "IC:xevnm-gaaaa-aaaar-qafnq-cai".to_string(),
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("xevnm-gaaaa-aaaar-qafnq-cai").unwrap()),
            index_id: Some(Principal::from_text("xrs4b-hiaaa-aaaar-qafoa-cai").unwrap()),
            symbol: "ckUSDC".to_string(),
            name: "Chain Key USD Coin".to_string(),
            decimals: 8,
            enabled_by_default: true,
            fee: Some(Nat::from(10_000u64)),
        },
        RegisterTokenInput {
            id: "IC:x5qut-viaaa-aaaar-qajda-cai".to_string(),
            chain: "IC".to_string(),
            ledger_id: Some(Principal::from_text("x5qut-viaaa-aaaar-qajda-cai").unwrap()),
            index_id: None,
            symbol: "tICP".to_string(),
            name: "Test Internet Computer".to_string(),
            decimals: 8,
            enabled_by_default: true,
            fee: Some(Nat::from(10_000u64)),
        },
    ]
}
