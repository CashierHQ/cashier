use super::{entities::action_transaction::ActionTransaction, ACTION_TRANSACTION_STORE};

pub fn create(action_transaction: ActionTransaction) -> ActionTransaction {
    ACTION_TRANSACTION_STORE.with(|store| {
        let pk = action_transaction.pk.clone();
        store.borrow_mut().insert(pk, action_transaction.clone());
    });

    action_transaction
}

pub fn batch_create(action_transactions: Vec<ActionTransaction>) {
    ACTION_TRANSACTION_STORE.with(|store| {
        for action_transaction in action_transactions {
            let pk = action_transaction.pk.clone();
            store.borrow_mut().insert(pk, action_transaction.clone());
        }
    });
}

pub fn get(pk: &str) -> Option<ActionTransaction> {
    ACTION_TRANSACTION_STORE.with(|store| store.borrow().get(&pk.to_string()))
}
