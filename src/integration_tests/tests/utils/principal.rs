use candid::Principal;

/// This enum is used to represent the test users
pub enum TestUser {
    User1,
    User2,
    User3,
    TokenDeployer,
    CashierBackendAdmin,
    TokenStorageAdmin,
    GateServiceAdmin,
}

impl TestUser {
    /// This method returns the principal of the test user
    pub fn get_principal(&self) -> Principal {
        match self {
            TestUser::User1 => Principal::from_text(
                "e2mhv-sqkf2-drink-rt5cf-k5dfg-qpg74-yn7ep-aumfi-6uqpd-hyaxx-xqe",
            )
            .unwrap(),
            TestUser::User2 => Principal::from_text(
                "jyznm-uzarf-c7y6z-4cqm2-3axfc-obzsq-7fxmh-r7r6s-vck5w-t3w3q-yqe",
            )
            .unwrap(),
            TestUser::User3 => Principal::from_text(
                "gskgi-bpzev-2tv7d-ikfmc-akbym-vqphk-k62po-gr5gn-bedmt-ahsco-lqe",
            )
            .unwrap(),
            TestUser::TokenDeployer => Principal::from_text(
                "nqla3-ljk3n-sknde-kphey-dlq2i-j3hnx-a3p2b-upf4f-yhdns-f4wjr-5qe",
            )
            .unwrap(),
            TestUser::CashierBackendAdmin => Principal::from_slice(&[1, 29]),
            TestUser::TokenStorageAdmin => Principal::from_slice(&[2, 29]),
            TestUser::GateServiceAdmin => Principal::from_slice(&[3, 29]),
        }
    }
}
