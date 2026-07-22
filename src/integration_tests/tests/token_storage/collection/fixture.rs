// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use token_storage_types::{
    auth::Permission,
    collection::{CollectionDto, RegistryCollection, UpsertCollectionsInput},
};

use crate::utils::{PocketIcTestContext, principal::TestUser};

/// Test fixture for CollectionManager permission setup and seeding collections
pub struct CollectionManagerFixture {
    pub collection_manager: Principal,
}

impl CollectionManagerFixture {
    /// Creates a new fixture with admin granting CollectionManager permission to another principal
    pub async fn new(ctx: &PocketIcTestContext) -> Self {
        let admin = TestUser::TokenStorageAdmin.get_principal();
        let collection_manager = TestUser::User1.get_principal();

        let admin_client = ctx.new_token_storage_client(admin);

        admin_client
            .admin_permissions_add(collection_manager, vec![Permission::CollectionManager])
            .await
            .unwrap()
            .unwrap();

        Self { collection_manager }
    }
}

/// Builds a fixture `RegistryCollection` with deterministic, distinguishable fields
pub fn fixture_of_collection(collection_id: Principal, name: &str) -> RegistryCollection {
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
    }
}

/// Seeds `n` collections into the registry as the TokenStorageAdmin, returning their DTOs
pub async fn seed_collections(ctx: &PocketIcTestContext, n: u8) -> Vec<CollectionDto> {
    let admin = TestUser::TokenStorageAdmin.get_principal();
    let admin_client = ctx.new_token_storage_client(admin);

    let collections: Vec<RegistryCollection> = (0..n)
        .map(|i| {
            let collection_id = Principal::from_slice(&[i; 1]);
            fixture_of_collection(collection_id, &format!("Collection {i}"))
        })
        .collect();

    admin_client
        .collection_manager_upsert_collections(UpsertCollectionsInput {
            collections: collections.clone(),
        })
        .await
        .unwrap()
        .unwrap();

    collections.into_iter().map(CollectionDto::from).collect()
}
