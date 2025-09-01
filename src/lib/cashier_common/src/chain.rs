use candid::CandidType;
use cashier_macros::storable;

#[derive(CandidType, Clone, Eq, PartialEq, Debug, Ord, PartialOrd)]
#[storable]
pub enum Chain {
    IC,
    // Can add more chains in the future
}
