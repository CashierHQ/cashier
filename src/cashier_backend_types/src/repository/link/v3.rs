// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::{
    error::CanisterError,
    repository::{
        asset_info::v3::AssetInfoV3,
        common::AddressTypeV3,
        intent::v3::{IntentTransactionDataV3, IntentV3},
        link::v1::LinkType,
    },
};

use candid::{CandidType, Nat, Principal};
use cashier_macros::storable;
use cashier_shared::types::{
    Link as LinkShared, LinkState as LinkStateShared, LinkType as LinkTypeShared,
};
use derive_more::Display;
use ic_mple_structures::Codec;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
#[storable]
pub struct LinkV3 {
    pub id: String,
    pub title: String,
    pub link_type: LinkType,
    pub asset_info: Vec<AssetInfoV3>,
    pub max_use: u64,
    pub use_count: u64,
    pub creator: Principal,
    pub state: LinkState,
    pub created_at: u64,
}

#[storable]
pub enum LinkCodecV3 {
    V1(LinkV3),
}

impl Codec<LinkV3> for LinkCodecV3 {
    fn decode(source: Self) -> LinkV3 {
        match source {
            LinkCodecV3::V1(link) => link,
        }
    }

    fn encode(dest: LinkV3) -> Self {
        LinkCodecV3::V1(dest)
    }
}

impl From<LinkShared> for LinkV3 {
    fn from(link: LinkShared) -> Self {
        LinkV3 {
            id: link.id,
            title: link.title,
            link_type: LinkType::from(link.link_type),
            asset_info: link.asset_info.into_iter().map(AssetInfoV3::from).collect(),
            max_use: link.max_use,
            use_count: link.use_count,
            creator: link.creator,
            state: LinkState::from(link.link_state),
            created_at: link.created_at.unwrap_or(0),
        }
    }
}

impl LinkV3 {
    pub fn to_shared(&self) -> LinkShared {
        LinkShared {
            id: self.id.clone(),
            title: self.title.clone(),
            link_type: self.link_type.to_shared(),
            asset_info: self
                .asset_info
                .iter()
                .map(|asset| asset.to_shared())
                .collect(),
            max_use: self.max_use,
            use_count: self.use_count,
            creator: self.creator,
            link_state: self.state.to_shared(),
            created_at: Some(self.created_at),
        }
    }

    // --- Link state transitions applied from a SUCCESSFUL process_action result ---
    // The apply_* methods mutate the link in memory only; callers (service layer)
    // persist the link solely when the whole apply returns `Ok`, so a mid-loop
    // error never reaches storage.

    /// CreateLink action succeeded: fund amounts confirmed on-ledger -> link goes Active.
    /// Available amount per asset comes from the Creator->Link transfer intent.
    pub fn apply_create_action_success(
        &mut self,
        intents: &[IntentV3],
    ) -> Result<(), CanisterError> {
        for asset_info in &mut self.asset_info {
            let intent = find_intent(
                intents,
                asset_info.asset.address,
                AddressTypeV3::Creator,
                AddressTypeV3::Link,
            )?;

            let available_amount = match &intent.intent_tx_data {
                Some(IntentTransactionDataV3::TransferFrom(data)) => data.actual_amount.clone(),
                Some(IntentTransactionDataV3::Transfer(data)) => Some(data.amount.clone()),
                None => None,
            }
            .ok_or_else(|| {
                CanisterError::InvalidDataError(format!(
                    "Transfer amount not found in intent of asset {}",
                    asset_info.asset.address
                ))
            })?;

            asset_info.available_amount = Some(available_amount);
        }

        self.state = LinkState::Active;
        Ok(())
    }

