// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod nat_serde {
    use candid::Nat;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(nat: &Nat, s: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        s.serialize_str(&nat.to_string())
    }

    pub fn deserialize<'de, D>(d: D) -> Result<Nat, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(d)?;
        s.parse::<Nat>().map_err(serde::de::Error::custom)
    }
}
