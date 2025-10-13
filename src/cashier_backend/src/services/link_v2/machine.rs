use cashier_backend_types::repository::link::v1::Link;

use crate::services::link_v2::{states::created::CreatedState, traits::LinkV2State};

pub struct LinkV2Machine {
    state: Box<dyn LinkV2State>,
    pub link: Link,
}

impl LinkV2Machine {
    pub fn new(link: Link) -> Self {
        Self {
            state: Box::new(CreatedState::new(&link)),
            link,
        }
    }

    pub async fn go_next(&mut self) -> Result<(), String> {
        let next_state = self.state.go_next().await?;
        self.state = next_state;
        Ok(())
    }

    pub async fn go_back(&mut self) -> Result<(), String> {
        let prev_state = self.state.go_back().await?;
        self.state = prev_state;
        Ok(())
    }
}
