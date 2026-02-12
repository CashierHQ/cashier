use std::borrow::Cow;
use std::fmt::Display;

use candid::CandidType;
use cashier_common::chain::Chain;
use cashier_macros::storable;
use ic_mple_structures::{Codec, RefCodec};
use serde::{Deserialize, Serialize};

use crate::{IndexId, LedgerId, user::UserPreference};

/// Supported ICRC standards for IC tokens
#[derive(CandidType, Clone, Eq, PartialEq, Debug, Hash)]
#[storable]
pub enum IcrcStandard {
    ICRC1,
    ICRC2,
    ICRC3,
}

impl IcrcStandard {
    /// Parse from standard name string (e.g. "ICRC-1")
    pub fn from_name(name: &str) -> Option<Self> {
        match name {
            "ICRC-1" => Some(Self::ICRC1),
            "ICRC-2" => Some(Self::ICRC2),
            "ICRC-3" => Some(Self::ICRC3),
            _ => None,
        }
    }
}

/// A token identifier
#[derive(CandidType, Clone, Eq, PartialEq, Debug, Hash, Ord, PartialOrd)]
#[storable]
pub enum TokenId {
    /// IC token
    IC {
        /// The ledger canister id for the token
        ledger_id: LedgerId,
    },
}

impl TokenId {
    /// Returns the chain id
    pub fn chain(&self) -> Chain {
        match self {
            TokenId::IC { .. } => Chain::IC,
        }
    }
}

impl Display for TokenId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TokenId::IC { ledger_id } => write!(f, "IC:{}", ledger_id),
        }
    }
}

#[derive(CandidType, Clone, Eq, PartialEq, Debug, Serialize, Deserialize)]
pub enum ChainTokenDetails {
    IC {
        ledger_id: LedgerId,
        index_id: Option<IndexId>,
        fee: candid::Nat,
        supported_standards: Vec<IcrcStandard>,
    },
}

/// Record returned by icrc10_supported_standards query
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SupportedStandardRecord {
    pub name: String,
    pub url: String,
}

impl From<Vec<SupportedStandardRecord>> for IcrcStandards {
    fn from(records: Vec<SupportedStandardRecord>) -> Self {
        IcrcStandards(
            records
                .iter()
                .filter_map(|r| IcrcStandard::from_name(&r.name))
                .collect(),
        )
    }
}

/// Newtype wrapper for `Vec<IcrcStandard>` to enable `From` trait implementations
pub struct IcrcStandards(pub Vec<IcrcStandard>);

impl ChainTokenDetails {
    pub fn index_id(&self) -> Option<IndexId> {
        match self {
            ChainTokenDetails::IC { index_id, .. } => *index_id,
            // Handle other chains if needed
        }
    }

    /// Returns the chain type
    pub fn chain(&self) -> Chain {
        match self {
            ChainTokenDetails::IC { .. } => Chain::IC,
        }
    }

    /// Returns the token_id
    pub fn token_id(&self) -> TokenId {
        match self {
            ChainTokenDetails::IC { ledger_id, .. } => TokenId::IC {
                ledger_id: *ledger_id,
            },
        }
    }

    /// Check if token supports a specific ICRC standard
    pub fn supports_standard(&self, standard: &IcrcStandard) -> bool {
        match self {
            ChainTokenDetails::IC {
                supported_standards,
                ..
            } => supported_standards.contains(standard),
        }
    }

    /// Check if token supports ICRC-2 (approve/transfer_from)
    pub fn supports_icrc2(&self) -> bool {
        self.supports_standard(&IcrcStandard::ICRC2)
    }
}

// Central registry token definition
#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct RegistryToken {
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub details: ChainTokenDetails,
    pub enabled_by_default: bool, // Indicates if the token is enabled by default
}

/// V1 snapshot of ChainTokenDetails (before supported_standards)
#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub enum ChainTokenDetailsV1 {
    IC {
        ledger_id: LedgerId,
        index_id: Option<IndexId>,
        fee: candid::Nat,
    },
}

/// V1 snapshot of RegistryToken (before supported_standards)
#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct RegistryTokenV1 {
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub details: ChainTokenDetailsV1,
    pub enabled_by_default: bool,
}

#[storable]
pub enum RegistryTokenCodec {
    V1(RegistryTokenV1),
    V2(RegistryToken),
}

