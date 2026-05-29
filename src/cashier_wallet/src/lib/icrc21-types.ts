/**
 * Local type definitions for ICRC-21 consent structures.
 * Previously imported from @dfinity/oisy-wallet-signer but no longer exported there.
 * Based on the ICRC-21 standard: https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-21/ICRC-21.md
 */

export interface icrc21_consent_message_metadata {
  language: string
  utc_offset_minutes: [] | [number]
}

export type icrc21_line_display_page = {
  lines: string[]
}

export type icrc21_consent_message =
  | { GenericDisplayMessage: string }
  | { LineDisplayMessage: { pages: icrc21_line_display_page[] } }

export interface icrc21_consent_info {
  metadata: icrc21_consent_message_metadata
  consent_message: icrc21_consent_message
}
