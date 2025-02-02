use cashier_types::{Intent, Transaction};

pub mod ic_adapter;

pub trait IntentAdapter {
    fn convert_to_transaction(&self, intent: Intent) -> Result<Vec<Transaction>, String>;
}
