// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.

use candid::{self, CandidType, Deserialize};

#[allow(non_snake_case)]
#[derive(CandidType, Deserialize, Default)]
pub struct PublicTokenOverview {
  pub id: candid::Nat,
  pub volumeUSD1d: f64,
  pub volumeUSD7d: f64,
  pub totalVolumeUSD: f64,
  pub name: String,
  pub volumeUSD: f64,
  pub feesUSD: f64,
  pub priceUSDChange: f64,
  pub address: String,
  pub txCount: candid::Int,
  pub priceUSD: f64,
  pub standard: String,
  pub symbol: String,
}
