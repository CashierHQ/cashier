// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use ic_mple_structures::Codec;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Collections are IC-only in phase 1, unlike `TokenId` this is a plain alias, not an enum.
pub type CollectionId = Principal;

/// Central registry collection definition
#[storable]
#[derive(CandidType, Clone, Eq, PartialEq, Debug)]
pub struct RegistryCollection {
    pub collection_id: CollectionId,
    pub name: String,
    pub description: String,
    pub image: String,
    pub total_items: u64,
    pub floor_price: Option<Nat>,
    pub royalty: Option<u64>,
    pub creator: Principal,
    pub standard: String,
    pub is_cashier: bool,
    #[serde(default)]
    pub is_default: bool,
}

#[storable]
pub enum RegistryCollectionCodec {
    V1(RegistryCollection),
}

impl Codec<RegistryCollection> for RegistryCollectionCodec {
    fn decode(source: Self) -> RegistryCollection {
        match source {
            RegistryCollectionCodec::V1(collection) => collection,
        }
    }

    fn encode(dest: RegistryCollection) -> Self {
        RegistryCollectionCodec::V1(dest)
    }
}

/// Per-user enabled-collections set. No `version` field (unlike `UserTokenList`) — collections
/// have no default-enable/registry-version-sync mechanism in phase 1; every collection starts
/// disabled for every user until they explicitly enable it.
#[storable]
pub enum UserCollectionCodec {
    V1(HashSet<CollectionId>),
}

impl Codec<HashSet<CollectionId>> for UserCollectionCodec {
    fn decode(source: Self) -> HashSet<CollectionId> {
        match source {
            UserCollectionCodec::V1(set) => set,
        }
    }

    fn encode(dest: HashSet<CollectionId>) -> Self {
        UserCollectionCodec::V1(dest)
    }
}

/// DTO for a collection, returned to callers. Deliberately has no `is_enabled` field —
/// `list_collections` is a public/anonymous-ok registry browse, while per-user enabled state
/// is fetched separately via `user_get_enabled_collections` and joined client-side.
#[derive(CandidType, Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct CollectionDto {
    pub collection_id: CollectionId,
    pub name: String,
    pub description: String,
    pub image: String,
    pub total_items: u64,
    pub floor_price: Option<Nat>,
    pub royalty: Option<u64>,
    pub creator: Principal,
    pub standard: String,
    pub is_cashier: bool,
    pub is_default: bool,
}

