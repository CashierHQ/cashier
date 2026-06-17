// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use gate_service_types::error::GateServiceError;
use ic_cdk::management_canister::{HttpRequestArgs, HttpRequestResult};

pub trait HttpOutcallService {
    async fn execute(&self, args: HttpRequestArgs) -> Result<HttpRequestResult, GateServiceError>;
}

pub struct IcHttpOutcallService;

impl HttpOutcallService for IcHttpOutcallService {
    async fn execute(&self, args: HttpRequestArgs) -> Result<HttpRequestResult, GateServiceError> {
        ic_cdk::management_canister::http_request(&args)
            .await
            .map_err(|e| GateServiceError::KeyVerificationFailed(e.to_string()))
    }
}

#[cfg(test)]
pub mod test_utils {
    use super::*;
    use candid::Nat;
    use std::cell::RefCell;
    use std::collections::VecDeque;

    pub struct MockHttpOutcallService {
        responses: RefCell<VecDeque<HttpRequestResult>>,
    }

    impl MockHttpOutcallService {
        pub fn new(responses: Vec<HttpRequestResult>) -> Self {
            Self {
                responses: RefCell::new(responses.into()),
            }
        }

        pub fn with_json_response(status: u32, body: &str) -> Self {
            Self::new(vec![HttpRequestResult {
                status: Nat::from(status),
                headers: vec![],
                body: body.as_bytes().to_vec(),
            }])
        }
    }

    impl HttpOutcallService for MockHttpOutcallService {
        async fn execute(
            &self,
            _args: HttpRequestArgs,
        ) -> Result<HttpRequestResult, GateServiceError> {
            self.responses.borrow_mut().pop_front().ok_or_else(|| {
                GateServiceError::KeyVerificationFailed("no mock HTTP response queued".into())
            })
        }
    }
}
