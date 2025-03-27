pub mod intent;

use cashier_types::Intent;

pub struct IntentBuildResponse {
    pub intents: Vec<Intent>,
}

pub trait IntentBuilder {
    fn build(&self) -> IntentBuildResponse;
}
