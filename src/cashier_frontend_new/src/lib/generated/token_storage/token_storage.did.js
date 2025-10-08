export const idlFactory = ({ IDL }) => {
  const ChainTokenDetails = IDL.Variant({
    'IC' : IDL.Record({
      'fee' : IDL.Nat,
      'ledger_id' : IDL.Principal,
      'index_id' : IDL.Opt(IDL.Principal),
    }),
  });
  const RegistryToken = IDL.Record({
    'decimals' : IDL.Nat8,
    'name' : IDL.Text,
    'enabled_by_default' : IDL.Bool,
    'details' : ChainTokenDetails,
    'symbol' : IDL.Text,
  });
  const LogServiceSettings = IDL.Record({
    'log_filter' : IDL.Opt(IDL.Text),
    'in_memory_records' : IDL.Opt(IDL.Nat64),
    'enable_console' : IDL.Opt(IDL.Bool),
    'max_record_length' : IDL.Opt(IDL.Nat64),
  });
  const TokenStorageInitData = IDL.Record({
    'owner' : IDL.Principal,
    'tokens' : IDL.Opt(IDL.Vec(RegistryToken)),
    'log_settings' : IDL.Opt(LogServiceSettings),
  });
  const TokenId = IDL.Variant({
    'IC' : IDL.Record({ 'ledger_id' : IDL.Principal }),
  });
  const AddTokenInput = IDL.Record({
    'token_id' : TokenId,
    'index_id' : IDL.Opt(IDL.Text),
  });
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const AddTokensInput = IDL.Record({ 'token_ids' : IDL.Vec(TokenId) });
  const TokenRegistryMetadata = IDL.Record({
    'last_updated' : IDL.Nat64,
    'version' : IDL.Nat64,
  });
  const Chain = IDL.Variant({ 'IC' : IDL.Null });
  const TokenDto = IDL.Record({
    'id' : TokenId,
    'decimals' : IDL.Nat8,
    'balance' : IDL.Opt(IDL.Nat),
    'chain' : Chain,
    'name' : IDL.Text,
    'is_default' : IDL.Bool,
    'enabled' : IDL.Bool,
    'details' : ChainTokenDetails,
    'string_id' : IDL.Text,
    'symbol' : IDL.Text,
  });
  const RegistryStats = IDL.Record({
    'total_enabled_default' : IDL.Nat64,
    'total_tokens' : IDL.Nat64,
  });
  const Result_1 = IDL.Variant({ 'Ok' : RegistryStats, 'Err' : IDL.Text });
  const Result_2 = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Tuple(TokenId, IDL.Nat)),
    'Err' : IDL.Text,
  });
  const UserTokens = IDL.Record({
    'registry_tokens' : IDL.Nat64,
    'version' : IDL.Nat64,
    'enabled' : IDL.Nat64,
  });
  const Result_3 = IDL.Variant({ 'Ok' : UserTokens, 'Err' : IDL.Text });
  const TokenStorageError = IDL.Variant({ 'AuthError' : IDL.Text });
  const Result_4 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : TokenStorageError });
  const UserPreference = IDL.Record({
    'hide_zero_balance' : IDL.Bool,
    'selected_chain' : IDL.Vec(Chain),
    'hide_unknown_token' : IDL.Bool,
  });
  const TokenListResponse = IDL.Record({
    'need_update_version' : IDL.Bool,
    'tokens' : IDL.Vec(TokenDto),
    'perference' : IDL.Opt(UserPreference),
  });
  const Result_5 = IDL.Variant({ 'Ok' : TokenListResponse, 'Err' : IDL.Text });
  const Permission = IDL.Variant({ 'Admin' : IDL.Null });
  const Result_6 = IDL.Variant({
    'Ok' : IDL.Vec(Permission),
    'Err' : TokenStorageError,
  });
  const BuildData = IDL.Record({
    'rustc_semver' : IDL.Text,
    'git_branch' : IDL.Text,
    'pkg_version' : IDL.Text,
    'cargo_target_triple' : IDL.Text,
    'cargo_debug' : IDL.Text,
    'pkg_name' : IDL.Text,
    'cargo_features' : IDL.Text,
    'build_timestamp' : IDL.Text,
    'git_sha' : IDL.Text,
    'git_commit_timestamp' : IDL.Text,
  });
  const UpdateTokenBalanceInput = IDL.Record({
    'balance' : IDL.Nat,
    'token_id' : TokenId,
  });
  const UpdateTokenInput = IDL.Record({
    'token_id' : TokenId,
    'is_enabled' : IDL.Bool,
  });
  return IDL.Service({
    'add_token' : IDL.Func([AddTokenInput], [Result], []),
    'add_token_batch' : IDL.Func([AddTokensInput], [Result], []),
    'admin_get_registry_metadata' : IDL.Func(
        [],
        [TokenRegistryMetadata],
        ['query'],
      ),
    'admin_get_registry_tokens' : IDL.Func(
        [IDL.Bool],
        [IDL.Vec(TokenDto)],
        ['query'],
      ),
    'admin_get_stats' : IDL.Func([], [Result_1], ['query']),
    'admin_get_user_balance' : IDL.Func([IDL.Principal], [Result_2], ['query']),
    'admin_get_user_tokens' : IDL.Func([IDL.Principal], [Result_3], ['query']),
    'admin_initialize_registry' : IDL.Func([], [Result], []),
    'admin_inspect_message_enable' : IDL.Func([IDL.Bool], [Result_4], []),
    'admin_list_tokens_by_wallet' : IDL.Func(
        [IDL.Principal],
        [Result_5],
        ['query'],
      ),
    'admin_permissions_add' : IDL.Func(
        [IDL.Principal, IDL.Vec(Permission)],
        [Result_6],
        [],
      ),
    'admin_permissions_get' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Permission)],
        ['query'],
      ),
    'admin_permissions_remove' : IDL.Func(
        [IDL.Principal, IDL.Vec(Permission)],
        [Result_6],
        [],
      ),
    'get_canister_build_data' : IDL.Func([], [BuildData], ['query']),
    'is_inspect_message_enabled' : IDL.Func([], [IDL.Bool], ['query']),
    'list_tokens' : IDL.Func([], [Result_5], ['query']),
    'sync_token_list' : IDL.Func([], [Result], []),
    'update_token_balance' : IDL.Func(
        [IDL.Vec(UpdateTokenBalanceInput)],
        [Result],
        [],
      ),
    'update_token_enable' : IDL.Func([UpdateTokenInput], [Result], []),
    'update_token_registry' : IDL.Func([AddTokenInput], [Result], []),
    'update_token_registry_batch' : IDL.Func([AddTokensInput], [Result], []),
  });
};
export const init = ({ IDL }) => {
  const ChainTokenDetails = IDL.Variant({
    'IC' : IDL.Record({
      'fee' : IDL.Nat,
      'ledger_id' : IDL.Principal,
      'index_id' : IDL.Opt(IDL.Principal),
    }),
  });
  const RegistryToken = IDL.Record({
    'decimals' : IDL.Nat8,
    'name' : IDL.Text,
    'enabled_by_default' : IDL.Bool,
    'details' : ChainTokenDetails,
    'symbol' : IDL.Text,
  });
  const LogServiceSettings = IDL.Record({
    'log_filter' : IDL.Opt(IDL.Text),
    'in_memory_records' : IDL.Opt(IDL.Nat64),
    'enable_console' : IDL.Opt(IDL.Bool),
    'max_record_length' : IDL.Opt(IDL.Nat64),
  });
  const TokenStorageInitData = IDL.Record({
    'owner' : IDL.Principal,
    'tokens' : IDL.Opt(IDL.Vec(RegistryToken)),
    'log_settings' : IDL.Opt(LogServiceSettings),
  });
  return [TokenStorageInitData];
};
