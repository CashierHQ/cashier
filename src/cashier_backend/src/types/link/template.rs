use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub enum Template {
    Left,
    Right,
    Central,
}

impl Template {
    pub fn to_string(&self) -> String {
        match self {
            Template::Left => "Left".to_string(),
            Template::Right => "Right".to_string(),
            Template::Central => "Central".to_string(),
        }
    }

    pub fn from_string(template: &str) -> Result<Template, String> {
        match template {
            "Left" => Ok(Template::Left),
            "Right" => Ok(Template::Right),
            "Central" => Ok(Template::Central),
            _ => Err("Invalid template".to_string()),
        }
    }

    pub fn is_valid(&self) -> bool {
        match self {
            Template::Left => true,
            Template::Right => true,
            Template::Central => true,
        }
    }
}
