trait Validate {
    async fn validate(&self, link: Link) -> Result<(), String>;
}

pub struct Transition {
    pub trigger: LinkStateMachineAction,
    pub source: LinkState,
    pub dest: LinkState,
    pub requires_update: bool,
}
