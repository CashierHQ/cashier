use candid::Principal;

pub mod chain;
pub mod init;
pub mod token;
pub mod user;

pub type LedgerId = Principal;
pub type IndexId = Principal;

pub use chain::Chain;
pub use token::TokenId;
