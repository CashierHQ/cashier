// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_cdk::api::msg_caller;

static ANONYMOUS: Principal = Principal::anonymous();

pub fn is_not_anonymous() -> Result<(), String> {
    let caller = msg_caller();
    assert!(caller != ANONYMOUS, "Anonymous caller is not allowed");
    Ok(())
}

pub fn is_not_admin() -> Result<(), String> {
    let caller = msg_caller();
    assert!(caller != ANONYMOUS, "Anonymous caller is not allowed");
    let msg = "Caller is not admin".to_string();
    assert!(
        caller
            == Principal::from_text(
                "rvc37-afcl7-ag74c-jyr6z-zoprx-finqf-px5k5-dqpaa-jgmzy-jgmht-dqe"
            )
            .unwrap(),
        "{}",
        msg
    );
    Ok(())
}
