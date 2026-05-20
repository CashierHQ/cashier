export type Icrc49Bytes = ArrayBuffer | Uint8Array;

export type Icrc49ContentMap = {
  reply?: {
    arg?: Icrc49Bytes;
  };
  ingress_expiry?: unknown;
};

export type Icrc49RawCallResult = {
  contentMap: Uint8Array;
  certificate: Uint8Array;
  replyArg: Uint8Array;
};
