// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
use candid::{self, CandidType, Deserialize, Principal};
use cashier_backend_types::error::CanisterError;
use ic_cdk::call::{Call, CandidDecodeFailed};

pub type SubAccount = serde_bytes::ByteBuf;

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<SubAccount>,
}

impl From<Principal> for Account {
    fn from(owner: Principal) -> Self {
        Account {
            owner,
            subaccount: None,
        }
    }
}

pub type Icrc1Tokens = candid::Nat;

pub type Icrc1Timestamp = u64;

#[derive(CandidType, Deserialize, Debug)]
pub struct TransferArg {
    pub to: Account,
    pub fee: Option<Icrc1Tokens>,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<SubAccount>,
    pub created_at_time: Option<Icrc1Timestamp>,
    pub amount: Icrc1Tokens,
}

pub type Icrc1BlockIndex = candid::Nat;

#[derive(CandidType, Deserialize, Debug)]
pub enum Icrc1TransferError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    BadBurn {
        min_burn_amount: Icrc1Tokens,
    },
    Duplicate {
        duplicate_of: Icrc1BlockIndex,
    },
    BadFee {
        expected_fee: Icrc1Tokens,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    InsufficientFunds {
        balance: Icrc1Tokens,
    },
}
pub type Icrc1TransferResult = std::result::Result<Icrc1BlockIndex, Icrc1TransferError>;

#[derive(CandidType, Deserialize, Debug)]
pub struct AllowanceArgs {
    pub account: Account,
    pub spender: Account,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Allowance {
    pub allowance: Icrc1Tokens,
    pub expires_at: Option<Icrc1Timestamp>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct TransferFromArgs {
    pub to: Account,
    pub fee: Option<Icrc1Tokens>,
    pub spender_subaccount: Option<SubAccount>,
    pub from: Account,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<Icrc1Timestamp>,
    pub amount: Icrc1Tokens,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum TransferFromError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    InsufficientAllowance {
        allowance: Icrc1Tokens,
    },
    BadBurn {
        min_burn_amount: Icrc1Tokens,
    },
    Duplicate {
        duplicate_of: Icrc1BlockIndex,
    },
    BadFee {
        expected_fee: Icrc1Tokens,
    },
    CreatedInFuture {
        ledger_time: Icrc1Timestamp,
    },
    TooOld,
    InsufficientFunds {
        balance: Icrc1Tokens,
    },
}
pub type TransferFromResult = std::result::Result<Icrc1BlockIndex, TransferFromError>;

pub struct Service(pub Principal);

impl Service {
    pub fn new(principal: Principal) -> Self {
        Service(principal)
    }

    pub fn get_canister_id(&self) -> Principal {
        self.0
    }

    pub async fn icrc_1_balance_of(&self, arg0: &Account) -> Result<Icrc1Tokens, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_balance_of")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1Tokens, CandidDecodeFailed> = res.candid();

        parsed_res.map_err(CanisterError::from)
    }

    pub async fn icrc_1_fee(&self) -> Result<Icrc1Tokens, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_fee")
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1Tokens, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }

    pub async fn icrc_1_transfer(
        &self,
        arg0: &TransferArg,
    ) -> Result<Icrc1TransferResult, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc1_transfer")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Icrc1TransferResult, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }

    pub async fn icrc_2_allowance(&self, arg0: &AllowanceArgs) -> Result<Allowance, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc2_allowance")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<Allowance, CandidDecodeFailed> = res.candid();

        parsed_res.map_err(CanisterError::from)
    }

    pub async fn icrc_2_transfer_from(
        &self,
        arg0: &TransferFromArgs,
    ) -> Result<TransferFromResult, CanisterError> {
        let res = Call::bounded_wait(self.0, "icrc2_transfer_from")
            .with_arg(arg0)
            .await
            .map_err(CanisterError::from)?;
        let parsed_res: Result<TransferFromResult, CandidDecodeFailed> = res.candid();
        parsed_res.map_err(CanisterError::from)
    }
}
