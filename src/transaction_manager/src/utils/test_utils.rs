// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::repository::{
    asset::v1::Asset,
    common::{Chain, Wallet},
    intent::v1::{Intent, IntentState, IntentTask, IntentType, TransferData},
    transaction::v1::{
        FromCallType, IcTransaction, Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Protocol,
        Transaction, TransactionState,
    },
};
use cashier_common::{
    constant::{CREATE_LINK_FEE, ICP_CANISTER_PRINCIPAL},
    test_utils,
};

pub fn random_id_string() -> String {
    test_utils::random_id_string()
}

pub fn random_principal_id() -> Principal {
    test_utils::random_principal_id()
}

pub mod runtime {
    use candid::Principal;
    use cashier_common::runtime::IcEnvironment;
    use ic_cdk_timers::{self, TimerId};
    use std::{cell::RefCell, future::Future, time::Duration};

    #[derive(Clone)]
    pub struct MockIcEnvironment {
        pub canister_id: Principal,
        pub current_time: u64,
        pub spawned_futures: RefCell<Vec<String>>,
        pub timers: RefCell<Vec<(Duration, String)>>,
        timer_counter: RefCell<u64>,
    }

    impl Default for MockIcEnvironment {
        fn default() -> Self {
            Self {
                canister_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
                current_time: 1640995200000000000,
                spawned_futures: RefCell::new(Vec::new()),
                timers: RefCell::new(Vec::new()),
                timer_counter: RefCell::new(0),
            }
        }
    }

    impl IcEnvironment for MockIcEnvironment {
        fn id(&self) -> Principal {
            self.canister_id
        }

        fn time(&self) -> u64 {
            self.current_time
        }

        fn spawn<F>(&self, _future: F)
        where
            F: Future<Output = ()> + 'static,
        {
            self.spawned_futures
                .borrow_mut()
                .push("spawned".to_string());
        }

        fn set_timer(&self, delay: Duration, _f: impl FnOnce() + 'static) -> TimerId {
            self.timers.borrow_mut().push((delay, "timer".to_string()));

            // Increment counter for unique timer IDs
            let mut counter = self.timer_counter.borrow_mut();
            *counter += 1;

            ic_cdk_timers::set_timer(Duration::from_secs(1), || {
                ic_cdk::println!("This is a mock timer!")
            })
        }
    }
}

pub fn generate_mock_intent(id: &str, dependencies: Vec<&str>) -> Intent {
    Intent {
        id: id.to_string(),
        state: IntentState::Created,
        created_at: 0,
        dependency: dependencies.into_iter().map(ToString::to_string).collect(),
        chain: Chain::IC,
        task: IntentTask::TransferWalletToTreasury,
        r#type: IntentType::Transfer(TransferData {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
            amount: Nat::from(100u64),
        }),
        label: "mock_intent".to_string(),
    }
}

pub fn generate_mock_transaction(id: &str, dependencies: Vec<&str>) -> Transaction {
    Transaction {
        id: id.to_string(),
        created_at: 0,
        state: TransactionState::Created,
        dependency: if dependencies.is_empty() {
            None
        } else {
            Some(dependencies.into_iter().map(ToString::to_string).collect())
        },
        group: 0,
        from_call_type: FromCallType::Canister,
        protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
            amount: Nat::from(0u64),
            memo: None,
            ts: None,
        })),
        start_ts: None,
    }
}

