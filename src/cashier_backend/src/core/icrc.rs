use ic_cdk::{query, update};
use itertools::Itertools;
use Icrc21DeviceSpec::GenericDisplay;

use crate::types::icrc::{
    Icrc21ConsentInfo, Icrc21ConsentMessage, Icrc21ConsentMessageMetadata,
    Icrc21ConsentMessageRequest, Icrc21DeviceSpec, Icrc21Error, Icrc21LineDisplayPage,
    Icrc21SupportedStandard, Icrc28TrustedOriginsResponse,
};

#[query]
fn icrc10_supported_standards() -> Vec<Icrc21SupportedStandard> {
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
    let trusted_origins = vec![
        String::from("https://standards.identitykit.xyz"),
        String::from("https://dev.standards.identitykit.xyz"),
        String::from("https://demo.identitykit.xyz"),
        String::from("https://dev.demo.identitykit.xyz"),
        String::from("https://nfid.one"),
        String::from("https://dev.nfid.one"),
        // dev env
        String::from("http://localhost:3001"),
        String::from("http://localhost:3002"),
        String::from("http://localhost:3000"),
        // staging env
        String::from("https://staging.cashierapp.io/"),
        // prod env
        String::from("https://cashierapp.io/"),
    ];

    return Icrc28TrustedOriginsResponse { trusted_origins };
}

#[update]
fn icrc21_canister_call_consent_message(
    consent_msg_request: Icrc21ConsentMessageRequest,
) -> Result<Icrc21ConsentInfo, Icrc21Error> {
    let method = consent_msg_request.method.as_str();
    // let supported_methods = [""];
    // if !supported_methods.contains(&method) {
    //     return Err(UnsupportedCanisterCall(Icrc21ErrorInfo {
    //         description: format!(
    //             "The method '{}' is not supported",
    //             consent_msg_request.method
    //         ),
    //     }));
    // }

    let consent_message = format!("You are call this method {}", method);

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
        Some(GenericDisplay) | None => Ok(Icrc21ConsentInfo {
            metadata,
            consent_message: Icrc21ConsentMessage::GenericDisplayMessage(consent_msg_text_md(
                &consent_message,
            )),
        }),
    }
}

fn consent_msg_text_md(msg: &str) -> String {
    format!("\n {}", msg)
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
                .map(|chunk| chunk.collect::<String>())
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
