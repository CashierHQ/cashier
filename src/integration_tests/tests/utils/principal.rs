use candid::Principal;
use std::collections::HashMap;

// this method returns the principal of the user based on the input
pub fn get_user_principal(user: &str) -> Principal {
    let mut users = HashMap::new();

    users.insert(
        "user1".to_string(),
        Principal::from_text("e2mhv-sqkf2-drink-rt5cf-k5dfg-qpg74-yn7ep-aumfi-6uqpd-hyaxx-xqe")
            .unwrap(),
    );

    users.insert(
        "user2".to_string(),
        Principal::from_text("jyznm-uzarf-c7y6z-4cqm2-3axfc-obzsq-7fxmh-r7r6s-vck5w-t3w3q-yqe")
            .unwrap(),
    );

    users.insert(
        "user3".to_string(),
        Principal::from_text("gskgi-bpzev-2tv7d-ikfmc-akbym-vqphk-k62po-gr5gn-bedmt-ahsco-lqe")
            .unwrap(),
    );

    users.insert(
        "token_deployer".to_string(),
        Principal::from_text("nqla3-ljk3n-sknde-kphey-dlq2i-j3hnx-a3p2b-upf4f-yhdns-f4wjr-5qe")
            .unwrap(),
    );

    *users
        .get(user)
        .unwrap_or_else(|| panic!("User {user} not found"))
}
