import { Principal } from "@icp-sdk/core/principal";

// Magic prefix bytes for the legacy EXT/DAB "token identifier" scheme: "\x0Atid".
const EXT_TOKEN_IDENTIFIER_MAGIC = new Uint8Array([0x0a, 0x74, 0x69, 0x64]);

/**
 * Encodes a legacy EXT/DAB "token identifier" — a synthetic Principal combining a
 * collection canister id and a numeric token index. Used across the EXT-standard NFT
 * ecosystem (Entrepot/Toniq, Cap, most EXT-era wallets) as the canonical per-token id,
 * and required by EXT canisters' `http_request` asset handler as the `tokenid` param.
 * @param canisterId the collection's canister id (as text)
 * @param index the token's numeric index
 * @returns the encoded token identifier (formatted like a Principal)
 */
export function encodeExtTokenIdentifier(
  canisterId: string,
  index: number,
): string {
  const canisterBytes = Principal.fromText(canisterId).toUint8Array();
  const indexBuffer = new ArrayBuffer(4);
  new DataView(indexBuffer).setUint32(0, index); // big-endian
  const indexBytes = new Uint8Array(indexBuffer);

  const bytes = new Uint8Array(
    EXT_TOKEN_IDENTIFIER_MAGIC.length +
      canisterBytes.length +
      indexBytes.length,
  );
  bytes.set(EXT_TOKEN_IDENTIFIER_MAGIC, 0);
  bytes.set(canisterBytes, EXT_TOKEN_IDENTIFIER_MAGIC.length);
  bytes.set(
    indexBytes,
    EXT_TOKEN_IDENTIFIER_MAGIC.length + canisterBytes.length,
  );

  return Principal.fromUint8Array(bytes).toText();
}

/**
 * Builds a thumbnail image URL for an EXT-standard NFT, served directly by the
 * collection's own canister via its raw asset gateway — no candid call needed.
 * @param canisterId the collection's canister id (as text)
 * @param index the token's numeric index
 */
export function buildExtThumbnailUrl(
  canisterId: string,
  index: number,
): string {
  const tokenIdentifier = encodeExtTokenIdentifier(canisterId, index);
  return `https://${canisterId}.raw.icp0.io/?type=thumbnail&tokenid=${tokenIdentifier}`;
}