#[allow(clippy::too_many_arguments)]
/// Generate a mock Transaction with specified parameters
/// # Arguments
/// * `id` - The ID of the transaction
/// * `from_call_type` - The call type of the transaction (Wallet or Canister)
/// * `tx_type` - The type of IC transaction (Icrc1Transfer, Icrc2Approve, etc.)
/// * `dependencies` - A vector of dependency IDs
/// * `from` - Optional Principal for the 'from' wallet
/// * `to` - Optional Principal for the 'to' wallet
/// * `spender` - Optional Principal for the 'spender' wallet (for Icrc2Approve and Icrc2TransferFrom)
/// * `asset` - Optional Asset for the transaction
/// * `amount` - The amount for the transaction
/// # Returns
/// * `Transaction` - The generated mock transaction
pub fn generate_mock_transactions(
    id: &str,
    from_call_type: FromCallType,
    tx_type: IcTransaction,
    dependencies: Vec<&str>,
    from: Option<Principal>,
    to: Option<Principal>,
    spender: Option<Principal>,
    asset: Option<Asset>,
    amount: Nat,
) -> Transaction {
    let ic_transaction = match tx_type {
        IcTransaction::Icrc1Transfer(_) => IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: Wallet::IC {
                address: from.unwrap_or_else(Principal::anonymous),
                subaccount: None,
            },
            to: Wallet::IC {
                address: to.unwrap_or_else(Principal::anonymous),
                subaccount: None,
            },
            asset: asset.unwrap_or_default(),
            amount,
            memo: None,
            ts: None,
        }),
        IcTransaction::Icrc2Approve(_) => IcTransaction::Icrc2Approve(Icrc2Approve {
            from: Wallet::IC {
                address: from.unwrap_or_else(Principal::anonymous),
                subaccount: None,
            },
            spender: Wallet::IC {
                address: spender.unwrap_or_else(Principal::anonymous),
                subaccount: None,
            },
            asset: asset.unwrap_or_default(),
            amount,
            memo: None,
            ts: None,
        }),
        IcTransaction::Icrc2TransferFrom(_) => {
            IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
                from: Wallet::IC {
                    address: from.unwrap_or_else(Principal::anonymous),
                    subaccount: None,
                },
                to: Wallet::IC {
                    address: to.unwrap_or_else(Principal::anonymous),
                    subaccount: None,
                },
                spender: Wallet::IC {
                    address: spender.unwrap_or_else(Principal::anonymous),
                    subaccount: None,
                },
                asset: asset.unwrap_or_default(),
                amount,
                memo: None,
                ts: None,
            })
        }
    };

    Transaction {
        id: id.to_string(),
        created_at: 0,
        state: TransactionState::Created,
        dependency: if dependencies.is_empty() {
            None
        } else {
            Some(dependencies.into_iter().map(ToString::to_string).collect())
        },
        group: 0,
        from_call_type,
        protocol: Protocol::IC(ic_transaction),
        start_ts: None,
    }
}

/// Generate mock transactions for a wallet to treasury transfer flow
/// # Arguments
/// * `from` - Principal of the sender wallet
/// * `cashier_be` - Principal of the Cashier backend canister
/// * `treasury` - Principal of the treasury wallet
/// # Returns
/// * `Vec<Transaction>` - A vector of generated mock transactions
pub fn generate_mock_wallet_to_treasury_transactions(
    from: Principal,
    cashier_be: Principal,
    treasury: Principal,
) -> Vec<Transaction> {
    let id = random_id_string();
    let from_wallet = Wallet::IC {
        address: from,
        subaccount: None,
    };
    let spender_wallet = Wallet::IC {
        address: cashier_be,
        subaccount: None,
    };
    let to_wallet = Wallet::IC {
        address: treasury,
        subaccount: None,
    };
    let asset = Asset::IC {
        address: ICP_CANISTER_PRINCIPAL,
    };
    let amount = Nat::from(CREATE_LINK_FEE);
    let approval_amount = amount + Nat::from(100u64);
    let approve_tx = generate_mock_transactions(
        &format!("{}_approve", id),
        FromCallType::Wallet,
        IcTransaction::Icrc2Approve(Icrc2Approve {
            from: from_wallet.clone(),
            spender: spender_wallet.clone(),
            asset: asset.clone(),
            amount: approval_amount.clone(),
            memo: None,
            ts: None,
        }),
        vec![],
        Some(from),
        None,
        Some(treasury),
        None,
        Nat::from(100u64),
    );

    let transfer_from_tx = generate_mock_transactions(
        &format!("{}_transfer_from", id),
        FromCallType::Canister,
        IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
            from: from_wallet,
            to: to_wallet,
            spender: spender_wallet,
            asset,
            amount: approval_amount.clone(),
            memo: None,
            ts: None,
        }),
        vec![&approve_tx.id],
        Some(from),
        Some(treasury),
        Some(cashier_be),
        None,
        Nat::from(CREATE_LINK_FEE),
    );

    vec![approve_tx, transfer_from_tx]
}

