export const idlFactory = ({ IDL }) => {
  const CanisterError = IDL.Rec();
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
    'ckbtc_minter_id' : IDL.Principal,
    'log_settings' : IDL.Opt(LogServiceSettings),
  });
  const TokenRegistryMetadata = IDL.Record({
    'last_updated' : IDL.Nat64,
    'version' : IDL.Nat64,
  });
  const TokenId = IDL.Variant({
    'IC' : IDL.Record({ 'ledger_id' : IDL.Principal }),
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
  const Result = IDL.Variant({ 'Ok' : RegistryStats, 'Err' : IDL.Text });
  const Result_1 = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Tuple(TokenId, IDL.Nat)),
    'Err' : IDL.Text,
  });
  const UserTokens = IDL.Record({
    'registry_tokens' : IDL.Nat64,
    'version' : IDL.Nat64,
    'enabled' : IDL.Nat64,
  });
  const Result_2 = IDL.Variant({ 'Ok' : UserTokens, 'Err' : IDL.Text });
  const Result_3 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  CanisterError.fill(
    IDL.Variant({
      'InvalidDataError' : IDL.Text,
      'InvalidStateTransition' : IDL.Record({
        'to' : IDL.Text,
        'from' : IDL.Text,
      }),
      'TransactionTimeout' : IDL.Text,
      'BatchError' : IDL.Vec(CanisterError),
      'AuthError' : IDL.Text,
      'InvalidInput' : IDL.Text,
      'HandleLogicError' : IDL.Text,
      'ParsePrincipalError' : IDL.Text,
      'CandidDecodeFailed' : IDL.Text,
      'UnknownError' : IDL.Text,
      'InsufficientBalance' : IDL.Record({
        'available' : IDL.Nat64,
        'required' : IDL.Nat64,
      }),
      'NotFound' : IDL.Text,
      'ValidationErrors' : IDL.Text,
      'ParseAccountError' : IDL.Text,
      'Unauthorized' : IDL.Text,
      'AlreadyExists' : IDL.Text,
      'DependencyError' : IDL.Text,
      'CandidError' : IDL.Text,
      'AnonymousCall' : IDL.Null,
      'StorageError' : IDL.Text,
      'CanisterCallError' : IDL.Record({
        'method' : IDL.Text,
        'canister_id' : IDL.Text,
        'message' : IDL.Text,
      }),
      'UnboundedError' : IDL.Text,
      'CallCanisterFailed' : IDL.Text,
    })
  );
  const Result_4 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : CanisterError });
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
    'Err' : CanisterError,
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
  const Nft = IDL.Record({
    'token_id' : IDL.Nat,
    'collection_id' : IDL.Principal,
  });
  const AddUserNftInput = IDL.Record({ 'nft' : Nft });
  const UserNftDto = IDL.Record({ 'nft' : Nft, 'user' : IDL.Principal });
  const Result_7 = IDL.Variant({ 'Ok' : UserNftDto, 'Err' : CanisterError });
  const AddTokenInput = IDL.Record({
    'token_id' : TokenId,
    'index_id' : IDL.Opt(IDL.Text),
  });
  const AddTokensInput = IDL.Record({ 'token_ids' : IDL.Vec(TokenId) });
  const BridgeAssetType = IDL.Variant({
    'BTC' : IDL.Null,
    'Runes' : IDL.Null,
    'Ordinals' : IDL.Null,
  });
  const BridgeAssetInfo = IDL.Record({
    'decimals' : IDL.Nat8,
    'asset_type' : BridgeAssetType,
    'asset_id' : IDL.Text,
    'amount' : IDL.Nat,
  });
  const BridgeType = IDL.Variant({ 'Import' : IDL.Null, 'Export' : IDL.Null });
  const CreateBridgeTransactionInputArg = IDL.Record({
    'asset_infos' : IDL.Vec(BridgeAssetInfo),
    'btc_txid' : IDL.Opt(IDL.Text),
    'icp_address' : IDL.Principal,
    'created_at_ts' : IDL.Nat64,
    'withdrawal_fee' : IDL.Opt(IDL.Nat),
    'btc_address' : IDL.Text,
    'bridge_type' : BridgeType,
    'deposit_fee' : IDL.Opt(IDL.Nat),
  });
  const BridgeTransactionStatus = IDL.Variant({
    'Failed' : IDL.Null,
    'Created' : IDL.Null,
    'Completed' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const BlockConfirmation = IDL.Record({
    'block_id' : IDL.Nat64,
    'block_timestamp' : IDL.Nat64,
  });
  const UserBridgeTransactionDto = IDL.Record({
    'status' : BridgeTransactionStatus,
    'block_confirmations' : IDL.Vec(BlockConfirmation),
    'block_id' : IDL.Opt(IDL.Nat64),
    'asset_infos' : IDL.Vec(BridgeAssetInfo),
    'total_amount' : IDL.Opt(IDL.Nat),
    'btc_txid' : IDL.Opt(IDL.Text),
    'icp_address' : IDL.Principal,
    'created_at_ts' : IDL.Nat64,
    'withdrawal_fee' : IDL.Opt(IDL.Nat),
    'block_timestamp' : IDL.Opt(IDL.Nat64),
    'bridge_id' : IDL.Text,
    'btc_address' : IDL.Text,
    'bridge_type' : BridgeType,
    'deposit_fee' : IDL.Opt(IDL.Nat),
  });
  const Result_8 = IDL.Variant({
    'Ok' : UserBridgeTransactionDto,
    'Err' : CanisterError,
  });
  const GetUserBridgeTransactionsInputArg = IDL.Record({
    'status' : IDL.Opt(BridgeTransactionStatus),
    'limit' : IDL.Opt(IDL.Nat32),
    'start' : IDL.Opt(IDL.Nat32),
  });
  const Result_9 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : CanisterError });
  const GetUserNftInput = IDL.Record({
    'limit' : IDL.Opt(IDL.Nat32),
    'start' : IDL.Opt(IDL.Nat32),
  });
  const UpdateBridgeTransactionInputArg = IDL.Record({
    'status' : IDL.Opt(BridgeTransactionStatus),
    'block_confirmations' : IDL.Opt(IDL.Vec(BlockConfirmation)),
    'block_id' : IDL.Opt(IDL.Nat64),
    'btc_txid' : IDL.Opt(IDL.Text),
    'withdrawal_fee' : IDL.Opt(IDL.Nat),
    'block_timestamp' : IDL.Opt(IDL.Nat64),
    'bridge_id' : IDL.Text,
    'deposit_fee' : IDL.Opt(IDL.Nat),
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
    'admin_get_stats' : IDL.Func([], [Result], ['query']),
    'admin_get_user_balance' : IDL.Func([IDL.Principal], [Result_1], ['query']),
    'admin_get_user_tokens' : IDL.Func([IDL.Principal], [Result_2], ['query']),
    'admin_initialize_registry' : IDL.Func([], [Result_3], []),
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
    'user_add_nft' : IDL.Func([AddUserNftInput], [Result_7], []),
    'user_add_token' : IDL.Func([AddTokenInput], [Result_3], []),
    'user_add_token_batch' : IDL.Func([AddTokensInput], [Result_3], []),
    'user_create_bridge_transaction' : IDL.Func(
        [CreateBridgeTransactionInputArg],
        [Result_8],
        [],
      ),
    'user_get_bridge_transaction_by_id' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(UserBridgeTransactionDto)],
        ['query'],
      ),
    'user_get_bridge_transactions' : IDL.Func(
        [GetUserBridgeTransactionsInputArg],
        [IDL.Vec(UserBridgeTransactionDto)],
        ['query'],
      ),
    'user_get_btc_address' : IDL.Func([], [Result_9], []),
    'user_get_nfts' : IDL.Func([GetUserNftInput], [IDL.Vec(Nft)], ['query']),
    'user_sync_token_list' : IDL.Func([], [Result_3], []),
    'user_update_bridge_transaction' : IDL.Func(
        [UpdateBridgeTransactionInputArg],
        [Result_8],
        [],
      ),
    'user_update_token_balance' : IDL.Func(
        [IDL.Vec(UpdateTokenBalanceInput)],
        [Result_3],
        [],
      ),
    'user_update_token_enable' : IDL.Func([UpdateTokenInput], [Result_3], []),
    'user_update_token_registry' : IDL.Func([AddTokenInput], [Result_3], []),
    'user_update_token_registry_batch' : IDL.Func(
        [AddTokensInput],
        [Result_3],
        [],
      ),
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
    'ckbtc_minter_id' : IDL.Principal,
    'log_settings' : IDL.Opt(LogServiceSettings),
  });
  return [TokenStorageInitData];
};
