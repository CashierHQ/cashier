use crate::constant::ICP_CANISTER_PRINCIPAL;
use crate::domains::fee::Fee;
use crate::{
    link_v2::{
        icrc112::convert_tx_to_icrc_112_request,
        intents::{
            transfer_wallet_to_link::TransferWalletToLinkIntent,
            transfer_wallet_to_treasury::TransferWalletToTreasuryIntent,
        },
    },
    utils::helper::{convert_nat_to_u64, to_subaccount},
};
use candid::{Nat, Principal};
use cashier_backend_types::dto::action::{Icrc112Request, Icrc112Requests};
use cashier_backend_types::{
    constant::{INTENT_LABEL_LINK_CREATION_FEE, INTENT_LABEL_SEND_TIP_ASSET},
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        common::Asset,
        intent::v2::Intent,
        link::v1::Link,
        transaction::v2::Transaction,
    },
};
use icrc_ledger_types::icrc1::account::Account;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug)]
pub struct CreateAction {
    pub action: Action,
    pub intents: Vec<Intent>,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
    pub icrc112_requests: Option<Icrc112Requests>,
}

impl CreateAction {
    pub fn new(
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        icrc112_requests: Option<Icrc112Requests>,
    ) -> Self {
        Self {
            action,
            intents,
            intent_txs_map,
            icrc112_requests,
        }
    }

    /// Creates a new CreateAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `fee_map` - A map of canister principals to their corresponding fees.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<CreateAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub fn create(
        link: &Link,
        fee_map: &HashMap<Principal, Nat>,
        canister_id: Principal,
    ) -> Result<Self, CanisterError> {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::CreateLink,
            link_id: link.id.clone(),
            creator: link.creator,
            state: ActionState::Created,
        };

        let link_account = Account {
            owner: canister_id,
            subaccount: Some(to_subaccount(&link.id)?),
        };

        // intents
        let deposit_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let address = match asset_info.asset {
                    Asset::IC { address } => address,
                };

                let fee_in_nat = fee_map.get(&address).ok_or_else(|| {
                    CanisterError::HandleLogicError("Fee not found for link creation".to_string())
                })?;
                let fee_amount = convert_nat_to_u64(fee_in_nat)?;

                let sending_amount = (asset_info.amount_per_link_use_action + fee_amount)
                    * link.link_use_action_max_count;

                TransferWalletToLinkIntent::create(
                    INTENT_LABEL_SEND_TIP_ASSET.to_string(),
                    asset_info.asset.clone(),
                    sending_amount,
                    link.creator,
                    link_account,
                    link.create_at,
                )
            })
            .collect::<Result<Vec<TransferWalletToLinkIntent>, CanisterError>>()?;

        let fee_asset = Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        };
        let actual_amount = Fee::CreateTipLinkFeeIcp.as_u64();
        let fee_in_nat = fee_map.get(&ICP_CANISTER_PRINCIPAL).ok_or_else(|| {
            CanisterError::HandleLogicError("Fee not found for link creation".to_string())
        })?;
        let fee_amount = convert_nat_to_u64(fee_in_nat)?;
        let approval_amount = fee_amount + actual_amount;
        let spender_account = Account {
            owner: canister_id,
            subaccount: None,
        };

        let fee_intent = TransferWalletToTreasuryIntent::create(
            INTENT_LABEL_LINK_CREATION_FEE.to_string(),
            fee_asset,
            actual_amount,
            approval_amount,
            link.creator,
            spender_account,
            link.create_at,
        )?;
        let fintent_id = fee_intent.intent.id.clone();

        let mut intents = Vec::<Intent>::new();
        deposit_intents.iter().for_each(|dintent| {
            intents.push(dintent.intent.clone());
        });
        intents.push(fee_intent.intent.clone());

        // intent_txs_map
        let mut intent_txs_map = HashMap::<String, Vec<Transaction>>::new();

        for deposit_intent in deposit_intents.iter() {
            let dintent_id = deposit_intent.intent.id.clone();
            intent_txs_map.insert(dintent_id, deposit_intent.transactions.clone());
        }
        intent_txs_map.insert(fintent_id, fee_intent.transactions.clone());

        // icrc112_requests
        let mut icrc112_requests = Vec::<Icrc112Request>::new();

        for deposit_intent in deposit_intents.iter() {
            let icrc1_transfer_tx = deposit_intent.transactions.first().ok_or_else(|| {
                CanisterError::HandleLogicError(
                    "No transaction found for deposit intent".to_string(),
                )
            })?;

            let icrc112_request =
                convert_tx_to_icrc_112_request(icrc1_transfer_tx, link_account, &canister_id)?;
            icrc112_requests.push(icrc112_request);
        }

        let icrc2_approve_tx = fee_intent.transactions.first().ok_or_else(|| {
            CanisterError::HandleLogicError("No transaction found for fee intent".to_string())
        })?;
        let icrc112_request =
            convert_tx_to_icrc_112_request(icrc2_approve_tx, spender_account, &canister_id)?;
        icrc112_requests.push(icrc112_request);

        Ok(Self::new(
            action,
            intents,
            intent_txs_map,
            Some(vec![icrc112_requests]),
        ))
    }
}
