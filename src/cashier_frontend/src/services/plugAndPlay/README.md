This folder contains an override implementation of `IIAdapter` used by `@windoge98/plug-n-play`.

What it does

- Replaces `Channel`, `Connection`, and `Transport` from `@dfinity/auth-client`.
- Adapts the auth client to follow the signer interaction details described in the DFINITY signer standards.

Origin

- Based on: https://github.com/slide-computer/signer-js (package: `signer-test`, file: `agentChannel.ts`).

Supported flows

- ICRC-112
- ICRC-114

Quick notes

- Purpose: enable delegated identities to act as signers.
- Links: signer standards overview: https://github.com/dfinity/wg-identity-authentication/blob/main/topics/signer_standards_overview.md

If you want the original implementation or to compare changes, check the linked source.