    /// Receive/Send (claim) action succeeded: deduct (transfer amount + network fee)
    /// per asset from the Link->User transfer intent, consume one use, and end the
    /// link when the last use is consumed.
    pub fn apply_receive_action_success(
        &mut self,
        intents: &[IntentV3],
    ) -> Result<(), CanisterError> {
        for asset_info in &mut self.asset_info {
            let current_available_amount =
                asset_info.available_amount.clone().ok_or_else(|| {
                    CanisterError::InvalidDataError(format!(
                        "Current available amount of asset {} not found",
                        asset_info.asset.address
                    ))
                })?;

            let intent = find_intent(
                intents,
                asset_info.asset.address,
                AddressTypeV3::Link,
                AddressTypeV3::User,
            )?;

            let deducted_amount = match &intent.intent_tx_data {
                Some(IntentTransactionDataV3::Transfer(data)) => Some(data.amount.clone()),
                _ => None,
            }
            .ok_or_else(|| {
                CanisterError::InvalidDataError(format!(
                    "Transfer amount not found in intent of asset {}",
                    asset_info.asset.address
                ))
            })?;

            let network_fee = intent.asset.network_fee.clone().ok_or_else(|| {
                CanisterError::InvalidDataError(format!(
                    "Network fee of asset {} not found",
                    asset_info.asset.address
                ))
            })?;

            if current_available_amount < deducted_amount.clone() + network_fee.clone() {
                return Err(CanisterError::InvalidDataError(format!(
                    "Deducted amount {} plus network fee {} exceeds current available amount {} for asset {}",
                    deducted_amount,
                    network_fee,
                    current_available_amount,
                    asset_info.asset.address
                )));
            }

            asset_info.available_amount =
                Some(current_available_amount - deducted_amount - network_fee);
        }

        self.use_count += 1;
        if self.use_count >= self.max_use {
            self.state = LinkState::Ended;
        }
        Ok(())
    }

    /// Withdraw action succeeded: creator drained the link -> link ends.
    /// The withdraw intent is built from the actual ledger balance, so a stale
    /// `available_amount` value (e.g. external deposits) must not fail the apply;
    /// the amount is conservatively reset to zero instead of exact-matched.
    /// A `None` available_amount is still an error (link was never funded).
    pub fn apply_withdraw_action_success(
        &mut self,
        intents: &[IntentV3],
    ) -> Result<(), CanisterError> {
        for asset_info in &mut self.asset_info {
            asset_info.available_amount.as_ref().ok_or_else(|| {
                CanisterError::InvalidDataError(format!(
                    "Current available amount of asset {} not found",
                    asset_info.asset.address
                ))
            })?;

            let intent = find_intent(
                intents,
                asset_info.asset.address,
                AddressTypeV3::Link,
                AddressTypeV3::Creator,
            )?;

            match &intent.intent_tx_data {
                Some(IntentTransactionDataV3::Transfer(_)) => {}
                _ => {
                    return Err(CanisterError::InvalidDataError(format!(
                        "Invalid withdraw transfer intent_tx_data for asset {}",
                        asset_info.asset.address
                    )));
                }
            }

            intent.asset.network_fee.as_ref().ok_or_else(|| {
                CanisterError::InvalidDataError(format!(
                    "Network fee of asset {} not found",
                    asset_info.asset.address
                ))
            })?;

            asset_info.available_amount = Some(Nat::from(0u8));
        }

        self.state = LinkState::Ended;
        Ok(())
    }
}

impl From<LinkTypeShared> for LinkType {
    fn from(link_type: LinkTypeShared) -> Self {
        match link_type {
            LinkTypeShared::SendTip => LinkType::SendTip,
            LinkTypeShared::SendAirdrop => LinkType::SendAirdrop,
            LinkTypeShared::SendTokenBasket => LinkType::SendTokenBasket,
            LinkTypeShared::ReceivePayment => LinkType::ReceivePayment,
        }
    }
}

