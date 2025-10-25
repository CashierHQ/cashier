export const idlFactory = ({ IDL }) => {
  const CanisterError = IDL.Rec();
  const LogServiceSettings = IDL.Record({
    'log_filter' : IDL.Opt(IDL.Text),
    'in_memory_records' : IDL.Opt(IDL.Nat64),
    'enable_console' : IDL.Opt(IDL.Bool),
    'max_record_length' : IDL.Opt(IDL.Nat64),
  });
  const CashierBackendInitData = IDL.Record({
    'owner' : IDL.Principal,
    'log_settings' : IDL.Opt(LogServiceSettings),
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
  const ActionType = IDL.Variant({
    'Use' : IDL.Null,
    'Withdraw' : IDL.Null,
    'Send' : IDL.Null,
    'CreateLink' : IDL.Null,
    'Receive' : IDL.Null,
  });
  const CreateActionInput = IDL.Record({
    'link_id' : IDL.Text,
    'action_type' : ActionType,
  });
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
  const IntentState = IDL.Variant({
    'Fail' : IDL.Null,
    'Success' : IDL.Null,
    'Processing' : IDL.Null,
    'Created' : IDL.Null,
  });
  const Icrc2Approve = IDL.Record({
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
    'state' : IntentState,
    'dependency' : IDL.Opt(IDL.Vec(IDL.Text)),
    'group' : IDL.Nat16,
  });
  const IntentDto = IDL.Record({
    'id' : IDL.Text,
    'chain' : Chain,
    'task' : IntentTask,
    'type' : IntentType,
    'created_at' : IDL.Nat64,
    'state' : IntentState,
    'transactions' : IDL.Vec(TransactionDto),
  });
  const ActionDto = IDL.Record({
    'id' : IDL.Text,
    'icrc_112_requests' : IDL.Opt(IDL.Vec(IDL.Vec(Icrc112Request))),
    'creator' : IDL.Principal,
    'intents' : IDL.Vec(IntentDto),
    'type' : ActionType,
    'state' : IntentState,
  });
  const Result_2 = IDL.Variant({ 'Ok' : ActionDto, 'Err' : CanisterError });
  const CreateActionAnonymousInput = IDL.Record({
    'link_id' : IDL.Text,
    'action_type' : ActionType,
    'wallet_address' : IDL.Principal,
  });
  const AssetInfoDto = IDL.Record({
    'asset' : Asset,
    'amount_per_link_use_action' : IDL.Nat64,
    'label' : IDL.Text,
  });
  const LinkType = IDL.Variant({
    'SendAirdrop' : IDL.Null,
    'SendTip' : IDL.Null,
    'ReceivePayment' : IDL.Null,
    'SendTokenBasket' : IDL.Null,
  });
  const CreateLinkInput = IDL.Record({
    'title' : IDL.Text,
    'asset_info' : IDL.Vec(AssetInfoDto),
    'link_type' : LinkType,
    'link_use_action_max_count' : IDL.Nat64,
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
    'link_type' : LinkType,
    'create_at' : IDL.Nat64,
    'state' : LinkState,
    'link_use_action_max_count' : IDL.Nat64,
    'link_use_action_counter' : IDL.Nat64,
  });
  const Result_3 = IDL.Variant({ 'Ok' : LinkDto, 'Err' : CanisterError });
  const CreateLinkDto = IDL.Record({ 'action' : ActionDto, 'link' : LinkDto });
  const Result_4 = IDL.Variant({ 'Ok' : CreateLinkDto, 'Err' : CanisterError });
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
  const GetLinkOptions = IDL.Record({ 'action_type' : ActionType });
  const GetLinkResp = IDL.Record({
    'action' : IDL.Opt(ActionDto),
    'link' : LinkDto,
  });
  const Result_5 = IDL.Variant({ 'Ok' : GetLinkResp, 'Err' : IDL.Text });
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
  const Result_6 = IDL.Variant({ 'Ok' : PaginateResult, 'Err' : IDL.Text });
  const Result_7 = IDL.Variant({
    'Ok' : PaginateResult,
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
  const Result_8 = IDL.Variant({
    'Ok' : Icrc21ConsentInfo,
    'Err' : Icrc21Error,
  });
  const Icrc28TrustedOriginsResponse = IDL.Record({
    'trusted_origins' : IDL.Vec(IDL.Text),
  });
  const LinkGetUserStateInput = IDL.Record({
    'link_id' : IDL.Text,
    'action_type' : ActionType,
    'anonymous_wallet_address' : IDL.Opt(IDL.Principal),
  });
  const LinkUserState = IDL.Variant({
    'CompletedLink' : IDL.Null,
    'Address' : IDL.Null,
    'GateClosed' : IDL.Null,
    'GateOpened' : IDL.Null,
  });
  const LinkGetUserStateOutput = IDL.Record({
    'action' : ActionDto,
    'link_user_state' : LinkUserState,
  });
  const Result_9 = IDL.Variant({
    'Ok' : IDL.Opt(LinkGetUserStateOutput),
    'Err' : CanisterError,
  });
  const UserStateMachineGoto = IDL.Variant({
    'Continue' : IDL.Null,
    'Back' : IDL.Null,
  });
  const LinkUpdateUserStateInput = IDL.Record({
    'link_id' : IDL.Text,
    'action_type' : ActionType,
    'goto' : UserStateMachineGoto,
    'anonymous_wallet_address' : IDL.Opt(IDL.Principal),
  });
  const ProcessActionInput = IDL.Record({
    'action_id' : IDL.Text,
    'link_id' : IDL.Text,
    'action_type' : ActionType,
  });
  const ProcessActionAnonymousInput = IDL.Record({
    'action_id' : IDL.Text,
    'link_id' : IDL.Text,
    'action_type' : ActionType,
    'wallet_address' : IDL.Principal,
  });
  const ProcessActionV2Input = IDL.Record({ 'action_id' : IDL.Text });
  const TriggerTransactionInput = IDL.Record({
    'transaction_id' : IDL.Text,
    'action_id' : IDL.Text,
    'link_id' : IDL.Text,
  });
  const Result_10 = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : CanisterError });
  const UpdateActionInput = IDL.Record({
    'action_id' : IDL.Text,
    'link_id' : IDL.Text,
    'external' : IDL.Bool,
  });
  const UpdateLinkInput = IDL.Record({
    'id' : IDL.Text,
    'goto' : UserStateMachineGoto,
  });
  return IDL.Service({
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
    'create_action' : IDL.Func([CreateActionInput], [Result_2], []),
    'create_action_anonymous' : IDL.Func(
        [CreateActionAnonymousInput],
        [Result_2],
        [],
      ),
    'create_action_v2' : IDL.Func([CreateActionInput], [Result_2], []),
    'create_link' : IDL.Func([CreateLinkInput], [Result_3], []),
    'create_link_v2' : IDL.Func([CreateLinkInput], [Result_4], []),
    'disable_link_v2' : IDL.Func([IDL.Text], [Result_3], []),
    'get_canister_build_data' : IDL.Func([], [BuildData], ['query']),
    'get_link' : IDL.Func(
        [IDL.Text, IDL.Opt(GetLinkOptions)],
        [Result_5],
        ['query'],
      ),
    'get_links' : IDL.Func([IDL.Opt(PaginateInput)], [Result_6], ['query']),
    'get_links_v2' : IDL.Func([IDL.Opt(PaginateInput)], [Result_7], ['query']),
    'icrc10_supported_standards' : IDL.Func(
        [],
        [IDL.Vec(Icrc21SupportedStandard)],
        ['query'],
      ),
    'icrc114_validate' : IDL.Func([Icrc114ValidateArgs], [IDL.Bool], []),
    'icrc21_canister_call_consent_message' : IDL.Func(
        [Icrc21ConsentMessageRequest],
        [Result_8],
        [],
      ),
    'icrc28_trusted_origins' : IDL.Func([], [Icrc28TrustedOriginsResponse], []),
    'is_inspect_message_enabled' : IDL.Func([], [IDL.Bool], ['query']),
    'link_get_user_state' : IDL.Func([LinkGetUserStateInput], [Result_9], []),
    'link_update_user_state' : IDL.Func(
        [LinkUpdateUserStateInput],
        [Result_9],
        [],
      ),
    'process_action' : IDL.Func([ProcessActionInput], [Result_2], []),
    'process_action_anonymous' : IDL.Func(
        [ProcessActionAnonymousInput],
        [Result_2],
        [],
      ),
    'process_action_v2' : IDL.Func([ProcessActionV2Input], [Result_4], []),
    'trigger_transaction' : IDL.Func(
        [TriggerTransactionInput],
        [Result_10],
        [],
      ),
    'update_action' : IDL.Func([UpdateActionInput], [Result_2], []),
    'update_link' : IDL.Func([UpdateLinkInput], [Result_3], []),
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
    'owner' : IDL.Principal,
    'log_settings' : IDL.Opt(LogServiceSettings),
  });
  return [CashierBackendInitData];
};
