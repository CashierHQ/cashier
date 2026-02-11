use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v3::{
        action_result::{CreateActionResult, ProcessActionResult},
        link_result::{LinkCreateActionResult, LinkProcessActionResult},
    },
    repository::{action::v3::ActionV3, intent::v3::IntentV3, transaction::v1::Transaction},
};
use std::collections::HashMap;
use std::pin::Pin;
