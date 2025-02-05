use crate::core::action::types::ActionDto;

pub trait ExecuteAction {
    fn execute(&self) -> Result<ActionDto, String>;
}

pub mod confirm;