/// Generate mock transactions for a wallet to link account transfer flow using ICRC-2
/// # Arguments
/// * `from` - Principal of the sender wallet
/// * `cashier_be` - Principal of the Cashier backend canister
/// * `link_account` - Principal of the link account
/// * `asset` - Asset to be transferred
/// * `amount` - Amount to be transferred
/// # Returns
/// * `Vec<Transaction>` - A vector of generated mock transactions
pub fn generate_mock_icrc2_wallet_to_link_transactions(
    from: Principal,
    cashier_be: Principal,
    link_account: Principal,
    asset: Asset,
    amount: Nat,
) -> Vec<Transaction> {
    let id = random_id_string();
    let from_wallet = Wallet::IC {
        address: from,
        subaccount: None,
    };
    let to_wallet = Wallet::IC {
        address: link_account,
        subaccount: None,
    };
    let spender_wallet = Wallet::IC {
        address: cashier_be,
        subaccount: None,
    };
    let approve_tx = generate_mock_transactions(
        &format!("{}_approve", id),
        FromCallType::Wallet,
        IcTransaction::Icrc2Approve(Icrc2Approve {
            from: from_wallet.clone(),
            spender: Wallet::IC {
                address: cashier_be,
                subaccount: None,
            },
            asset: asset.clone(),
            amount: amount.clone(),
            memo: None,
            ts: None,
        }),
        vec![],
        Some(from),
        None,
        Some(cashier_be),
        None,
        amount.clone(),
    );

    let transfer_from_tx = generate_mock_transactions(
        &format!("{}_transfer_from", id),
        FromCallType::Canister,
        IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
            from: from_wallet,
            to: to_wallet,
            spender: spender_wallet,
            asset: asset.clone(),
            amount: amount.clone(),
            memo: None,
            ts: None,
        }),
        vec![&approve_tx.id],
        Some(from),
        Some(link_account),
        Some(cashier_be),
        None,
        amount.clone(),
    );

    vec![approve_tx, transfer_from_tx]
}

/// Generate mock transactions for a wallet to link account transfer flow using ICRC-1
/// # Arguments
/// * `from` - Principal of the sender wallet
/// * `cashier_be` - Principal of the Cashier backend canister
/// * `link_account` - Principal of the link account
/// * `asset` - Asset to be transferred
/// * `amount` - Amount to be transferred
/// # Returns
/// * `Vec<Transaction>` - A vector of generated mock transactions
pub fn generate_mock_icrc1_wallet_to_link_transactions(
    from: Principal,
    cashier_be: Principal,
    link_account: Principal,
    asset: Asset,
    amount: Nat,
) -> Vec<Transaction> {
    let id = random_id_string();
    let from_wallet = Wallet::IC {
        address: from,
        subaccount: None,
    };
    let to_wallet = Wallet::IC {
        address: link_account,
        subaccount: None,
    };

    let transfer_tx = generate_mock_transactions(
        &format!("{}_transfer", id),
        FromCallType::Wallet,
        IcTransaction::Icrc1Transfer(Icrc1Transfer {
            from: from_wallet,
            to: to_wallet,
            asset: asset.clone(),
            amount: amount.clone(),
            memo: None,
            ts: None,
        }),
        vec![],
        Some(from),
        Some(link_account),
        Some(cashier_be),
        None,
        amount.clone(),
    );

    vec![transfer_tx]
}
