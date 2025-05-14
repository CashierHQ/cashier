use icrc_ledger_types::icrc1::{account::Subaccount, transfer::Memo};
use serde_bytes::ByteBuf;
use uuid::Uuid;

pub fn to_subaccount(id: String) -> Subaccount {
    let uuid = Uuid::parse_str(&id).expect("Invalid UUID format");
    let uuid_bytes = uuid.as_bytes();

    // DO NOT CHANE THE ORDER OF THE BYTES
    let mut subaccount: Subaccount = [0; 32];
    subaccount[..16].copy_from_slice(&uuid_bytes[0..]);

    subaccount
}

pub fn to_memo(id: String) -> Memo {
    let uuid = Uuid::parse_str(&id).expect("Invalid UUID format");
    let uuid_bytes = uuid.as_bytes();

    let mut memo: [u8; 32] = [0; 32];
    memo[..16].copy_from_slice(&uuid_bytes[0..]);

    Memo(ByteBuf::from(memo.to_vec()))
}
