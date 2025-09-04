#[derive(Debug, Clone)]
pub struct UpdateActionArgs {
    pub action_id: String,
    pub link_id: String,
    // using for marking the method called outside of icrc-112
    pub execute_wallet_tx: bool,
}