impl LinkType {
    pub fn to_shared(&self) -> LinkTypeShared {
        match self {
            LinkType::SendTip => LinkTypeShared::SendTip,
            LinkType::SendAirdrop => LinkTypeShared::SendAirdrop,
            LinkType::SendTokenBasket => LinkTypeShared::SendTokenBasket,
            LinkType::ReceivePayment => LinkTypeShared::ReceivePayment,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, CandidType, Display)]
pub enum LinkState {
    Created,
    Active,
    Inactive,
    Ended,
}

impl From<LinkStateShared> for LinkState {
    fn from(link_state: LinkStateShared) -> Self {
        match link_state {
            LinkStateShared::Created => LinkState::Created,
            LinkStateShared::Active => LinkState::Active,
            LinkStateShared::Inactive => LinkState::Inactive,
            LinkStateShared::Ended => LinkState::Ended,
            LinkStateShared::ChooseType | LinkStateShared::AddAsset | LinkStateShared::Preview => {
                LinkState::Created
            }
        }
    }
}

impl LinkState {
    pub fn to_shared(&self) -> LinkStateShared {
        match self {
            LinkState::Created => LinkStateShared::Created,
            LinkState::Active => LinkStateShared::Active,
            LinkState::Inactive => LinkStateShared::Inactive,
            LinkState::Ended => LinkStateShared::Ended,
        }
    }
}

/// Find the transfer intent matching an asset and source/dest address types.
fn find_intent(
    intents: &[IntentV3],
    asset_address: candid::Principal,
    source: AddressTypeV3,
    dest: AddressTypeV3,
) -> Result<&IntentV3, CanisterError> {
    intents
        .iter()
        .find(|intent| {
            intent.asset.address == asset_address
                && intent.source_address_type == source
                && intent.dest_address_type == dest
        })
        .ok_or_else(|| {
            CanisterError::NotFound(format!(
                "Not found transfer intent for asset {asset_address}"
            ))
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::{
        asset::{
            v1::Asset,
            v3::{AssetV3, TokenStandardV3},
        },
        asset_info::v3::AssetInfoV3,
        common::Wallet,
        intent::v1::{IntentState, TransferData, TransferFromData},
        intent::v3::IntentTypeV3,
        link::v1::LinkType,
    };
    use candid::Principal;
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    fn fixture_of_asset_info(address: Principal, available: Option<u64>) -> AssetInfoV3 {
        AssetInfoV3 {
            asset: AssetV3 {
                address,
                network_fee: None,
                token_standard: TokenStandardV3::ICRC2,
            },
            label: "Asset".to_string(),
            amount: Nat::from(10_000u64),
            available_amount: available.map(Nat::from),
        }
    }

    fn fixture_of_link(
        state: LinkState,
        max_use: u64,
        use_count: u64,
        asset_info: Vec<AssetInfoV3>,
    ) -> LinkV3 {
        LinkV3 {
            id: random_id_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            asset_info,
            max_use,
            use_count,
            creator: random_principal_id(),
            state,
            created_at: 0,
        }
    }

    fn fixture_of_intent(
        asset_address: Principal,
        source: AddressTypeV3,
        dest: AddressTypeV3,
        intent_tx_data: Option<IntentTransactionDataV3>,
        network_fee: Option<u64>,
    ) -> IntentV3 {
        IntentV3 {
            id: random_id_string(),
            label: "intent".to_string(),
            intent_type: IntentTypeV3::Send,
            asset: AssetV3 {
                address: asset_address,
                network_fee: network_fee.map(Nat::from),
                token_standard: TokenStandardV3::ICRC2,
            },
            amount: Nat::from(1_000u64),
            total_amount: None,
            network_fee: None,
            user_fee: None,
            source_address: random_principal_id(),
            source_account: None,
            source_address_type: source,
            dest_address: random_principal_id(),
            dest_account: None,
            dest_address_type: dest,
            intent_tx_data,
            dependencies: vec![],
            action_id: random_id_string(),
            state: IntentState::Success,
            created_at: 0,
        }
    }

    fn transfer_data(amount: u64) -> IntentTransactionDataV3 {
        IntentTransactionDataV3::Transfer(TransferData {
            from: Wallet::default(),
            to: Wallet::default(),
            asset: Asset::default(),
            amount: Nat::from(amount),
        })
    }

    #[test]
    fn it_should_fail_apply_create_due_to_missing_intent_and_keep_link_state() {
        let asset = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Created,
            1,
            0,
            vec![fixture_of_asset_info(asset, None)],
        );
        let intents = vec![]; // no matching intent

        let result = link.apply_create_action_success(&intents);

        assert!(matches!(result, Err(CanisterError::NotFound(_))));
        assert_eq!(link.state, LinkState::Created);
        assert_eq!(link.asset_info[0].available_amount, None);
    }

    #[test]
    fn it_should_apply_create_with_transfer_and_activate_link() {
        let asset = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Created,
            1,
            0,
            vec![fixture_of_asset_info(asset, None)],
        );
        let intents = vec![fixture_of_intent(
            asset,
            AddressTypeV3::Creator,
            AddressTypeV3::Link,
            Some(transfer_data(9_900)),
            None,
        )];

        link.apply_create_action_success(&intents)
            .expect("apply create should succeed");

        assert_eq!(link.state, LinkState::Active);
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_900u64))
        );
    }

    #[test]
    fn it_should_apply_create_with_transfer_from_using_actual_amount() {
        let asset = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Created,
            1,
            0,
            vec![fixture_of_asset_info(asset, None)],
        );
        let intents = vec![fixture_of_intent(
            asset,
            AddressTypeV3::Creator,
            AddressTypeV3::Link,
            Some(IntentTransactionDataV3::TransferFrom(TransferFromData {
                from: Wallet::default(),
                to: Wallet::default(),
                spender: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(10_000u64),
                actual_amount: Some(Nat::from(9_800u64)),
                approve_amount: None,
            })),
            None,
        )];

        link.apply_create_action_success(&intents)
            .expect("apply create should succeed");

        assert_eq!(link.state, LinkState::Active);
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_800u64))
        );
    }

    #[test]
    fn it_should_apply_receive_and_consume_one_use_keeping_link_active() {
        let asset = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Active,
            3,
            0,
            vec![fixture_of_asset_info(asset, Some(9_800))],
        );
        let intents = vec![fixture_of_intent(
            asset,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(transfer_data(4_000)),
            Some(200),
        )];

        link.apply_receive_action_success(&intents)
            .expect("apply receive should succeed");

        assert_eq!(link.use_count, 1);
        assert_eq!(link.state, LinkState::Active);
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(5_600u64))
        );
    }

    #[test]
    fn it_should_apply_receive_and_end_link_on_last_use() {
        let asset = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Active,
            2,
            1,
            vec![fixture_of_asset_info(asset, Some(4_200))],
        );
        let intents = vec![fixture_of_intent(
            asset,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(transfer_data(4_000)),
            Some(200),
        )];

        link.apply_receive_action_success(&intents)
            .expect("apply receive should succeed");

        assert_eq!(link.use_count, 2);
        assert_eq!(link.state, LinkState::Ended);
        assert_eq!(link.asset_info[0].available_amount, Some(Nat::from(0u64)));
    }

    #[test]
    fn it_should_fail_apply_receive_when_deduction_exceeds_available_and_keep_use_count() {
        let asset = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Active,
            2,
            0,
            vec![fixture_of_asset_info(asset, Some(4_100))],
        );
        let intents = vec![fixture_of_intent(
            asset,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(transfer_data(4_000)),
            Some(200),
        )];

        let result = link.apply_receive_action_success(&intents);

        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(link.use_count, 0);
        assert_eq!(link.state, LinkState::Active);
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(4_100u64))
        );
    }

    #[test]
    fn it_should_fail_apply_receive_due_to_missing_available_amount() {
        let asset = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Active,
            2,
            0,
            vec![fixture_of_asset_info(asset, None)],
        );
        let intents = vec![fixture_of_intent(
            asset,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(transfer_data(4_000)),
            Some(200),
        )];

        let result = link.apply_receive_action_success(&intents);

        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(link.use_count, 0);
    }

    #[test]
    fn it_should_fail_apply_receive_due_to_missing_network_fee() {
        let asset = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Active,
            2,
            0,
            vec![fixture_of_asset_info(asset, Some(9_800))],
        );
        let intents = vec![fixture_of_intent(
            asset,
            AddressTypeV3::Link,
            AddressTypeV3::User,
            Some(transfer_data(4_000)),
            None,
        )];

        let result = link.apply_receive_action_success(&intents);

        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(link.use_count, 0);
    }

    #[test]
    fn it_should_apply_withdraw_zero_amounts_and_end_link() {
        let asset_1 = random_principal_id();
        let asset_2 = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Inactive,
            1,
            0,
            vec![
                fixture_of_asset_info(asset_1, Some(9_800)),
                fixture_of_asset_info(asset_2, Some(4_900)),
            ],
        );
        let intents = vec![
            fixture_of_intent(
                asset_1,
                AddressTypeV3::Link,
                AddressTypeV3::Creator,
                Some(transfer_data(9_600)),
                Some(200),
            ),
            fixture_of_intent(
                asset_2,
                AddressTypeV3::Link,
                AddressTypeV3::Creator,
                Some(transfer_data(4_700)),
                Some(200),
            ),
        ];

        link.apply_withdraw_action_success(&intents)
            .expect("apply withdraw should succeed");

        assert_eq!(link.state, LinkState::Ended);
        assert_eq!(link.asset_info[0].available_amount, Some(Nat::from(0u64)));
        assert_eq!(link.asset_info[1].available_amount, Some(Nat::from(0u64)));
    }

    #[test]
    fn it_should_fail_apply_withdraw_due_to_missing_network_fee_and_keep_state() {
        let asset = random_principal_id();
        let mut link = fixture_of_link(
            LinkState::Inactive,
            1,
            0,
            vec![fixture_of_asset_info(asset, Some(9_800))],
        );
        let intents = vec![fixture_of_intent(
            asset,
            AddressTypeV3::Link,
            AddressTypeV3::Creator,
            Some(transfer_data(9_600)),
            None,
        )];

        let result = link.apply_withdraw_action_success(&intents);

        assert!(matches!(result, Err(CanisterError::InvalidDataError(_))));
        assert_eq!(link.state, LinkState::Inactive);
        assert_eq!(
            link.asset_info[0].available_amount,
            Some(Nat::from(9_800u64))
        );
    }
}
