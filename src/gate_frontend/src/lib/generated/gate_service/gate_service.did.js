export const idlFactory = ({ IDL }) => {
  const XProfile = IDL.Record({
    id: IDL.Text,
    username: IDL.Text,
    name: IDL.Text,
    profile_image_url: IDL.Text,
  });
  const XTokenExchangeResult = IDL.Record({
    access_token: IDL.Text,
    profile: XProfile,
  });
  const GateServiceError = IDL.Variant({
    InvalidKeyType: IDL.Text,
    AuthError: IDL.Text,
    OpenFailed: IDL.Text,
    AddFailed: IDL.Text,
    UnsupportedGateType: IDL.Text,
    NotFound: IDL.Null,
    HashingFailed: IDL.Text,
    Unauthorized: IDL.Null,
    UnsupportedGateKey: IDL.Text,
    RepositoryError: IDL.Text,
    KeyVerificationFailed: IDL.Text,
  });
  const Result_4 = IDL.Variant({
    Ok: XTokenExchangeResult,
    Err: GateServiceError,
  });
  return IDL.Service({
    exchange_x_token: IDL.Func([IDL.Text], [Result_4], []),
  });
};

export const init = ({ IDL }) => {
  return [];
};
