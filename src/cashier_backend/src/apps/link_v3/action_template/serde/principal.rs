// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod principal_serde {
    use candid::Principal;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(principal: &Principal, s: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        s.serialize_str(&principal.to_text())
    }

    pub fn deserialize<'de, D>(d: D) -> Result<Principal, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(d)?;
        Principal::from_text(&s).map_err(serde::de::Error::custom)
    }
}
