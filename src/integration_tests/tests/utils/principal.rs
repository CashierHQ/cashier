use candid::Principal;
use std::collections::HashMap;

pub fn get_user_principal(user: &str) -> Principal {
    let mut users = HashMap::new();

    users.insert(
        "user1".to_string(),
        Principal::from_text("e2mhv-sqkf2-drink-rt5cf-k5dfg-qpg74-yn7ep-aumfi-6uqpd-hyaxx-xqe")
            .unwrap(),
    );

    users.insert(
        "user2".to_string(),
        Principal::from_text("rdmx6-jaaaa-aaaaa-aaadq-cai").unwrap(),
    );

    users.insert(
        "user3".to_string(),
        Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
    );

    *users
        .get(user)
        .unwrap_or_else(|| panic!("User {user} not found"))
}
