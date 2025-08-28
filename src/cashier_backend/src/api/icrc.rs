// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Decode;
use cashier_backend_types::error::CanisterError;
use ic_cdk::{query, update};
use itertools::Itertools;

use cashier_common::icrc::{
    Icrc21ConsentInfo, Icrc21ConsentMessage, Icrc21ConsentMessageMetadata,
    Icrc21ConsentMessageRequest, Icrc21DeviceSpec, Icrc21Error, Icrc21LineDisplayPage,
    Icrc21SupportedStandard, Icrc28TrustedOriginsResponse, Icrc114ValidateArgs,
};
use log::{debug, info};

#[query]
fn icrc10_supported_standards() -> Vec<Icrc21SupportedStandard> {
    debug!("[icrc10_supported_standards]");
    vec![
        Icrc21SupportedStandard {
            url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-10/ICRC-10.md".to_string(),
            name: "ICRC-10".to_string(),
        },
        Icrc21SupportedStandard {
            url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-21/ICRC-21.md".to_string(),
            name: "ICRC-21".to_string(),
        },
        Icrc21SupportedStandard {
            url: "https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_28_trusted_origins.md".to_string(),
            name: "ICRC-28".to_string(),
        },
    ]
}

#[update]
fn icrc28_trusted_origins() -> Icrc28TrustedOriginsResponse {
    info!("[icrc28_trusted_origins]");

    let trusted_origins = vec![
        String::from("http://localhost:3001"),
        String::from("http://localhost:3002"),
        String::from("http://localhost:3000"),
        // dev env
        String::from("https://dev.cashierapp.io"),
        String::from("https://bepcz-nyaaa-aaaam-aekoa-cai.icp0.io"),
        // staging env
        String::from("https://staging.cashierapp.io"),
        String::from("https://iqwhg-ciaaa-aaaam-admvq-cai.icp0.io"),
        // prod env
        String::from("https://cashierapp.io"),
        String::from("https://www.cashierapp.io"),
        String::from("https://jg57n-xyaaa-aaaam-admqq-cai.icp0.io"),
    ];

    Icrc28TrustedOriginsResponse { trusted_origins }
}

#[update]
// This method is canister exposed method there for we cannot pass by value
#[allow(clippy::needless_pass_by_value)]
fn icrc21_canister_call_consent_message(
    consent_msg_request: Icrc21ConsentMessageRequest,
) -> Result<Icrc21ConsentInfo, Icrc21Error> {
    info!("[icrc21_canister_call_consent_message]");
    debug!(
        "[icrc21_canister_call_consent_message] method: {}, user_preferences: {:?}",
        consent_msg_request.method, consent_msg_request.user_preferences
    );

    let method = consent_msg_request.method.as_str();

    let consent_message = format!("You are call this method {method}");

    let metadata = Icrc21ConsentMessageMetadata {
        language: "en".to_string(),
        utc_offset_minutes: None,
    };

    match consent_msg_request.user_preferences.device_spec {
        Some(Icrc21DeviceSpec::LineDisplay {
            characters_per_line,
            lines_per_page,
        }) => Ok(Icrc21ConsentInfo {
            metadata,
            consent_message: Icrc21ConsentMessage::LineDisplayMessage {
                pages: consent_msg_text_pages(
                    &consent_message,
                    characters_per_line,
                    lines_per_page,
                ),
            },
        }),
        Some(Icrc21DeviceSpec::GenericDisplay) | None => Ok(Icrc21ConsentInfo {
            metadata,
            consent_message: Icrc21ConsentMessage::GenericDisplayMessage(consent_msg_text_md(
                &consent_message,
            )),
        }),
    }
}

fn consent_msg_text_md(msg: &str) -> String {
    format!("\n {msg}")
}

fn consent_msg_text_pages(
    msg: &str,
    characters_per_line: u16,
    lines_per_page: u16,
) -> Vec<Icrc21LineDisplayPage> {
    let full_text = msg.to_string();

    // Split text into word chunks that fit on a line (breaking long words)
    let words = full_text
        .split_whitespace()
        .flat_map(|word| {
            word.chars()
                .collect::<Vec<_>>()
                .into_iter()
                .chunks(characters_per_line as usize)
                .into_iter()
                .map(std::iter::Iterator::collect)
                .collect::<Vec<String>>()
        })
        .collect::<Vec<String>>();

    // Add words to lines until the line is full
    let mut lines = vec![];
    let mut current_line = "".to_string();
    for word in words {
        if current_line.is_empty() {
            // all words are guaranteed to fit on a line
            current_line = word.to_string();
            continue;
        }
        if current_line.len() + word.len() < characters_per_line as usize {
            current_line.push(' ');
            current_line.push_str(word.as_str());
        } else {
            lines.push(current_line);
            current_line = word.to_string();
        }
    }
    lines.push(current_line);

    // Group lines into pages
    lines
        .into_iter()
        .chunks(lines_per_page as usize)
        .into_iter()
        .map(|page| Icrc21LineDisplayPage {
            lines: page.collect(),
        })
        .collect()
}

#[update]
// This method is canister exposed method there for we cannot pass by value
#[allow(clippy::needless_pass_by_value)]
// following the ICRC-114 standard for helping signer validate the canister call
fn icrc114_validate(args: Icrc114ValidateArgs) -> bool {
    if args.method == "trigger_transaction" {
        match Decode!(args.res.as_slice(), Result<String, CanisterError>) {
            Ok(Ok(_ok)) => return true,
            Ok(Err(_err)) => return false,
            Err(_decode_err) => {
                return false;
            }
        }
    }

    false
}
