// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat};
use cashier_macros::storable;
use derive_more::Display;
use ic_mple_structures::Codec;
use icrc_ledger_types::{
    icrc1::{
        account::Account,
        transfer::{Memo, TransferArg},
    },
    icrc2::transfer_from::TransferFromArgs,
};
use serde::{Deserialize, Serialize};

use crate::repository::{asset::v1::Asset, common::Wallet};

#[derive(Debug, Clone, PartialEq, Eq)]
#[storable]
pub struct Transaction {
    pub id: String,
    pub created_at: u64,
    pub state: TransactionState,
    pub dependency: Option<Vec<String>>,
    pub group: u16,
    pub from_call_type: FromCallType,
    pub protocol: Protocol,
    pub start_ts: Option<u64>,
}

#[storable]
pub enum TransactionCodec {
    V1(Transaction),
}

impl Codec<Transaction> for TransactionCodec {
    fn decode(source: Self) -> Transaction {
        match source {
            TransactionCodec::V1(link) => link,
        }
    }

    fn encode(dest: Transaction) -> Self {
        TransactionCodec::V1(dest)
    }
}

impl Transaction {
    /// Retrieves the asset of the transaction based on its protocol
    /// # Returns
    /// * `Asset` - The asset of the transaction
    pub fn get_asset(&self) -> Asset {
        match &self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                icrc1_transfer.asset.clone()
            }
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => icrc2_approve.asset.clone(),
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.asset.clone()
            }
        }
    }

    /// Retrieves the 'from' account of the transaction based on its protocol
    /// # Returns
    /// * `Account` - The 'from' account of the transaction
    pub fn get_from_account(&self) -> Account {
        match &self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                icrc1_transfer.from.clone().get_account()
            }
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => {
                icrc2_approve.from.clone().get_account()
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.from.clone().get_account()
            }
        }
    }

    /// Sets the 'from' account of the transaction based on its protocol
    /// # Arguments
    /// * `from_account` - The account to set as the 'from' account
    pub fn set_from(&mut self, from_account: Account) {
        match &mut self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                icrc1_transfer.from = from_account.into()
            }
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => {
                icrc2_approve.from = from_account.into()
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.from = from_account.into()
            }
        }
    }

    /// Sets the 'to' account of the transaction based on its protocol
    /// # Arguments
    /// * `to_account` - The account to set as the 'to' account
    pub fn set_to(&mut self, to_account: Account) {
        match &mut self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                icrc1_transfer.to = to_account.into()
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.to = to_account.into()
            }
            _ => {}
        }
    }

    /// Generates a unique key for the transaction based on its protocol and relevant fields
    /// # Returns
    /// * `String` - The generated protocol key
    pub fn get_protocol_key(&self) -> String {
        match &self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(transfer_data)) => format!(
                "icrc1_transfer_{}_{}_{}",
                transfer_data.asset, transfer_data.from, transfer_data.to
            ),
            Protocol::IC(IcTransaction::Icrc2Approve(approve_data)) => format!(
                "icrc2_approve_{}_{}_{}",
                approve_data.asset, approve_data.from, approve_data.spender
            ),
            Protocol::IC(IcTransaction::Icrc2TransferFrom(transfer_from_data)) => format!(
                "icrc2_transfer_from_{}_{}_{}",
                transfer_from_data.asset, transfer_from_data.from, transfer_from_data.spender
            ),
        }
    }

    /// Merges another transaction into this one by summing their amounts if they share the same protocol
    /// # Arguments
    /// * `other` - The other transaction to merge
    pub fn merge_with(&mut self, other: &Transaction) {
        if self.get_protocol_key() != other.get_protocol_key() {
            return;
        }

        match &mut self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(transfer_data)) => {
                if let Protocol::IC(IcTransaction::Icrc1Transfer(other_transfer)) = &other.protocol
                {
                    transfer_data.amount += other_transfer.amount.clone();
                }
            }
            Protocol::IC(IcTransaction::Icrc2Approve(approve_data)) => {
                if let Protocol::IC(IcTransaction::Icrc2Approve(ref other_approve)) = other.protocol
                {
                    approve_data.amount += other_approve.amount.clone();
                }
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(transfer_from_data)) => {
                if let Protocol::IC(IcTransaction::Icrc2TransferFrom(ref other_transfer_from)) =
                    other.protocol
                {
                    transfer_from_data.amount += other_transfer_from.amount.clone();
                }
            }
        }
    }

    /// Checks if the transaction is an ICRC-1 transfer
    /// # Returns
    /// * `bool` - true if the transaction is an ICRC-1 transfer, false otherwise
    pub fn is_icrc1(&self) -> bool {
        matches!(self.protocol, Protocol::IC(IcTransaction::Icrc1Transfer(_)))
    }

    /// Checks if the transaction is an ICRC-2 approve
    /// # Returns
    /// * `bool` - true if the transaction is an ICRC-2 approve, false otherwise
    pub fn is_icrc2_approve(&self) -> bool {
        matches!(self.protocol, Protocol::IC(IcTransaction::Icrc2Approve(_)))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub enum Protocol {
    IC(IcTransaction),
}

impl Protocol {
    pub fn as_ic_transaction(&self) -> Option<&IcTransaction> {
        match self {
            Protocol::IC(ic_transaction) => Some(ic_transaction),
            // none if other protocol
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub enum IcTransaction {
    Icrc1Transfer(Icrc1Transfer),
    Icrc2Approve(Icrc2Approve),
    Icrc2TransferFrom(Icrc2TransferFrom),
}

impl IcTransaction {
    pub fn as_icrc1_transfer(&self) -> Option<&Icrc1Transfer> {
        match self {
            IcTransaction::Icrc1Transfer(icrc1_transfer) => Some(icrc1_transfer),
            _ => None,
        }
    }

    pub fn as_icrc2_approve(&self) -> Option<&Icrc2Approve> {
        match self {
            IcTransaction::Icrc2Approve(icrc2_approve) => Some(icrc2_approve),
            _ => None,
        }
    }

    pub fn as_icrc2_transfer_from(&self) -> Option<&Icrc2TransferFrom> {
        match self {
            IcTransaction::Icrc2TransferFrom(icrc2_transfer_from) => Some(icrc2_transfer_from),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub struct Icrc1Transfer {
    pub from: Wallet,
    pub to: Wallet,
    pub asset: Asset,
    pub amount: Nat,
    pub memo: Option<Memo>,
    pub ts: Option<u64>,
}

impl TryFrom<Icrc1Transfer> for TransferArg {
    type Error = String;

    fn try_from(value: Icrc1Transfer) -> Result<Self, Self::Error> {
        let from = value.from.get_account();

        let to = value.to.get_account();

        let amount = value.amount;
        let memo = value.memo;

        Ok(TransferArg {
            from_subaccount: from.subaccount,
            to,
            amount,
            fee: None,
            memo,
            created_at_time: value.ts,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub struct Icrc2Approve {
    pub from: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    pub amount: Nat,
    pub memo: Option<Memo>,
    pub ts: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub struct Icrc2TransferFrom {
    pub from: Wallet,
    pub to: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    pub amount: Nat,
    pub memo: Option<Memo>,
    pub ts: Option<u64>,
}

impl TryFrom<Icrc2TransferFrom> for TransferFromArgs {
    type Error = String;

    fn try_from(value: Icrc2TransferFrom) -> Result<Self, Self::Error> {
        let spender_account = value.spender.get_account();

        let from = value.from.get_account();

        let to = value.to.get_account();

        let amount = value.amount;
        let memo = value.memo;

        Ok(TransferFromArgs {
            spender_subaccount: spender_account.subaccount,
            from,
            to,
            amount,
            fee: None,
            memo,
            created_at_time: None,
        })
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, CandidType, Eq, Display)]
pub enum FromCallType {
    Canister,
    Wallet,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, CandidType, Eq, Display)]
pub enum TransactionProtocol {
    Irrc1Transfer,
    Icrc2Approve,
    Icrc2TransferFrom,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, CandidType, Eq, Display)]
pub enum TransactionState {
    Created,
    Processing,
    Success,
    Fail,
}

#[cfg(test)]
mod tests {
    use super::*;
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn it_should_get_icrc1_transfer_protocol_key_correctly() {
        // Arrange
        let from_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let to_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let asset = Asset::default();
        let tx = Transaction {
            id: "tx3".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: from_address.clone(),
                to: to_address.clone(),
                asset: asset.clone(),
                amount: Nat::from(200u64),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        // Act
        let protocol_key = tx.get_protocol_key();

        // Assert
        assert_eq!(
            protocol_key,
            format!("icrc1_transfer_{}_{}_{}", asset, from_address, to_address)
        );
    }

    #[test]
    fn it_should_get_icrc2_approve_protocol_key_correctly() {
        // Arrange
        let from_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let spender_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let asset = Asset::default();
        let tx = Transaction {
            id: "tx4".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc2Approve(Icrc2Approve {
                from: from_address.clone(),
                spender: spender_address.clone(),
                asset: asset.clone(),
                amount: Nat::from(75u64),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        // Act
        let protocol_key = tx.get_protocol_key();

        // Assert
        assert_eq!(
            protocol_key,
            format!(
                "icrc2_approve_{}_{}_{}",
                asset, from_address, spender_address
            )
        );
    }

    #[test]
    fn it_should_get_icrc2_transfer_from_protocol_key_correctly() {
        // Arrange
        let from_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let to_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let spender_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let asset = Asset::default();
        let tx = Transaction {
            id: "tx5".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
                from: from_address.clone(),
                to: to_address.clone(),
                spender: spender_address.clone(),
                asset: asset.clone(),
                amount: Nat::from(150u64),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        // Act
        let protocol_key = tx.get_protocol_key();

        // Assert
        assert_eq!(
            protocol_key,
            format!(
                "icrc2_transfer_from_{}_{}_{}",
                asset, from_address, spender_address
            )
        );
    }

    #[test]
    fn it_should_merge_icrc1_transfer_transactions_correctly() {
        // Arrange
        let from_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let to_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let asset = Asset::default();
        let amount1 = Nat::from(100u64);
        let amount2 = Nat::from(250u64);
        let mut tx1 = Transaction {
            id: "tx6".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: from_address.clone(),
                to: to_address.clone(),
                asset: asset.clone(),
                amount: amount1.clone(),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        let tx2 = Transaction {
            id: "tx7".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: from_address.clone(),
                to: to_address.clone(),
                asset: asset.clone(),
                amount: amount2.clone(),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        // Act
        tx1.merge_with(&tx2);

        // Assert
        if let Protocol::IC(IcTransaction::Icrc1Transfer(merged_transfer)) = &tx1.protocol {
            assert_eq!(merged_transfer.amount, amount1 + amount2);
        } else {
            panic!("Merged transaction protocol is not ICRC-1 Transfer");
        }
    }

    #[test]
    fn it_should_merge_icrc2_approve_transactions_correctly() {
        // Arrange
        let from_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let spender_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let asset = Asset::default();
        let amount1 = Nat::from(80u64);
        let amount2 = Nat::from(120u64);
        let mut tx1 = Transaction {
            id: "tx8".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc2Approve(Icrc2Approve {
                from: from_address.clone(),
                spender: spender_address.clone(),
                asset: asset.clone(),
                amount: amount1.clone(),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        let tx2 = Transaction {
            id: "tx9".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc2Approve(Icrc2Approve {
                from: from_address.clone(),
                spender: spender_address.clone(),
                asset: asset.clone(),
                amount: amount2.clone(),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        // Act
        tx1.merge_with(&tx2);

        // Assert
        if let Protocol::IC(IcTransaction::Icrc2Approve(merged_approve)) = &tx1.protocol {
            assert_eq!(merged_approve.amount, amount1 + amount2);
        } else {
            panic!("Merged transaction protocol is not ICRC-2 Approve");
        }
    }

    #[test]
    fn it_should_merge_icrc2_transfer_from_transactions_correctly() {
        // Arrange
        let from_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let to_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let spender_address = Wallet::IC {
            address: random_principal_id(),
            subaccount: None,
        };
        let asset = Asset::default();
        let amount1 = Nat::from(150u64);
        let amount2 = Nat::from(350u64);
        let mut tx1 = Transaction {
            id: "tx10".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
                from: from_address.clone(),
                to: to_address.clone(),
                spender: spender_address.clone(),
                asset: asset.clone(),
                amount: amount1.clone(),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        let tx2 = Transaction {
            id: "tx11".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc2TransferFrom(Icrc2TransferFrom {
                from: from_address.clone(),
                to: to_address.clone(),
                spender: spender_address.clone(),
                asset: asset.clone(),
                amount: amount2.clone(),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        // Act
        tx1.merge_with(&tx2);

        // Assert
        if let Protocol::IC(IcTransaction::Icrc2TransferFrom(merged_transfer_from)) = &tx1.protocol
        {
            assert_eq!(merged_transfer_from.amount, amount1 + amount2);
        } else {
            panic!("Merged transaction protocol is not ICRC-2 Transfer From");
        }
    }

    #[test]
    fn it_should_indicate_icrc1_procotol_correctly() {
        // Arrange
        let tx = Transaction {
            id: "tx1".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc1Transfer(Icrc1Transfer {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(100u64),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        // Act & Assert
        assert!(tx.is_icrc1());
    }

    #[test]
    fn it_should_indicate_icrc2_approve_protocol_correctly() {
        // Arrange
        let tx = Transaction {
            id: "tx2".to_string(),
            created_at: 0,
            state: TransactionState::Created,
            dependency: None,
            group: 0,
            from_call_type: FromCallType::Wallet,
            protocol: Protocol::IC(IcTransaction::Icrc2Approve(Icrc2Approve {
                from: Wallet::default(),
                spender: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(50u64),
                memo: None,
                ts: None,
            })),
            start_ts: None,
        };

        // Act & Assert
        assert!(tx.is_icrc2_approve());
    }
}
