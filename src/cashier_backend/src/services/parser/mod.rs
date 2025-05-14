use base64::{engine::general_purpose, Engine};
use candid::Decode;
use icrc_ledger_types::icrc1::transfer::TransferArg;

#[derive(Debug)]
pub enum ParseResult {
    Icrc1Transfer(TransferArg),
}

pub fn parse_icrc1_transfer_args(arg: &str) -> TransferArg {
    let transfer_arg_bytes = general_purpose::STANDARD.decode(arg).unwrap();

    let transfer_arg = Decode!(
        &transfer_arg_bytes,
        icrc_ledger_types::icrc1::transfer::TransferArg
    )
    .unwrap();
    transfer_arg
}

type ParserFn = fn(&str) -> ParseResult;

pub fn get_parser(method: &str) -> Option<ParserFn> {
    match method {
        "icrc1_transfer" => Some(|arg| ParseResult::Icrc1Transfer(parse_icrc1_transfer_args(arg))),
        _ => None,
    }
}
