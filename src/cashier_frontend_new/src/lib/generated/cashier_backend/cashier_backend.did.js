export const idlFactory = ({ IDL }) => {
  const CanisterError = IDL.Rec();
  const LogServiceSettings = IDL.Record({
    'log_filter' : IDL.Opt(IDL.Text),
    'in_memory_records' : IDL.Opt(IDL.Nat64),
    'enable_console' : IDL.Opt(IDL.Bool),
    'max_record_length' : IDL.Opt(IDL.Nat64),
  });
  const CashierBackendInitData = IDL.Record({
    'token_fee_ttl_ns' : IDL.Opt(IDL.Nat64),
    'owner' : IDL.Principal,
    'log_settings' : IDL.Opt(LogServiceSettings),
    'token_standard_cache_ttl_ns' : IDL.Opt(IDL.Nat64),
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
      'AuthError' : IDL.Text,
      'BackoffThrottled' : IDL.Text,
      'InvalidInput' : IDL.Text,
      'HandleLogicError' : IDL.Text,
      'ParsePrincipalError' : IDL.Text,
      'LinkNoUseAvailable' : IDL.Record({ 'link_id' : IDL.Text }),
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
      'RateLimited' : IDL.Text,
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
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : CanisterError });
  const BackoffConfig = IDL.Record({
    'enabled' : IDL.Bool,
    'base_wait_secs' : IDL.Nat64,
  });
  const SettingsDto = IDL.Record({
    'inspect_message_enabled' : IDL.Bool,
    'gate_service_canister_id' : IDL.Principal,
    'token_storage_canister_id' : IDL.Principal,
  });
  const Permission = IDL.Variant({ 'Admin' : IDL.Null });
  const Result_1 = IDL.Variant({
    'Ok' : IDL.Vec(Permission),
    'Err' : CanisterError,
  });
  const RateLimitConfig = IDL.Record({
    'window_secs' : IDL.Nat64,
    'enabled' : IDL.Bool,
    'max_requests' : IDL.Nat32,
  });
  const UpdateSettingArgs = IDL.Record({
    'inspect_message_enabled' : IDL.Opt(IDL.Bool),
    'gate_service_canister_id' : IDL.Opt(IDL.Principal),
    'token_storage_canister_id' : IDL.Opt(IDL.Principal),
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
  const ActionType_1 = IDL.Variant({
    'Withdraw' : IDL.Null,
    'Send' : IDL.Null,
    'CreateLink' : IDL.Null,
    'Receive' : IDL.Null,
  });
  const GetLinkOptions = IDL.Record({ 'action_type' : ActionType_1 });
  const TokenStandard = IDL.Variant({ 'ICRC1' : IDL.Null, 'ICRC2' : IDL.Null });
  const Asset = IDL.Record({
    'token_standard' : IDL.Opt(TokenStandard),
    'address' : IDL.Principal,
    'network_fee' : IDL.Opt(IDL.Nat),
  });
  const AssetInfo = IDL.Record({
    'asset' : Asset,
    'label' : IDL.Text,
    'available_amount' : IDL.Opt(IDL.Nat),
    'amount' : IDL.Nat,
  });
  const LinkState = IDL.Variant({
    'Ended' : IDL.Null,
    'Preview' : IDL.Null,
    'ChooseType' : IDL.Null,
    'Inactive' : IDL.Null,
    'Active' : IDL.Null,
    'AddAsset' : IDL.Null,
    'Created' : IDL.Null,
  });
  const LinkType = IDL.Variant({
    'SendAirdrop' : IDL.Null,
    'SendTip' : IDL.Null,
    'ReceivePayment' : IDL.Null,
    'SendTokenBasket' : IDL.Null,
  });
  const Link = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Text,
    'creator' : IDL.Principal,
    'asset_info' : IDL.Vec(AssetInfo),
    'link_state' : LinkState,
    'link_type' : LinkType,
    'created_at' : IDL.Opt(IDL.Nat64),
    'use_count' : IDL.Nat64,
    'max_use' : IDL.Nat64,
  });
  const AddressType = IDL.Variant({
    'Gate' : IDL.Null,
    'Link' : IDL.Null,
    'User' : IDL.Null,
    'Treasury' : IDL.Null,
    'Creator' : IDL.Null,
  });
  const IntentState = IDL.Variant({
    'Fail' : IDL.Null,
    'Success' : IDL.Null,
    'Processing' : IDL.Null,
    'Created' : IDL.Null,
  });
  const IntentType = IDL.Variant({ 'Send' : IDL.Null, 'Receive' : IDL.Null });
  const Intent = IDL.Record({
    'id' : IDL.Text,
    'action_id' : IDL.Opt(IDL.Text),
    'user_fee' : IDL.Opt(IDL.Nat),
    'total_amount' : IDL.Opt(IDL.Nat),
    'asset' : Asset,
    'dest_address_type' : AddressType,
    'dest_address' : IDL.Principal,
    'label' : IDL.Text,
    'source_address' : IDL.Principal,
    'intent_state' : IntentState,
    'source_address_type' : AddressType,
    'dependencies' : IDL.Opt(IDL.Vec(IDL.Text)),
    'amount' : IDL.Nat,
    'network_fee' : IDL.Opt(IDL.Nat),
    'intent_type' : IntentType,
  });
  const Action = IDL.Record({
    'id' : IDL.Text,
    'creator' : IDL.Principal,
    'intents' : IDL.Vec(Intent),
    'link_id' : IDL.Opt(IDL.Text),
    'action_type' : ActionType_1,
    'action_state' : IntentState,
    'creator_address_type' : AddressType,
    'intent_ids' : IDL.Opt(IDL.Vec(IDL.Text)),
  });
  const Icrc112Request = IDL.Record({
    'arg' : IDL.Vec(IDL.Nat8),
    'method' : IDL.Text,
    'canister_id' : IDL.Principal,
    'nonce' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'intent_ids' : IDL.Vec(IDL.Text),
  });
  const GetLinkResponseV3 = IDL.Record({
    'link' : Link,
    'actions' : IDL.Vec(Action),
    'icrc112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
  });
  const Result_2 = IDL.Variant({
    'Ok' : GetLinkResponseV3,
    'Err' : CanisterError,
  });
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
  const Result_3 = IDL.Variant({
    'Ok' : Icrc21ConsentInfo,
    'Err' : Icrc21Error,
  });
  const Icrc28TrustedOriginsResponse = IDL.Record({
    'trusted_origins' : IDL.Vec(IDL.Text),
  });
  const CreateActionInputV3 = IDL.Record({
    'action' : Action,
    'link_id' : IDL.Text,
  });
  const CreateActionResponseV3 = IDL.Record({
    'action' : Action,
    'link' : Link,
    'icrc112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
  });
  const Result_4 = IDL.Variant({
    'Ok' : CreateActionResponseV3,
    'Err' : CanisterError,
  });
  const GateKey = IDL.Variant({
    'Password' : IDL.Text,
    'OTPSms' : IDL.Text,
    'OTPEmail' : IDL.Text,
    'XFollowing' : IDL.Text,
    'DiscordServer' : IDL.Text,
    'XLikedPost' : IDL.Text,
    'PasswordRedacted' : IDL.Null,
    'XRetweetedPost' : IDL.Text,
    'XRetweetedPostCredential' : IDL.Record({ 'user_id' : IDL.Text }),
    'XOwnedAccount' : IDL.Text,
    'XLikedPostCredential' : IDL.Record({
      'user_id' : IDL.Text,
      'access_token' : IDL.Text,
    }),
    'TelegramGroup' : IDL.Text,
  });
  const CreateLinkInputV3 = IDL.Record({
    'title' : IDL.Text,
    'action' : Action,
    'link_type' : LinkType,
    'gate_keys' : IDL.Opt(IDL.Vec(GateKey)),
    'max_use' : IDL.Nat64,
  });
  const Gate = IDL.Record({
    'id' : IDL.Text,
    'key' : GateKey,
    'creator' : IDL.Principal,
    'subject_id' : IDL.Text,
  });
  const CreateLinkResponseV3 = IDL.Record({
    'action' : Action,
    'link' : Link,
    'gates' : IDL.Vec(Gate),
    'icrc112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
  });
  const Result_5 = IDL.Variant({
    'Ok' : CreateLinkResponseV3,
    'Err' : CanisterError,
  });
  const DisableLinkResponseV3 = IDL.Record({ 'link' : Link });
  const Result_6 = IDL.Variant({
    'Ok' : DisableLinkResponseV3,
    'Err' : CanisterError,
  });
  const GateStatus = IDL.Variant({ 'Open' : IDL.Null, 'Closed' : IDL.Null });
  const GateUserStatus = IDL.Record({
    'status' : GateStatus,
    'user_id' : IDL.Principal,
    'gate_id' : IDL.Text,
  });
  const GateForUser = IDL.Record({
    'gate_user_status' : IDL.Opt(GateUserStatus),
    'gate' : Gate,
  });
  const GetLinkDetailsResponseV3 = IDL.Record({
    'link' : Link,
    'actions' : IDL.Vec(Action),
    'gates' : IDL.Vec(GateForUser),
    'icrc112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
  });
  const Result_7 = IDL.Variant({
    'Ok' : GetLinkDetailsResponseV3,
    'Err' : CanisterError,
  });
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
    'data' : IDL.Vec(Link),
  });
  const Result_8 = IDL.Variant({
    'Ok' : PaginateResult,
    'Err' : CanisterError,
  });
  const OpenGateSuccessResult = IDL.Record({
    'gate_user_status' : GateUserStatus,
    'gate' : Gate,
  });
  const Result_9 = IDL.Variant({
    'Ok' : OpenGateSuccessResult,
    'Err' : CanisterError,
  });
  const ProcessActionInputV3 = IDL.Record({ 'action_id' : IDL.Text });
  const ProcessActionResponseV3 = IDL.Record({
    'action' : Action,
    'link' : Link,
    'errors' : IDL.Vec(IDL.Text),
    'is_success' : IDL.Bool,
    'icrc112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
  });
  const Result_10 = IDL.Variant({
    'Ok' : ProcessActionResponseV3,
    'Err' : CanisterError,
  });
  return IDL.Service({
    'admin_fee_cache_clear' : IDL.Func([], [Result], []),
    'admin_fee_cache_clear_token' : IDL.Func([IDL.Principal], [Result], []),
    'admin_flush_token_standard_cache' : IDL.Func([], [Result], []),
    'admin_gate_backoff_get' : IDL.Func([], [BackoffConfig], ['query']),
    'admin_gate_backoff_reset_user' : IDL.Func([IDL.Principal], [Result], []),
    'admin_gate_backoff_update' : IDL.Func([BackoffConfig], [Result], []),
    'admin_get_setting' : IDL.Func([], [SettingsDto], ['query']),
    'admin_inspect_message_enable' : IDL.Func([IDL.Bool], [Result], []),
    'admin_permissions_add' : IDL.Func(
        [IDL.Principal, IDL.Vec(Permission)],
        [Result_1],
        [],
      ),
    'admin_permissions_get' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Permission)],
        ['query'],
      ),
    'admin_permissions_remove' : IDL.Func(
        [IDL.Principal, IDL.Vec(Permission)],
        [Result_1],
        [],
      ),
    'admin_rate_limit_get' : IDL.Func([], [RateLimitConfig], ['query']),
    'admin_rate_limit_reset_user' : IDL.Func([IDL.Principal], [Result], []),
    'admin_rate_limit_update' : IDL.Func([RateLimitConfig], [Result], []),
    'admin_update_setting' : IDL.Func([UpdateSettingArgs], [Result], []),
    'get_canister_build_data' : IDL.Func([], [BuildData], ['query']),
    'get_link_details_v3' : IDL.Func(
        [IDL.Text, IDL.Opt(GetLinkOptions)],
        [Result_2],
        ['query'],
      ),
    'icrc10_supported_standards' : IDL.Func(
        [],
        [IDL.Vec(Icrc21SupportedStandard)],
        ['query'],
      ),
    'icrc114_validate' : IDL.Func([Icrc114ValidateArgs], [IDL.Bool], []),
    'icrc21_canister_call_consent_message' : IDL.Func(
        [Icrc21ConsentMessageRequest],
        [Result_3],
        [],
      ),
    'icrc28_trusted_origins' : IDL.Func([], [Icrc28TrustedOriginsResponse], []),
    'is_inspect_message_enabled' : IDL.Func([], [IDL.Bool], ['query']),
    'user_create_action_v3' : IDL.Func([CreateActionInputV3], [Result_4], []),
    'user_create_link_v3' : IDL.Func([CreateLinkInputV3], [Result_5], []),
    'user_disable_link_v3' : IDL.Func([IDL.Text], [Result_6], []),
    'user_get_link_details_v3' : IDL.Func(
        [IDL.Text, IDL.Opt(GetLinkOptions)],
        [Result_7],
        ['query'],
      ),
    'user_get_links_v3' : IDL.Func(
        [IDL.Opt(PaginateInput)],
        [Result_8],
        ['query'],
      ),
    'user_open_link_gate' : IDL.Func(
        [IDL.Text, IDL.Text, GateKey],
        [Result_9],
        [],
      ),
    'user_process_action_v3' : IDL.Func(
        [ProcessActionInputV3],
        [Result_10],
        [],
      ),
    'user_send_otp' : IDL.Func([IDL.Text], [Result], []),
    'user_sync_asset_balance_cache' : IDL.Func([IDL.Text], [Result_6], []),
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
    'token_fee_ttl_ns' : IDL.Opt(IDL.Nat64),
    'owner' : IDL.Principal,
    'log_settings' : IDL.Opt(LogServiceSettings),
    'token_standard_cache_ttl_ns' : IDL.Opt(IDL.Nat64),
  });
  return [CashierBackendInitData];
};
