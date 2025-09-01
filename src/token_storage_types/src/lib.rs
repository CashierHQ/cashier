use candid::Principal;

pub mod init;
pub mod token;
pub mod user;

pub type LedgerId = Principal;
pub type IndexId = Principal;

pub use token::TokenId;
