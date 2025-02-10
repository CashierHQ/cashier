// pub mod approve_cashier_fee;
pub mod icrc112;
pub mod intent;
// pub mod transfer_to_link_escrow_wallet;
// pub mod update_intent;

use cashier_types::Intent;

pub struct IntentBuildResponse {
    pub intents: Vec<Intent>,
}

pub trait IntentBuilder {
    fn build(&self) -> IntentBuildResponse;
}
