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
    'token_storage_canister_id' : IDL.Principal,
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
  const Result = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : CanisterError });
  const Permission = IDL.Variant({ 'Admin' : IDL.Null });
  const Result_1 = IDL.Variant({
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
  const ActionType = IDL.Variant({
    'Withdraw' : IDL.Null,
    'Send' : IDL.Null,
    'CreateLink' : IDL.Null,
    'Receive' : IDL.Null,
  });
  const GetLinkOptions = IDL.Record({ 'action_type' : ActionType });
  const Icrc112Request = IDL.Record({
    'arg' : IDL.Vec(IDL.Nat8),
    'method' : IDL.Text,
    'canister_id' : IDL.Principal,
    'nonce' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Chain = IDL.Variant({ 'IC' : IDL.Null });
  const IntentTask = IDL.Variant({
    'TransferWalletToLink' : IDL.Null,
    'TransferLinkToWallet' : IDL.Null,
    'TransferWalletToTreasury' : IDL.Null,
  });
  const Wallet = IDL.Variant({
    'IC' : IDL.Record({
      'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
      'address' : IDL.Principal,
    }),
  });
  const Asset = IDL.Variant({
    'IC' : IDL.Record({ 'address' : IDL.Principal }),
  });
  const TransferData = IDL.Record({
    'to' : Wallet,
    'asset' : Asset,
    'from' : Wallet,
    'amount' : IDL.Nat,
  });
  const TransferFromData = IDL.Record({
    'to' : Wallet,
    'asset' : Asset,
    'from' : Wallet,
    'actual_amount' : IDL.Opt(IDL.Nat),
    'amount' : IDL.Nat,
    'approve_amount' : IDL.Opt(IDL.Nat),
    'spender' : Wallet,
  });
  const IntentType = IDL.Variant({
    'Transfer' : TransferData,
    'TransferFrom' : TransferFromData,
  });
  const IntentState_1 = IDL.Variant({
    'Fail' : IDL.Null,
    'Success' : IDL.Null,
    'Processing' : IDL.Null,
    'Created' : IDL.Null,
  });
  const Icrc2Approve = IDL.Record({
    'ts' : IDL.Opt(IDL.Nat64),
    'asset' : Asset,
    'from' : Wallet,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'amount' : IDL.Nat,
    'spender' : Wallet,
  });
  const Icrc1Transfer = IDL.Record({
    'to' : Wallet,
    'ts' : IDL.Opt(IDL.Nat64),
    'asset' : Asset,
    'from' : Wallet,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'amount' : IDL.Nat,
  });
  const Icrc2TransferFrom = IDL.Record({
    'to' : Wallet,
    'ts' : IDL.Opt(IDL.Nat64),
    'asset' : Asset,
    'from' : Wallet,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'amount' : IDL.Nat,
    'spender' : Wallet,
  });
  const IcTransaction = IDL.Variant({
    'Icrc2Approve' : Icrc2Approve,
    'Icrc1Transfer' : Icrc1Transfer,
    'Icrc2TransferFrom' : Icrc2TransferFrom,
  });
  const Protocol = IDL.Variant({ 'IC' : IcTransaction });
  const FromCallType = IDL.Variant({
    'Canister' : IDL.Null,
    'Wallet' : IDL.Null,
  });
  const TransactionDto = IDL.Record({
    'id' : IDL.Text,
    'protocol' : Protocol,
    'from_call_type' : FromCallType,
    'created_at' : IDL.Nat64,
    'state' : IntentState_1,
    'dependency' : IDL.Opt(IDL.Vec(IDL.Text)),
    'group' : IDL.Nat16,
  });
  const IntentDto = IDL.Record({
    'id' : IDL.Text,
    'chain' : Chain,
    'task' : IntentTask,
    'type' : IntentType,
    'created_at' : IDL.Nat64,
    'state' : IntentState_1,
    'transactions' : IDL.Vec(TransactionDto),
  });
  const ActionType_1 = IDL.Variant({
    'Withdraw' : IDL.Null,
    'Send' : IDL.Null,
    'CreateLink' : IDL.Null,
    'Receive' : IDL.Null,
  });
  const ActionDto = IDL.Record({
    'id' : IDL.Text,
    'icrc_112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
    'creator' : IDL.Principal,
    'intents' : IDL.Vec(IntentDto),
    'type' : ActionType_1,
    'state' : IntentState_1,
  });
  const LinkUserState = IDL.Variant({
    'Address' : IDL.Null,
    'GateClosed' : IDL.Null,
    'GateOpened' : IDL.Null,
    'Completed' : IDL.Null,
  });
  const LinkUserStateDto = IDL.Record({
    'link_id' : IDL.Text,
    'user_id' : IDL.Principal,
    'state' : IDL.Opt(LinkUserState),
  });
  const AssetInfoDto = IDL.Record({
    'asset' : Asset,
    'amount_per_link_use_action' : IDL.Nat,
    'label' : IDL.Text,
  });
  const LinkType_1 = IDL.Variant({
    'SendAirdrop' : IDL.Null,
    'SendTip' : IDL.Null,
    'ReceivePayment' : IDL.Null,
    'SendTokenBasket' : IDL.Null,
  });
  const LinkState = IDL.Variant({
    'Inactive' : IDL.Null,
    'Active' : IDL.Null,
    'CreateLink' : IDL.Null,
    'InactiveEnded' : IDL.Null,
  });
  const LinkDto = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Text,
    'creator' : IDL.Principal,
    'asset_info' : IDL.Vec(AssetInfoDto),
    'link_type' : LinkType_1,
    'create_at' : IDL.Nat64,
    'state' : LinkState,
    'link_use_action_max_count' : IDL.Nat64,
    'link_use_action_counter' : IDL.Nat64,
  });
  const GetLinkResp = IDL.Record({
    'action' : IDL.Opt(ActionDto),
    'link_user_state' : LinkUserStateDto,
    'link' : LinkDto,
  });
  const Result_2 = IDL.Variant({ 'Ok' : GetLinkResp, 'Err' : CanisterError });
  const TokenStandard = IDL.Variant({ 'ICRC1' : IDL.Null, 'ICRC2' : IDL.Null });
  const Asset_1 = IDL.Record({
    'token_standard' : IDL.Opt(TokenStandard),
    'address' : IDL.Principal,
    'network_fee' : IDL.Opt(IDL.Nat),
  });
  const AddressType = IDL.Variant({
    'Link' : IDL.Null,
    'User' : IDL.Null,
    'Treasury' : IDL.Null,
    'Creator' : IDL.Null,
  });
  const IntentType_1 = IDL.Variant({ 'Send' : IDL.Null, 'Receive' : IDL.Null });
  const Intent = IDL.Record({
    'id' : IDL.Text,
    'action_id' : IDL.Opt(IDL.Text),
    'user_fee' : IDL.Opt(IDL.Nat),
    'total_amount' : IDL.Opt(IDL.Nat),
    'asset' : Asset_1,
    'dest_address_type' : AddressType,
    'dest_address' : IDL.Principal,
    'source_address' : IDL.Principal,
    'intent_state' : IntentState_1,
    'source_address_type' : AddressType,
    'dependencies' : IDL.Opt(IDL.Vec(IDL.Text)),
    'amount' : IDL.Nat,
    'network_fee' : IDL.Opt(IDL.Nat),
    'intent_type' : IntentType_1,
  });
  const Action = IDL.Record({
    'id' : IDL.Text,
    'creator' : IDL.Principal,
    'intents' : IDL.Vec(Intent),
    'link_id' : IDL.Opt(IDL.Text),
    'action_type' : ActionType_1,
    'action_state' : IntentState_1,
    'creator_address_type' : AddressType,
    'intent_ids' : IDL.Opt(IDL.Vec(IDL.Text)),
  });
  const AssetInfo = IDL.Record({
    'asset' : Asset_1,
    'label' : IDL.Text,
    'available_amount' : IDL.Opt(IDL.Nat),
    'amount' : IDL.Nat,
  });
  const LinkState_1 = IDL.Variant({
    'Ended' : IDL.Null,
    'Preview' : IDL.Null,
    'ChooseType' : IDL.Null,
    'Inactive' : IDL.Null,
    'Active' : IDL.Null,
    'AddAsset' : IDL.Null,
    'Created' : IDL.Null,
  });
  const Link = IDL.Record({
    'id' : IDL.Text,
    'title' : IDL.Text,
    'creator' : IDL.Principal,
    'asset_info' : IDL.Vec(AssetInfo),
    'link_state' : LinkState_1,
    'link_type' : LinkType_1,
    'created_at' : IDL.Opt(IDL.Nat64),
    'use_count' : IDL.Nat64,
    'max_use' : IDL.Nat64,
  });
  const GetLinkResponseV3 = IDL.Record({
    'action' : IDL.Opt(Action),
    'link_user_state' : IDL.Opt(LinkUserState),
    'link' : Link,
    'icrc112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
  });
  const Result_3 = IDL.Variant({
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
  const Result_4 = IDL.Variant({
    'Ok' : Icrc21ConsentInfo,
    'Err' : Icrc21Error,
  });
  const Icrc28TrustedOriginsResponse = IDL.Record({
    'trusted_origins' : IDL.Vec(IDL.Text),
  });
  const CreateActionInput = IDL.Record({
    'link_id' : IDL.Text,
    'action_type' : ActionType_1,
  });
  const Result_5 = IDL.Variant({ 'Ok' : ActionDto, 'Err' : CanisterError });
  const CreateActionInputV3 = IDL.Record({
    'action' : Action,
    'link_id' : IDL.Text,
  });
  const CreateActionResponseV3 = IDL.Record({
    'action' : Action,
    'link' : Link,
    'icrc112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
  });
  const Result_6 = IDL.Variant({
    'Ok' : CreateActionResponseV3,
    'Err' : CanisterError,
  });
  const CreateLinkInput = IDL.Record({
    'title' : IDL.Text,
    'asset_info' : IDL.Vec(AssetInfoDto),
    'link_type' : LinkType_1,
    'link_use_action_max_count' : IDL.Nat64,
  });
  const CreateLinkDto = IDL.Record({ 'action' : ActionDto, 'link' : LinkDto });
  const Result_7 = IDL.Variant({ 'Ok' : CreateLinkDto, 'Err' : CanisterError });
  const CreateLinkInputV3 = IDL.Record({
    'title' : IDL.Text,
    'action' : Action,
    'link_type' : LinkType_1,
    'max_use' : IDL.Nat64,
  });
  const CreateLinkResponseV3 = IDL.Record({
    'action' : Action,
    'link' : Link,
    'icrc112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
  });
  const Result_8 = IDL.Variant({
    'Ok' : CreateLinkResponseV3,
    'Err' : CanisterError,
  });
  const Result_9 = IDL.Variant({ 'Ok' : LinkDto, 'Err' : CanisterError });
  const DisableLinkResponseV3 = IDL.Record({ 'link' : Link });
  const Result_10 = IDL.Variant({
    'Ok' : DisableLinkResponseV3,
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
    'data' : IDL.Vec(LinkDto),
  });
  const Result_11 = IDL.Variant({
    'Ok' : PaginateResult,
    'Err' : CanisterError,
  });
  const PaginateResult_1 = IDL.Record({
    'metadata' : PaginateResultMetadata,
    'data' : IDL.Vec(Link),
  });
  const Result_12 = IDL.Variant({
    'Ok' : PaginateResult_1,
    'Err' : CanisterError,
  });
  const ProcessActionV2Input = IDL.Record({ 'action_id' : IDL.Text });
  const ProcessActionDto = IDL.Record({
    'action' : ActionDto,
    'link' : LinkDto,
    'errors' : IDL.Vec(IDL.Text),
    'is_success' : IDL.Bool,
  });
  const Result_13 = IDL.Variant({
    'Ok' : ProcessActionDto,
    'Err' : CanisterError,
  });
  const ProcessActionResponseV3 = IDL.Record({
    'action' : Action,
    'link' : Link,
    'errors' : IDL.Vec(IDL.Text),
    'is_success' : IDL.Bool,
    'icrc112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
  });
  const Result_14 = IDL.Variant({
    'Ok' : ProcessActionResponseV3,
    'Err' : CanisterError,
  });
  return IDL.Service({
    'admin_fee_cache_clear' : IDL.Func([], [Result], []),
    'admin_fee_cache_clear_token' : IDL.Func([IDL.Principal], [Result], []),
    'admin_flush_token_standard_cache' : IDL.Func([], [Result], []),
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
    'get_canister_build_data' : IDL.Func([], [BuildData], ['query']),
    'get_link_details_v2' : IDL.Func(
        [IDL.Text, IDL.Opt(GetLinkOptions)],
        [Result_2],
        ['query'],
      ),
    'get_link_details_v3' : IDL.Func(
        [IDL.Text, IDL.Opt(GetLinkOptions)],
        [Result_3],
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
        [Result_4],
        [],
      ),
    'icrc28_trusted_origins' : IDL.Func([], [Icrc28TrustedOriginsResponse], []),
    'is_inspect_message_enabled' : IDL.Func([], [IDL.Bool], ['query']),
    'user_create_action_v2' : IDL.Func([CreateActionInput], [Result_5], []),
    'user_create_action_v3' : IDL.Func([CreateActionInputV3], [Result_6], []),
    'user_create_link_v2' : IDL.Func([CreateLinkInput], [Result_7], []),
    'user_create_link_v3' : IDL.Func([CreateLinkInputV3], [Result_8], []),
    'user_disable_link_v2' : IDL.Func([IDL.Text], [Result_9], []),
    'user_disable_link_v3' : IDL.Func([IDL.Text], [Result_10], []),
    'user_get_links_v2' : IDL.Func(
        [IDL.Opt(PaginateInput)],
        [Result_11],
        ['query'],
      ),
    'user_get_links_v3' : IDL.Func(
        [IDL.Opt(PaginateInput)],
        [Result_12],
        ['query'],
      ),
    'user_process_action_v2' : IDL.Func(
        [ProcessActionV2Input],
        [Result_13],
        [],
      ),
    'user_process_action_v3' : IDL.Func(
        [ProcessActionV2Input],
        [Result_14],
        [],
      ),
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
    'token_storage_canister_id' : IDL.Principal,
    'log_settings' : IDL.Opt(LogServiceSettings),
    'token_standard_cache_ttl_ns' : IDL.Opt(IDL.Nat64),
  });
  return [CashierBackendInitData];
};
