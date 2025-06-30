// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use ic_cdk::api::msg_caller;

static ANONYMOUS: Principal = Principal::anonymous();

pub fn is_not_anonymous() -> Result<(), String> {
    if msg_caller() == ANONYMOUS {
        return Err("Anonymous caller is not allowed".to_string());
    }
    Ok(())
}

pub fn is_not_admin() -> Result<(), String> {
    let caller = msg_caller();

    if caller == ANONYMOUS {
        return Err("Anonymous caller is not allowed".to_string());
    }

    let admin_principal =
        Principal::from_text("rvc37-afcl7-ag74c-jyr6z-zoprx-finqf-px5k5-dqpaa-jgmzy-jgmht-dqe")
            .map_err(|_| "Invalid admin principal".to_string())?;

    if caller != admin_principal {
        return Err("Caller is not admin".to_string());
    }

    Ok(())
}