impl Codec<RegistryToken> for RegistryTokenCodec {
    fn decode(source: Self) -> RegistryToken {
        match source {
            RegistryTokenCodec::V1(old) => {
                let ChainTokenDetailsV1::IC {
                    ledger_id,
                    index_id,
                    fee,
                } = old.details;
                RegistryToken {
                    symbol: old.symbol,
                    name: old.name,
                    decimals: old.decimals,
                    details: ChainTokenDetails::IC {
                        ledger_id,
                        index_id,
                        fee,
                        supported_standards: vec![IcrcStandard::ICRC1],
                    },
                    enabled_by_default: old.enabled_by_default,
                }
            }
            RegistryTokenCodec::V2(token) => token,
        }
    }

    fn encode(dest: RegistryToken) -> Self {
        RegistryTokenCodec::V2(dest)
    }
}

impl From<RegistryToken> for TokenDto {
    fn from(token: RegistryToken) -> Self {
        let token_id = token.details.token_id();
        Self {
            string_id: token_id.to_string(),
            id: token_id,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            chain: token.details.chain(),
            enabled: token.enabled_by_default,
            balance: None,
            details: token.details, // Directly use the enum
            is_default: token.enabled_by_default,
        }
    }
}

/// DTO for all tokens, flexible for all chains
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct TokenDto {
    pub id: TokenId,
    /// This is a string representation of the token id.
    /// It is always generated from the token_id.
    pub string_id: String,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub chain: Chain,
    pub enabled: bool,
    pub balance: Option<u128>,
    pub details: ChainTokenDetails, // Use the enum for chain-specific details
    pub is_default: bool,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddTokenInput {
    pub token_id: TokenId,
    pub index_id: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddTokensInput {
    pub token_ids: Vec<TokenId>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UpdateTokenInput {
    pub token_id: TokenId,
    pub is_enabled: bool,
}

// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TokenListResponse {
    pub tokens: Vec<TokenDto>,
    pub need_update_version: bool,
    // only exist if user is not anonymous
    pub perference: Option<UserPreference>,
}

/// The input for updating a token's supported standards
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct UpdateTokenStandardsInput {
    pub token_id: TokenId,
    pub supported_standards: Vec<IcrcStandard>,
}

/// The input for updating a token's status (enable/disable)
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct UpdateTokenBalanceInput {
    pub token_id: TokenId,
    pub balance: u128,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct RegisterTokenInput {
    pub id: String,
    pub chain: String,
    pub ledger_id: Option<LedgerId>,
    pub index_id: Option<IndexId>,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub enabled_by_default: bool,
    pub fee: Option<candid::Nat>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AddTokenItem {
    pub chain: String,
    pub ledger_id: Option<LedgerId>,
    pub index_id: Option<IndexId>,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub fee: Option<candid::Nat>,
}

impl From<RegisterTokenInput> for AddTokenItem {
    fn from(input: RegisterTokenInput) -> Self {
        Self {
            chain: input.chain,
            ledger_id: input.ledger_id,
            index_id: input.index_id,
            symbol: input.symbol,
            name: input.name,
            decimals: input.decimals,
            fee: input.fee,
        }
    }
}

impl From<AddTokenItem> for RegisterTokenInput {
    fn from(item: AddTokenItem) -> Self {
        let id = format!("{}:{}", item.chain, item.ledger_id.unwrap());
        Self {
            id,
            chain: item.chain,
            ledger_id: item.ledger_id,
            index_id: item.index_id,
            symbol: item.symbol,
            name: item.name,
            decimals: item.decimals,
            enabled_by_default: false, // Default value
            fee: item.fee,
        }
    }
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct RegistryStats {
    pub total_tokens: usize,
    pub total_enabled_default: usize,
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct UserTokens {
    pub enabled: usize,
    pub registry_tokens: usize,
    pub version: u64,
}

#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct TokenBalance {
    pub balance: u128,
    pub last_updated: u64, // Timestamp
}

#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct TokenRegistryMetadata {
    pub version: u64,
    pub last_updated: u64, // Timestamp
}

impl Default for TokenRegistryMetadata {
    fn default() -> Self {
        Self {
            version: 1,
            last_updated: 0,
        }
    }
}

#[storable]
pub enum TokenRegistryMetadataCodec {
    V1(TokenRegistryMetadata),
}

impl RefCodec<TokenRegistryMetadata> for TokenRegistryMetadataCodec {
    fn decode_ref(source: &Self) -> Cow<'_, TokenRegistryMetadata> {
        match source {
            TokenRegistryMetadataCodec::V1(link) => Cow::Borrowed(link),
        }
    }

    fn encode(dest: TokenRegistryMetadata) -> Self {
        TokenRegistryMetadataCodec::V1(dest)
    }
}

#[cfg(test)]
mod tests {
    use candid::Principal;

    use super::*;

    #[test]
    fn it_should_return_ic_chain_type_from_details() {
        let details = ChainTokenDetails::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            index_id: None,
            fee: 0u64.into(),
            supported_standards: vec![IcrcStandard::ICRC1],
        };
        assert_eq!(details.chain(), Chain::IC);
    }

    #[test]
    fn it_should_return_ic_token_id_from_details() {
        let details = ChainTokenDetails::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            index_id: None,
            fee: 0u64.into(),
            supported_standards: vec![IcrcStandard::ICRC1],
        };
        assert_eq!(
            details.token_id(),
            TokenId::IC {
                ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap()
            }
        );
    }

    #[test]
    fn it_should_check_supports_icrc2() {
        let details_with = ChainTokenDetails::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            index_id: None,
            fee: 0u64.into(),
            supported_standards: vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
        };
        assert!(details_with.supports_icrc2());

        let details_without = ChainTokenDetails::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            index_id: None,
            fee: 0u64.into(),
            supported_standards: vec![IcrcStandard::ICRC1],
        };
        assert!(!details_without.supports_icrc2());
    }

    #[test]
    fn it_should_parse_icrc_standard_from_name() {
        assert_eq!(IcrcStandard::from_name("ICRC-1"), Some(IcrcStandard::ICRC1));
        assert_eq!(IcrcStandard::from_name("ICRC-2"), Some(IcrcStandard::ICRC2));
        assert_eq!(IcrcStandard::from_name("ICRC-3"), Some(IcrcStandard::ICRC3));
        assert_eq!(IcrcStandard::from_name("ICRC-99"), None);
        assert_eq!(IcrcStandard::from_name(""), None);
    }

    #[test]
    fn it_should_decode_v1_codec_with_default_standards() {
        use ic_mple_structures::Storable;

        let v1 = RegistryTokenV1 {
            symbol: "ICP".to_string(),
            name: "Internet Computer".to_string(),
            decimals: 8,
            details: ChainTokenDetailsV1::IC {
                ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                index_id: None,
                fee: 10_000u64.into(),
            },
            enabled_by_default: true,
        };

        // Serialize as V1
        let v1_codec = RegistryTokenCodec::V1(v1);
        let bytes = v1_codec.to_bytes();

        // Deserialize and decode
        let decoded_codec = RegistryTokenCodec::from_bytes(bytes);
        let token: RegistryToken = RegistryTokenCodec::decode(decoded_codec);

        assert_eq!(token.symbol, "ICP");
        assert_eq!(token.name, "Internet Computer");
        assert_eq!(token.decimals, 8);
        assert_eq!(token.enabled_by_default, true);
        match &token.details {
            ChainTokenDetails::IC { supported_standards, .. } => {
                assert_eq!(*supported_standards, vec![IcrcStandard::ICRC1]);
            }
        }
    }

    #[test]
    fn it_should_roundtrip_v2_codec() {
        use ic_mple_structures::Storable;

        let token = RegistryToken {
            symbol: "ckBTC".to_string(),
            name: "Chain-key Bitcoin".to_string(),
            decimals: 8,
            details: ChainTokenDetails::IC {
                ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                index_id: None,
                fee: 10u64.into(),
                supported_standards: vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
            },
            enabled_by_default: false,
        };

        // Encode → serialize → deserialize → decode
        let codec = RegistryTokenCodec::encode(token.clone());
        let bytes = codec.to_bytes();
        let decoded_codec = RegistryTokenCodec::from_bytes(bytes);
        let result: RegistryToken = RegistryTokenCodec::decode(decoded_codec);

        assert_eq!(result.symbol, "ckBTC");
        assert_eq!(result.decimals, 8);
        assert_eq!(result.enabled_by_default, false);
        match &result.details {
            ChainTokenDetails::IC { supported_standards, .. } => {
                assert_eq!(*supported_standards, vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2]);
            }
        }
    }

    #[test]
    fn it_should_return_ic_chain_type_from_token_id() {
        let token_id = TokenId::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
        };
        assert_eq!(token_id.chain(), Chain::IC);
    }

    #[test]
    fn it_should_return_ic_token_id_string_representation_from_token_id() {
        let token_id = TokenId::IC {
            ledger_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
        };
        assert_eq!(token_id.to_string(), "IC:ryjl3-tyaaa-aaaaa-aaaba-cai");
    }
}
