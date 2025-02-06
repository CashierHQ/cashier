use std::borrow::Cow;

use candid::CandidType;
use ic_stable_structures::{storable::Bound, Storable};
use serde::{Deserialize, Serialize};

pub type UserKey = String;

pub type UserWalletKey = String;

pub type LinkKey = String;

pub type ActionKey = String;

pub type ActionTypeKey = String;

pub type IntentKey = String;

pub type TransactionKey = String;

pub type UserLinkKey = (String, String);

pub type UserActionKey = (String, String);

pub type LinkActionKey = (String, String, String);

pub type ActionIntentKey = (String, String);

pub type IntentTransactionKey = (String, String);

#[derive(Deserialize, Serialize, CandidType, Clone, Ord, Eq, PartialEq, PartialOrd)]
pub struct StorableUserLinkKey(UserLinkKey);

#[derive(Deserialize, Serialize, CandidType, Clone, Ord, Eq, PartialEq, PartialOrd)]
pub struct StorableUserActionKey(UserActionKey);

#[derive(Deserialize, Serialize, CandidType, Clone, Ord, Eq, PartialEq, PartialOrd)]
pub struct StorableLinkActionKey(LinkActionKey);

#[derive(Deserialize, Serialize, CandidType, Clone, Ord, Eq, PartialEq, PartialOrd)]
pub struct StorableActionIntentKey(ActionIntentKey);

#[derive(Deserialize, Serialize, CandidType, Clone, Ord, Eq, PartialEq, PartialOrd)]
pub struct StorableIntentTransactionKey(IntentTransactionKey);

impl From<StorableUserLinkKey> for UserLinkKey {
    fn from(value: StorableUserLinkKey) -> Self {
        value.0
    }
}

impl From<UserLinkKey> for StorableUserLinkKey {
    fn from(value: UserLinkKey) -> Self {
        StorableUserLinkKey(value)
    }
}

impl From<StorableUserActionKey> for UserActionKey {
    fn from(value: StorableUserActionKey) -> Self {
        value.0
    }
}

impl From<UserActionKey> for StorableUserActionKey {
    fn from(value: UserActionKey) -> Self {
        StorableUserActionKey(value)
    }
}

impl From<StorableLinkActionKey> for LinkActionKey {
    fn from(value: StorableLinkActionKey) -> Self {
        value.0
    }
}

impl From<LinkActionKey> for StorableLinkActionKey {
    fn from(value: LinkActionKey) -> Self {
        StorableLinkActionKey(value)
    }
}

impl From<StorableActionIntentKey> for ActionIntentKey {
    fn from(value: StorableActionIntentKey) -> Self {
        value.0
    }
}

impl From<ActionIntentKey> for StorableActionIntentKey {
    fn from(value: ActionIntentKey) -> Self {
        StorableActionIntentKey(value)
    }
}

impl From<StorableIntentTransactionKey> for IntentTransactionKey {
    fn from(value: StorableIntentTransactionKey) -> Self {
        value.0
    }
}

impl From<IntentTransactionKey> for StorableIntentTransactionKey {
    fn from(value: IntentTransactionKey) -> Self {
        StorableIntentTransactionKey(value)
    }
}

impl Storable for StorableUserLinkKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut candid =
            candid::encode_one(self).expect("Failed to serialize StorableUserLinkKey to candid");
        let mut buf = (candid.len() as u16).to_le_bytes().to_vec(); // 2 bytes for length
        buf.append(&mut candid);
        Cow::Owned(buf)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let length = u16::from_le_bytes(bytes[..2].try_into().unwrap()) as usize;

        candid::decode_one(&bytes[2..length + 2])
            .expect("Failed to deserialize StorableUserLinkKey from candid")
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for StorableUserActionKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut candid =
            candid::encode_one(self).expect("Failed to serialize StorableUserActionKey to candid");
        let mut buf = (candid.len() as u16).to_le_bytes().to_vec(); // 2 bytes for length
        buf.append(&mut candid);
        Cow::Owned(buf)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let length = u16::from_le_bytes(bytes[..2].try_into().unwrap()) as usize;

        candid::decode_one(&bytes[2..length + 2])
            .expect("Failed to deserialize StorableUserActionKey from candid")
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for StorableLinkActionKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut candid =
            candid::encode_one(self).expect("Failed to serialize StorableLinkActionKey to candid");
        let mut buf = (candid.len() as u16).to_le_bytes().to_vec(); // 2 bytes for length
        buf.append(&mut candid);
        Cow::Owned(buf)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let length = u16::from_le_bytes(bytes[..2].try_into().unwrap()) as usize;

        candid::decode_one(&bytes[2..length + 2])
            .expect("Failed to deserialize StorableLinkActionKey from candid")
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for StorableActionIntentKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut candid = candid::encode_one(self)
            .expect("Failed to serialize StorableActionIntentKey to candid");
        let mut buf = (candid.len() as u16).to_le_bytes().to_vec(); // 2 bytes for length
        buf.append(&mut candid);
        Cow::Owned(buf)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let length = u16::from_le_bytes(bytes[..2].try_into().unwrap()) as usize;

        candid::decode_one(&bytes[2..length + 2])
            .expect("Failed to deserialize StorableActionIntentKey from candid")
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for StorableIntentTransactionKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut candid = candid::encode_one(self)
            .expect("Failed to serialize StorableIntentTransactionKey to candid");
        let mut buf = (candid.len() as u16).to_le_bytes().to_vec(); // 2 bytes for length
        buf.append(&mut candid);
        Cow::Owned(buf)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let length = u16::from_le_bytes(bytes[..2].try_into().unwrap()) as usize;

        candid::decode_one(&bytes[2..length + 2])
            .expect("Failed to deserialize StorableIntentTransactionKey from candid")
    }

    const BOUND: Bound = Bound::Unbounded;
}
