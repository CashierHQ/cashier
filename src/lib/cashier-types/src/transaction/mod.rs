// Generated versioned enum for Transaction

use candid::Nat;
use cashier_macros::storable;

pub mod v1;
pub mod v2;

// Re-export the current version types for convenience
pub use v1::*;

#[storable(serializer = "cbor")]
#[derive(Debug, Clone)]
pub enum VersionedTransaction {
    V1(Transaction),
    V2(v2::Transaction),
}

impl VersionedTransaction {
    /// Build a versioned transaction from version number and data
    pub fn build(version: u32, tx: Transaction) -> Result<Self, String> {
        match version {
            1 => Ok(VersionedTransaction::V1(tx)),
            _ => Err(format!("Unsupported version: {}", version)),
        }
    }

    pub fn build_v2(tx: v2::Transaction) -> Result<Self, String> {
        Ok(VersionedTransaction::V2(tx))
    }

    /// Get the version number of this versioned transaction
    pub fn get_version(&self) -> u32 {
        match self {
            VersionedTransaction::V1(_) => 1,
            VersionedTransaction::V2(_) => 2,
        }
    }

    /// Get the ID from the versioned transaction
    pub fn get_id(&self) -> String {
        match self {
            VersionedTransaction::V1(tx) => tx.id.clone(),
            VersionedTransaction::V2(tx) => tx.id.clone(),
        }
    }

    /// Convert to the latest Transaction format
    pub fn into_transaction(self) -> Transaction {
        match self {
            VersionedTransaction::V1(tx) => tx,
            VersionedTransaction::V2(tx) => Self::convert_v2_to_v1(tx),
        }
    }

    /// Convert to V2 Transaction format
    pub fn to_v2(self) -> v2::Transaction {
        match self {
            VersionedTransaction::V1(tx) => Self::convert_v1_to_v2(tx),
            VersionedTransaction::V2(tx) => tx,
        }
    }

    /// Convert V1 Transaction to V2 Transaction
    pub fn convert_v1_to_v2(v1_tx: Transaction) -> v2::Transaction {
        v2::Transaction {
            id: v1_tx.id,
            created_at: v1_tx.created_at,
            state: match v1_tx.state {
                v1::TransactionState::Created => v2::TransactionState::Created,
                v1::TransactionState::Processing => v2::TransactionState::Processing,
                v1::TransactionState::Success => v2::TransactionState::Success,
                v1::TransactionState::Fail => v2::TransactionState::Fail,
            },
            dependency: v1_tx.dependency,
            group: v1_tx.group,
            from_call_type: match v1_tx.from_call_type {
                v1::FromCallType::Canister => v2::FromCallType::Canister,
                v1::FromCallType::Wallet => v2::FromCallType::Wallet,
            },
            protocol: match v1_tx.protocol {
                v1::Protocol::IC(ic_tx) => v2::Protocol::IC(match ic_tx {
                    v1::IcTransaction::Icrc1Transfer(transfer) => {
                        v2::IcTransaction::Icrc1Transfer(v2::Icrc1Transfer {
                            from: transfer.from,
                            to: transfer.to,
                            asset: transfer.asset,
                            amount: Nat::from(transfer.amount),
                            memo: transfer.memo,
                            ts: transfer.ts,
                        })
                    }
                    v1::IcTransaction::Icrc2Approve(approve) => {
                        v2::IcTransaction::Icrc2Approve(v2::Icrc2Approve {
                            from: approve.from,
                            spender: approve.spender,
                            asset: approve.asset,
                            amount: Nat::from(approve.amount),
                            memo: approve.memo,
                        })
                    }
                    v1::IcTransaction::Icrc2TransferFrom(transfer_from) => {
                        v2::IcTransaction::Icrc2TransferFrom(v2::Icrc2TransferFrom {
                            from: transfer_from.from,
                            to: transfer_from.to,
                            spender: transfer_from.spender,
                            asset: transfer_from.asset,
                            amount: Nat::from(transfer_from.amount),
                            memo: transfer_from.memo,
                            ts: transfer_from.ts,
                        })
                    }
                }),
            },
            start_ts: v1_tx.start_ts,
        }
    }

    /// Convert V2 Transaction to V1 Transaction
    /// # Note: This is a simplified conversion, actual conversion may require more fields
    pub fn convert_v2_to_v1(v2_tx: v2::Transaction) -> Transaction {
        Transaction {
            id: v2_tx.id,
            created_at: v2_tx.created_at,
            state: match v2_tx.state {
                v2::TransactionState::Created => v1::TransactionState::Created,
                v2::TransactionState::Processing => v1::TransactionState::Processing,
                v2::TransactionState::Success => v1::TransactionState::Success,
                v2::TransactionState::Fail => v1::TransactionState::Fail,
            },
            dependency: v2_tx.dependency,
            group: v2_tx.group,
            from_call_type: match v2_tx.from_call_type {
                v2::FromCallType::Canister => v1::FromCallType::Canister,
                v2::FromCallType::Wallet => v1::FromCallType::Wallet,
            },
            protocol: match v2_tx.protocol {
                v2::Protocol::IC(ic_tx) => match ic_tx {
                    v2::IcTransaction::Icrc1Transfer(transfer) => {
                        v1::Protocol::IC(v1::IcTransaction::Icrc1Transfer(v1::Icrc1Transfer {
                            from: transfer.from,
                            to: transfer.to,
                            asset: transfer.asset,
                            amount: 0u64,
                            memo: transfer.memo,
                            ts: transfer.ts,
                        }))
                    }
                    v2::IcTransaction::Icrc2Approve(approve) => {
                        v1::Protocol::IC(v1::IcTransaction::Icrc2Approve(v1::Icrc2Approve {
                            from: approve.from,
                            spender: approve.spender,
                            asset: approve.asset,
                            amount: 0u64,
                            memo: approve.memo,
                        }))
                    }
                    v2::IcTransaction::Icrc2TransferFrom(transfer_from) => v1::Protocol::IC(
                        v1::IcTransaction::Icrc2TransferFrom(v1::Icrc2TransferFrom {
                            from: transfer_from.from,
                            to: transfer_from.to,
                            spender: transfer_from.spender,
                            asset: transfer_from.asset,
                            amount: 0u64,
                            memo: transfer_from.memo,
                            ts: transfer_from.ts,
                        }),
                    ),
                },
            },
            start_ts: v2_tx.start_ts,
        }
    }
}
