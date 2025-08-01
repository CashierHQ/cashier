// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IntentTemplate {
    pub task: String,
    pub intent_type: String,
    pub chain: String,
    pub dependency: Vec<String>,
    pub intent_data: Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IntentConfig {
    pub intents: HashMap<String, Vec<IntentTemplate>>, // Mapping link_type_action_type → intents
}