impl From<RegistryCollection> for CollectionDto {
    fn from(collection: RegistryCollection) -> Self {
        Self {
            collection_id: collection.collection_id,
            name: collection.name,
            description: collection.description,
            image: collection.image,
            total_items: collection.total_items,
            floor_price: collection.floor_price,
            royalty: collection.royalty,
            creator: collection.creator,
            standard: collection.standard,
            is_cashier: collection.is_cashier,
            is_default: collection.is_default,
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ListCollectionsInput {
    pub start: Option<u32>,
    pub limit: Option<u32>,
    pub is_default: Option<bool>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct EnableCollectionInput {
    pub collection_id: CollectionId,
    pub is_enabled: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct EnableCollectionsInput {
    pub collection_ids: Vec<CollectionId>,
}

/// Wire input for the offchain sync script's upsert call. Reuses `RegistryCollection` directly
/// since the script has already aggregated full metadata from its 3 data sources.
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UpsertCollectionsInput {
    pub collections: Vec<RegistryCollection>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UpsertCollectionsResult {
    pub upserted: u32,
}

#[derive(CandidType, Clone, Debug, Serialize, Deserialize)]
pub struct CollectionRegistryStats {
    pub total_collections: usize,
    pub total_cashier: usize,
}

/// Validate a collection's required text fields.
/// # Arguments
/// * `collection` - The collection to validate
/// # Returns
/// * `Ok(())` if `name` and `standard` are both non-empty.
/// * `Err(String)` describing the first invalid field otherwise.
pub fn validate_collection_input(collection: &RegistryCollection) -> Result<(), String> {
    if collection.name.trim().is_empty() {
        return Err(format!(
            "collection '{}': name must not be empty",
            collection.collection_id
        ));
    }
    if collection.standard.trim().is_empty() {
        return Err(format!(
            "collection '{}': standard must not be empty",
            collection.collection_id
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use ic_mple_structures::Storable;

    fn fixture_of_collection(collection_id: Principal, name: &str) -> RegistryCollection {
        RegistryCollection {
            collection_id,
            name: name.to_string(),
            description: format!("{name} description"),
            image: "https://example.com/image.png".to_string(),
            total_items: 100,
            floor_price: Some(Nat::from(10u64)),
            royalty: Some(5),
            creator: collection_id,
            standard: "EXT".to_string(),
            is_cashier: false,
            is_default: false,
        }
    }

    #[test]
    fn it_should_roundtrip_v1_codec() {
        // Arrange
        let collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        );

        // Act
        let codec = RegistryCollectionCodec::encode(collection.clone());
        let bytes = codec.to_bytes();
        let decoded_codec = RegistryCollectionCodec::from_bytes(bytes);
        let result: RegistryCollection = RegistryCollectionCodec::decode(decoded_codec);

        // Assert
        assert_eq!(result, collection);
    }

    #[test]
    fn it_should_roundtrip_v1_codec_with_is_default_true() {
        // Arrange
        let mut collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        );
        collection.is_default = true;

        // Act
        let codec = RegistryCollectionCodec::encode(collection.clone());
        let bytes = codec.to_bytes();
        let decoded_codec = RegistryCollectionCodec::from_bytes(bytes);
        let result: RegistryCollection = RegistryCollectionCodec::decode(decoded_codec);

        // Assert
        assert_eq!(result, collection);
        assert!(result.is_default);
    }

    #[test]
    fn it_should_deserialize_legacy_bytes_without_is_default_field() {
        use ic_mple_structures::Storable;

        // Mirrors the pre-`is_default` shape of `RegistryCollection`/`RegistryCollectionCodec`,
        // to prove old stable-memory bytes (written before this field existed) still decode
        // correctly via `#[serde(default)]` rather than requiring a versioned codec bump.
        #[derive(serde::Serialize)]
        struct OldRegistryCollectionShape {
            collection_id: CollectionId,
            name: String,
            description: String,
            image: String,
            total_items: u64,
            floor_price: Option<Nat>,
            royalty: Option<u64>,
            creator: Principal,
            standard: String,
            is_cashier: bool,
        }

        #[derive(serde::Serialize)]
        enum OldRegistryCollectionCodec {
            V1(OldRegistryCollectionShape),
        }

        // Arrange
        let collection_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let legacy = OldRegistryCollectionShape {
            collection_id,
            name: "Bored Ape".to_string(),
            description: "Bored Ape description".to_string(),
            image: "https://example.com/image.png".to_string(),
            total_items: 100,
            floor_price: Some(Nat::from(10u64)),
            royalty: Some(5),
            creator: collection_id,
            standard: "EXT".to_string(),
            is_cashier: false,
        };

        let mut bytes = Vec::new();
        ciborium::into_writer(&OldRegistryCollectionCodec::V1(legacy), &mut bytes)
            .expect("should be able to serialize legacy codec shape to cbor");

        // Act
        let decoded_codec = RegistryCollectionCodec::from_bytes(std::borrow::Cow::Owned(bytes));
        let result: RegistryCollection = RegistryCollectionCodec::decode(decoded_codec);

        // Assert
        assert_eq!(result.collection_id, collection_id);
        assert_eq!(result.name, "Bored Ape");
        assert_eq!(result.description, "Bored Ape description");
        assert_eq!(result.image, "https://example.com/image.png");
        assert_eq!(result.total_items, 100);
        assert_eq!(result.floor_price, Some(Nat::from(10u64)));
        assert_eq!(result.royalty, Some(5));
        assert_eq!(result.creator, collection_id);
        assert_eq!(result.standard, "EXT");
        assert!(!result.is_cashier);
        assert!(!result.is_default);
    }

    #[test]
    fn it_should_roundtrip_user_collection_codec() {
        // Arrange
        let collection_id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let set: HashSet<CollectionId> = vec![collection_id].into_iter().collect();

        // Act
        let codec = UserCollectionCodec::encode(set.clone());
        let bytes = codec.to_bytes();
        let decoded_codec = UserCollectionCodec::from_bytes(bytes);
        let result: HashSet<CollectionId> = UserCollectionCodec::decode(decoded_codec);

        // Assert
        assert_eq!(result, set);
    }

    #[test]
    fn it_should_convert_registry_collection_into_dto() {
        // Arrange
        let collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        );

        // Act
        let dto = CollectionDto::from(collection.clone());

        // Assert
        assert_eq!(dto.collection_id, collection.collection_id);
        assert_eq!(dto.name, collection.name);
        assert_eq!(dto.is_default, collection.is_default);
    }

    #[test]
    fn it_should_fail_validate_collection_input_due_to_empty_name() {
        // Arrange
        let mut collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        );
        collection.name = "  ".to_string();

        // Act
        let result = validate_collection_input(&collection);

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("name must not be empty"));
    }

    #[test]
    fn it_should_fail_validate_collection_input_due_to_empty_standard() {
        // Arrange
        let mut collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        );
        collection.standard = "".to_string();

        // Act
        let result = validate_collection_input(&collection);

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("standard must not be empty"));
    }

    #[test]
    fn it_should_pass_validate_collection_input() {
        // Arrange
        let collection = fixture_of_collection(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
            "Bored Ape",
        );

        // Act
        let result = validate_collection_input(&collection);

        // Assert
        assert!(result.is_ok());
    }
}
