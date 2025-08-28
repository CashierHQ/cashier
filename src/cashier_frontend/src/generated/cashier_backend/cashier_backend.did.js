export const idlFactory = ({ IDL }) => {
  const CanisterError = IDL.Rec();
  const LogServiceSettings = IDL.Record({
    'log_filter' : IDL.Opt(IDL.Text),
    'in_memory_records' : IDL.Opt(IDL.Nat64),
    'enable_console' : IDL.Opt(IDL.Bool),
    'max_record_length' : IDL.Opt(IDL.Nat64),
  });
  const CashierBackendInitData = IDL.Record({
    'log_settings' : IDL.Opt(LogServiceSettings),
  });
  const CreateActionInput = IDL.Record({
    'link_id' : IDL.Text,
    'action_type' : IDL.Text,
  });
  const Icrc112Request = IDL.Record({
    'arg' : IDL.Vec(IDL.Nat8),
    'method' : IDL.Text,
    'canister_id' : IDL.Principal,
    'nonce' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const AssetDto = IDL.Record({ 'chain' : IDL.Text, 'address' : IDL.Text });
  const MetadataValue = IDL.Variant({
    'Nat' : IDL.Nat,
    'U64' : IDL.Nat64,
    'MaybeNat' : IDL.Opt(IDL.Nat),
    'String' : IDL.Text,
    'MaybeMemo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'Asset' : AssetDto,
    'Wallet' : AssetDto,
  });
  const TransactionDto = IDL.Record({
    'id' : IDL.Text,
    'protocol' : IDL.Text,
    'protocol_metadata' : IDL.Vec(IDL.Tuple(IDL.Text, MetadataValue)),
    'from_call_type' : IDL.Text,
    'created_at' : IDL.Nat64,
    'state' : IDL.Text,
    'dependency' : IDL.Opt(IDL.Vec(IDL.Text)),
    'group' : IDL.Nat16,
  });
  const IntentDto = IDL.Record({
    'id' : IDL.Text,
    'chain' : IDL.Text,
    'task' : IDL.Text,
    'type' : IDL.Text,
    'created_at' : IDL.Nat64,
    'type_metadata' : IDL.Vec(IDL.Tuple(IDL.Text, MetadataValue)),
    'state' : IDL.Text,
    'transactions' : IDL.Vec(TransactionDto),
  });
  const ActionDto = IDL.Record({
    'id' : IDL.Text,
    'icrc_112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
    'creator' : IDL.Text,
    'intents' : IDL.Vec(IntentDto),
    'type' : IDL.Text,
    'state' : IDL.Text,
  });
  CanisterError.fill(
    IDL.Variant({
      'InvalidDataError' : IDL.Text,
      'InvalidStateTransition' : IDL.Record({
        'to' : IDL.Text,
        'from' : IDL.Text,
      }),
      'TransactionTimeout' : IDL.Text,
      'BatchError' : IDL.Vec(CanisterError),
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
      'CanisterCallError' : IDL.Record({
        'method' : IDL.Text,
        'canister_id' : IDL.Text,
        'message' : IDL.Text,
      }),
      'UnboundedError' : IDL.Text,
      'CallCanisterFailed' : IDL.Text,
    })
  );
  const Result = IDL.Variant({ 'Ok' : ActionDto, 'Err' : CanisterError });
  const CreateActionAnonymousInput = IDL.Record({
    'link_id' : IDL.Text,
    'action_type' : IDL.Text,
    'wallet_address' : IDL.Text,
  });
  const LinkDetailUpdateAssetInfoInput = IDL.Record({
    'amount_per_link_use_action' : IDL.Nat64,
    'chain' : IDL.Text,
    'label' : IDL.Text,
    'address' : IDL.Text,
  });
  const CreateLinkInput = IDL.Record({
    'title' : IDL.Text,
    'asset_info' : IDL.Vec(LinkDetailUpdateAssetInfoInput),
    'link_type' : IDL.Text,
    'description' : IDL.Opt(IDL.Text),
    'link_image_url' : IDL.Opt(IDL.Text),
    'template' : IDL.Text,
    'link_use_action_max_count' : IDL.Nat64,
    'nft_image' : IDL.Opt(IDL.Text),
  });
  const AssetInfoDto = IDL.Record({
    'amount_per_link_use_action' : IDL.Nat64,
    'chain' : IDL.Text,
    'label' : IDL.Text,
    'address' : IDL.Text,
  });
  const LinkDto = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Opt(IDL.Text),
    'creator' : IDL.Text,
    'asset_info' : IDL.Opt(IDL.Vec(AssetInfoDto)),
    'link_type' : IDL.Opt(IDL.Text),
    'metadata' : IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))),
    'create_at' : IDL.Nat64,
    'description' : IDL.Opt(IDL.Text),
    'state' : IDL.Text,
    'template' : IDL.Opt(IDL.Text),
    'link_use_action_max_count' : IDL.Nat64,
    'link_use_action_counter' : IDL.Nat64,
  });
  const Result_1 = IDL.Variant({ 'Ok' : LinkDto, 'Err' : CanisterError });
  const UserDto = IDL.Record({
    'id' : IDL.Text,
    'email' : IDL.Opt(IDL.Text),
    'wallet' : IDL.Text,
  });
  const Result_2 = IDL.Variant({ 'Ok' : UserDto, 'Err' : IDL.Text });
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
  const GetLinkOptions = IDL.Record({ 'action_type' : IDL.Text });
  const GetLinkResp = IDL.Record({
    'action' : IDL.Opt(ActionDto),
    'link' : LinkDto,
  });
  const Result_3 = IDL.Variant({ 'Ok' : GetLinkResp, 'Err' : IDL.Text });
  const PaginateInput = IDL.Record({
    'offset' : IDL.Nat64,
    'limit' : IDL.Nat64,
  });
  const PaginateResultMetadata = IDL.Record({
    'is_next' : IDL.Bool,
    'is_prev' : IDL.Bool,
    'total' : IDL.Nat64,
    'offset' : IDL.Nat64,
    'limit' : IDL.Nat64,
  });
  const PaginateResult = IDL.Record({
    'metadata' : PaginateResultMetadata,
    'data' : IDL.Vec(LinkDto),
  });
  const Result_4 = IDL.Variant({ 'Ok' : PaginateResult, 'Err' : IDL.Text });
  const Result_5 = IDL.Variant({ 'Ok' : UserDto, 'Err' : IDL.Text });
  const Icrc21SupportedStandard = IDL.Record({
    'url' : IDL.Text,
    'name' : IDL.Text,
  });
  const Icrc114ValidateArgs = IDL.Record({
    'arg' : IDL.Vec(IDL.Nat8),
    'res' : IDL.Vec(IDL.Nat8),
    'method' : IDL.Text,
    'canister_id' : IDL.Principal,
    'nonce' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Icrc21ConsentMessageMetadata = IDL.Record({
    'utc_offset_minutes' : IDL.Opt(IDL.Int16),
    'language' : IDL.Text,
  });
  const Icrc21DeviceSpec = IDL.Variant({
    'GenericDisplay' : IDL.Null,
    'LineDisplay' : IDL.Record({
      'characters_per_line' : IDL.Nat16,
      'lines_per_page' : IDL.Nat16,
    }),
  });
  const Icrc21ConsentMessageSpec = IDL.Record({
    'metadata' : Icrc21ConsentMessageMetadata,
    'device_spec' : IDL.Opt(Icrc21DeviceSpec),
  });
  const Icrc21ConsentMessageRequest = IDL.Record({
    'arg' : IDL.Vec(IDL.Nat8),
    'method' : IDL.Text,
    'user_preferences' : Icrc21ConsentMessageSpec,
  });
  const Icrc21LineDisplayPage = IDL.Record({ 'lines' : IDL.Vec(IDL.Text) });
  const Icrc21ConsentMessage = IDL.Variant({
    'LineDisplayMessage' : IDL.Record({
      'pages' : IDL.Vec(Icrc21LineDisplayPage),
    }),
    'GenericDisplayMessage' : IDL.Text,
  });
  const Icrc21ConsentInfo = IDL.Record({
    'metadata' : Icrc21ConsentMessageMetadata,
    'consent_message' : Icrc21ConsentMessage,
  });
  const Icrc21ErrorInfo = IDL.Record({ 'description' : IDL.Text });
  const Icrc21Error = IDL.Variant({
    'GenericError' : IDL.Record({
      'description' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'InsufficientPayment' : Icrc21ErrorInfo,
    'UnsupportedCanisterCall' : Icrc21ErrorInfo,
    'ConsentMessageUnavailable' : Icrc21ErrorInfo,
  });
  const Result_6 = IDL.Variant({
    'Ok' : Icrc21ConsentInfo,
    'Err' : Icrc21Error,
  });
  const Icrc28TrustedOriginsResponse = IDL.Record({
    'trusted_origins' : IDL.Vec(IDL.Text),
  });
  const LinkGetUserStateInput = IDL.Record({
    'link_id' : IDL.Text,
    'action_type' : IDL.Text,
    'anonymous_wallet_address' : IDL.Opt(IDL.Text),
  });
  const LinkGetUserStateOutput = IDL.Record({
    'action' : ActionDto,
    'link_user_state' : IDL.Text,
  });
  const Result_7 = IDL.Variant({
    'Ok' : IDL.Opt(LinkGetUserStateOutput),
    'Err' : CanisterError,
  });
  const LinkUpdateUserStateInput = IDL.Record({
    'link_id' : IDL.Text,
    'action_type' : IDL.Text,
    'goto' : IDL.Text,
    'anonymous_wallet_address' : IDL.Opt(IDL.Text),
  });
  const ProcessActionInput = IDL.Record({
    'action_id' : IDL.Text,
    'link_id' : IDL.Text,
    'action_type' : IDL.Text,
  });
  const ProcessActionAnonymousInput = IDL.Record({
    'action_id' : IDL.Text,
    'link_id' : IDL.Text,
    'action_type' : IDL.Text,
    'wallet_address' : IDL.Text,
  });
  const TriggerTransactionInput = IDL.Record({
    'transaction_id' : IDL.Text,
    'action_id' : IDL.Text,
    'link_id' : IDL.Text,
  });
  const Result_8 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : CanisterError });
  const UpdateActionInput = IDL.Record({
    'action_id' : IDL.Text,
    'link_id' : IDL.Text,
    'external' : IDL.Bool,
  });
  const LinkDetailUpdateInput = IDL.Record({
    'title' : IDL.Opt(IDL.Text),
    'asset_info' : IDL.Opt(IDL.Vec(AssetInfoDto)),
    'link_type' : IDL.Opt(IDL.Text),
    'description' : IDL.Opt(IDL.Text),
    'link_image_url' : IDL.Opt(IDL.Text),
    'template' : IDL.Opt(IDL.Text),
    'link_use_action_max_count' : IDL.Opt(IDL.Nat64),
    'nft_image' : IDL.Opt(IDL.Text),
  });
  const UpdateLinkInput = IDL.Record({
    'id' : IDL.Text,
    'action' : IDL.Text,
    'params' : IDL.Opt(LinkDetailUpdateInput),
  });
  return IDL.Service({
    'create_action' : IDL.Func([CreateActionInput], [Result], []),
    'create_action_anonymous' : IDL.Func(
        [CreateActionAnonymousInput],
        [Result],
        [],
      ),
    'create_link' : IDL.Func([CreateLinkInput], [Result_1], []),
    'create_user' : IDL.Func([], [Result_2], []),
    'get_canister_build_data' : IDL.Func([], [BuildData], ['query']),
    'get_link' : IDL.Func(
        [IDL.Text, IDL.Opt(GetLinkOptions)],
        [Result_3],
        ['query'],
      ),
    'get_links' : IDL.Func([IDL.Opt(PaginateInput)], [Result_4], ['query']),
    'get_user' : IDL.Func([], [Result_5], ['query']),
    'icrc10_supported_standards' : IDL.Func(
        [],
        [IDL.Vec(Icrc21SupportedStandard)],
        ['query'],
      ),
    'icrc114_validate' : IDL.Func([Icrc114ValidateArgs], [IDL.Bool], []),
    'icrc21_canister_call_consent_message' : IDL.Func(
        [Icrc21ConsentMessageRequest],
        [Result_6],
        [],
      ),
    'icrc28_trusted_origins' : IDL.Func([], [Icrc28TrustedOriginsResponse], []),
    'link_get_user_state' : IDL.Func([LinkGetUserStateInput], [Result_7], []),
    'link_update_user_state' : IDL.Func(
        [LinkUpdateUserStateInput],
        [Result_7],
        [],
      ),
    'process_action' : IDL.Func([ProcessActionInput], [Result], []),
    'process_action_anonymous' : IDL.Func(
        [ProcessActionAnonymousInput],
        [Result],
        [],
      ),
    'trigger_transaction' : IDL.Func([TriggerTransactionInput], [Result_8], []),
    'update_action' : IDL.Func([UpdateActionInput], [Result], []),
    'update_link' : IDL.Func([UpdateLinkInput], [Result_1], []),
  });
};
export const init = ({ IDL }) => {
  const LogServiceSettings = IDL.Record({
    'log_filter' : IDL.Opt(IDL.Text),
    'in_memory_records' : IDL.Opt(IDL.Nat64),
    'enable_console' : IDL.Opt(IDL.Bool),
    'max_record_length' : IDL.Opt(IDL.Nat64),
  });
  const CashierBackendInitData = IDL.Record({
    'log_settings' : IDL.Opt(LogServiceSettings),
  });
  return [CashierBackendInitData];
};
