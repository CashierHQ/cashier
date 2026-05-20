export type Icrc49ContentMap = {
  reply?: {
    arg?: ArrayBuffer;
  };
  ingress_expiry?: unknown;
};

export type Icrc49RawCallResult = {
  contentMap: ArrayBuffer;
  certificate: ArrayBuffer;
  replyArg: ArrayBuffer;
};
