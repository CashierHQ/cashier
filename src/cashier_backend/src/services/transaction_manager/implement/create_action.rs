use std::collections::HashMap;

use cashier_types::{Intent, LinkAction, Transaction};

use crate::{
    core::action::types::ActionDto,
    services::transaction_manager::TransactionManagerService,
    types::{error::CanisterError, temp_action::TemporaryAction},
    utils::runtime::IcEnvironment,
};

impl<E: IcEnvironment + Clone> TransactionManagerService<E> {
    pub fn tx_man_assemble_txs(&self, intent: &Intent) -> Result<Vec<Transaction>, CanisterError> {
        let adapter = self
            .adapter_registry
            .get_intent_adapter(intent.chain.clone())
            .map_err(|e| CanisterError::HandleLogicError(e))?;

        adapter
            .intent_to_transactions(intent)
            .map_err(|e| CanisterError::HandleLogicError(e))
    }

    pub fn create_action(&self, temp_action: &TemporaryAction) -> Result<ActionDto, CanisterError> {
        let mut intent_tx_hashmap: HashMap<String, Vec<Transaction>> = HashMap::new();
        let mut intent_tx_ids_hashmap: HashMap<String, Vec<String>> = HashMap::new();

        // check action id
        let action = self.action_service.get_action_by_id(temp_action.id.clone());
        if action.is_some() {
            return Err(CanisterError::HandleLogicError(
                "Action already exists".to_string(),
            ));
        }

        // fill in tx info
        // enrich each intent with chain-level txs needed to achieve the intent
        for intent in temp_action.intents.iter() {
            // store txs in hashmap
            let txs = self.tx_man_assemble_txs(intent)?;
            intent_tx_hashmap.insert(intent.id.clone(), txs.clone());

            // store tx ids in hashmap
            let tx_ids: Vec<String> = txs.iter().map(|tx| tx.id.clone()).collect();
            intent_tx_ids_hashmap.insert(intent.id.clone(), tx_ids);
        }

        // fill in dependency info
        // if intent A has dependency on intent B, all tx in A will have dependency on txs in B
        for intent in temp_action.intents.iter() {
            // collect the tx ids of the dependencies
            // if not found throw error
            let dependency_tx_ids: Vec<String> = intent
                .dependency
                .iter()
                .map(|dependency_id| {
                    intent_tx_ids_hashmap
                        .get(dependency_id)
                        .ok_or_else(|| {
                            CanisterError::InvalidDataError(format!(
                                "Dependency ID {} not found",
                                dependency_id
                            ))
                        })
                        .map(|tx_ids| tx_ids.clone())
                })
                .collect::<Result<Vec<Vec<String>>, CanisterError>>()?
                .into_iter()
                .flatten()
                .collect();

            if !dependency_tx_ids.is_empty() {
                // store the dependency tx ids in the tx of current intent
                let txs = intent_tx_hashmap.get_mut(&intent.id).unwrap();
                for tx in txs.iter_mut() {
                    // if the tx already has dependency, then extend the existing dependency
                    match &mut tx.dependency {
                        Some(existing_deps) => {
                            existing_deps.extend(dependency_tx_ids.clone());
                        }
                        None => {
                            tx.dependency = Some(dependency_tx_ids.clone());
                        }
                    }
                }
            }
        }

        // set link_user_state based on action type
        // if action type is claim, then set link_user_state to ChooseWallet
        // else set it to None

        let link_action = LinkAction {
            link_id: temp_action.link_id.clone(),
            action_type: temp_action.r#type.to_string().clone(),
            action_id: temp_action.id.clone(),
            user_id: temp_action.creator.clone(),
            link_user_state: temp_action.default_link_user_state.clone(),
        };

        // save action to DB
        let _ = self.action_service.store_action_data(
            link_action,
            temp_action.as_action(),
            temp_action.intents.clone(),
            intent_tx_hashmap.clone(),
            temp_action.creator.clone(),
        );

        Ok(ActionDto::from_with_tx(
            temp_action.as_action(),
            temp_action.intents.clone(),
            intent_tx_hashmap,
        ))
    }
}
