// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// Create a new constant file to store the default tokens
use candid::{Nat, Principal};
use token_storage_types::{chain::Chain, token::ChainTokenDetails};

use crate::types::RegistryToken;

pub fn get_default_tokens() -> Vec<RegistryToken> {
    vec![
        RegistryToken {
            chain: Chain::IC,
            details: ChainTokenDetails::IC {
                ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                index_id: Some(Principal::from_text("qhbym-qaaaa-aaaaa-aaafq-cai").unwrap()),
                fee: Nat::from(10_000u64),
            },
            symbol: "ICP".to_string(),
            name: "Internet Computer".to_string(),
            decimals: 8,
            enabled_by_default: true,
        },
        RegistryToken {
            chain: Chain::IC,
            details: ChainTokenDetails::IC {
                ledger_id: Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai").unwrap(),
                index_id: Some(Principal::from_text("n5wcd-faaaa-aaaar-qaaea-cai").unwrap()),
                fee: Nat::from(10u64),
            },
            symbol: "ckBTC".to_string(),
            name: "Chain Key Bitcoin".to_string(),
            decimals: 8,
            enabled_by_default: true,
        },
        RegistryToken {
            chain: Chain::IC,
            details: ChainTokenDetails::IC {
                ledger_id: Principal::from_text("ss2fx-dyaaa-aaaar-qacoq-cai").unwrap(),
                index_id: Some(Principal::from_text("s3zol-vqaaa-aaaar-qacpa-cai").unwrap()),
                fee: Nat::from(2_000_000_000_000u64),
            },
            symbol: "ckETH".to_string(),
            name: "Chain Key Ethereum".to_string(),
            decimals: 18,
            enabled_by_default: true,
        },
        RegistryToken {
            chain: Chain::IC,
            details: ChainTokenDetails::IC {
                ledger_id: Principal::from_text("xevnm-gaaaa-aaaar-qafnq-cai").unwrap(),
                index_id: Some(Principal::from_text("xrs4b-hiaaa-aaaar-qafoa-cai").unwrap()),
                fee: Nat::from(10_000u64),
            },
            symbol: "ckUSDC".to_string(),
            name: "Chain Key USD Coin".to_string(),
            decimals: 8,
            enabled_by_default: true,
        },
        RegistryToken {
            chain: Chain::IC,
            details: ChainTokenDetails::IC {
                ledger_id: Principal::from_text("x5qut-viaaa-aaaar-qajda-cai").unwrap(),
                index_id: None,
                fee: Nat::from(10_000u64),
            },
            symbol: "tICP".to_string(),
            name: "Test Internet Computer".to_string(),
            decimals: 8,
            enabled_by_default: true,
        },
    ]
}
