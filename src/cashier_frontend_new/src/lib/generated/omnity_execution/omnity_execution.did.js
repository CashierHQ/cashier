export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ Ok: IDL.Null, Err: IDL.Text });
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const IcpChainKeyToken = IDL.Variant({ CKBTC: IDL.Null });
  const TxAction = IDL.Variant({
    Burn: IDL.Null,
    Redeem: IDL.Null,
    Mint: IDL.Null,
    RedeemIcpChainKeyAssets: IcpChainKeyToken,
    Merge: IDL.Vec(IDL.Text),
    Transfer: IDL.Null,
  });
  const GenerateTicketReq = IDL.Record({
    action: TxAction,
    token_id: IDL.Text,
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    target_chain_id: IDL.Text,
    amount: IDL.Nat,
    receiver: IDL.Text,
  });
  const GenerateTicketOk = IDL.Record({ ticket_id: IDL.Text });
  const GenerateTicketError = IDL.Variant({
    InsufficientRedeemFee: IDL.Record({
      provided: IDL.Nat64,
      required: IDL.Nat64,
    }),
    SendTicketErr: IDL.Text,
    TemporarilyUnavailable: IDL.Text,
    TokenNotFound: IDL.Text,
    InsufficientAllowance: IDL.Record({ allowance: IDL.Nat64 }),
    TransferFailure: IDL.Text,
    UnsupportedAction: IDL.Text,
    RedeemFeeNotSet: IDL.Null,
    InvalidTicketAmount: IDL.Nat,
    InvalidTicketReceiver: IDL.Record({
      receiver: IDL.Text,
      reason: IDL.Text,
    }),
    UnsupportedChainId: IDL.Text,
    UnsupportedToken: IDL.Text,
    InsufficientFunds: IDL.Record({
      balance: IDL.Nat,
      ledger_id: IDL.Principal,
    }),
  });
  const Result_1 = IDL.Variant({
    Ok: GenerateTicketOk,
    Err: GenerateTicketError,
  });
  const ChainState = IDL.Variant({
    Active: IDL.Null,
    Deactive: IDL.Null,
  });
  const ChainType = IDL.Variant({
    SettlementChain: IDL.Null,
    ExecutionChain: IDL.Null,
  });
  const Chain = IDL.Record({
    fee_token: IDL.Opt(IDL.Text),
    canister_id: IDL.Text,
    chain_id: IDL.Text,
    counterparties: IDL.Opt(IDL.Vec(IDL.Text)),
    chain_state: ChainState,
    chain_type: ChainType,
    contract_address: IDL.Opt(IDL.Text),
  });
  const Token = IDL.Record({
    decimals: IDL.Nat8,
    token_id: IDL.Text,
    metadata: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    icon: IDL.Opt(IDL.Text),
    name: IDL.Text,
    symbol: IDL.Text,
  });
  const TicketType = IDL.Variant({
    Resubmit: IDL.Null,
    Normal: IDL.Null,
  });
  const Ticket = IDL.Record({
    token: IDL.Text,
    action: TxAction,
    dst_chain: IDL.Text,
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    ticket_id: IDL.Text,
    sender: IDL.Opt(IDL.Text),
    ticket_time: IDL.Nat64,
    ticket_type: TicketType,
    src_chain: IDL.Text,
    amount: IDL.Text,
    receiver: IDL.Text,
  });
  const RouteState = IDL.Record({
    hub_principal: IDL.Principal,
    is_timer_running: IDL.Bool,
    next_directive_seq: IDL.Nat64,
    finalized_mint_token_requests: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64)),
    token_ledgers: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Principal)),
    chain_id: IDL.Text,
    tokens: IDL.Vec(IDL.Tuple(IDL.Text, Token)),
    target_chain_factor: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat)),
    counterparties: IDL.Vec(IDL.Tuple(IDL.Text, Chain)),
    next_ticket_seq: IDL.Nat64,
    chain_state: ChainState,
    failed_tickets: IDL.Vec(Ticket),
    fee_token_factor: IDL.Opt(IDL.Nat),
  });
  const TokenResp = IDL.Record({
    principal: IDL.Opt(IDL.Principal),
    decimals: IDL.Nat8,
    token_id: IDL.Text,
    icon: IDL.Opt(IDL.Text),
    rune_id: IDL.Opt(IDL.Text),
    symbol: IDL.Text,
  });
  const ConsentMessageMetadata = IDL.Record({
    utc_offset_minutes: IDL.Opt(IDL.Int16),
    language: IDL.Text,
  });
  const DisplayMessageType = IDL.Variant({
    GenericDisplay: IDL.Null,
    LineDisplay: IDL.Record({
      characters_per_line: IDL.Nat16,
      lines_per_page: IDL.Nat16,
    }),
  });
  const ConsentMessageSpec = IDL.Record({
    metadata: ConsentMessageMetadata,
    device_spec: IDL.Opt(DisplayMessageType),
  });
  const ConsentMessageRequest = IDL.Record({
    arg: IDL.Vec(IDL.Nat8),
    method: IDL.Text,
    user_preferences: ConsentMessageSpec,
  });
  const LineDisplayPage = IDL.Record({ lines: IDL.Vec(IDL.Text) });
  const ConsentMessage = IDL.Variant({
    LineDisplayMessage: IDL.Record({ pages: IDL.Vec(LineDisplayPage) }),
    GenericDisplayMessage: IDL.Text,
  });
  const ConsentInfo = IDL.Record({
    metadata: ConsentMessageMetadata,
    consent_message: ConsentMessage,
  });
  const ErrorInfo = IDL.Record({ description: IDL.Text });
  const Result_2 = IDL.Variant({ Ok: ConsentInfo, Err: ErrorInfo });
  const MintTokenStatus = IDL.Variant({
    Finalized: IDL.Record({ block_index: IDL.Nat64 }),
    Unknown: IDL.Null,
  });
  const MetadataValue = IDL.Variant({
    Int: IDL.Int,
    Nat: IDL.Nat,
    Blob: IDL.Vec(IDL.Nat8),
    Text: IDL.Text,
  });
  const ChangeFeeCollector = IDL.Variant({
    SetTo: Account,
    Unset: IDL.Null,
  });
  const FeatureFlags = IDL.Record({ icrc2: IDL.Bool });
  const UpgradeArgs = IDL.Record({
    token_symbol: IDL.Opt(IDL.Text),
    transfer_fee: IDL.Opt(IDL.Nat),
    metadata: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, MetadataValue))),
    maximum_number_of_accounts: IDL.Opt(IDL.Nat64),
    accounts_overflow_trim_quantity: IDL.Opt(IDL.Nat64),
    change_fee_collector: IDL.Opt(ChangeFeeCollector),
    max_memo_length: IDL.Opt(IDL.Nat16),
    token_name: IDL.Opt(IDL.Text),
    feature_flags: IDL.Opt(FeatureFlags),
  });
  return IDL.Service({
    add_controller: IDL.Func([IDL.Principal, IDL.Principal], [Result], []),
    collect_ledger_fee: IDL.Func(
      [IDL.Principal, IDL.Opt(IDL.Nat), Account],
      [Result],
      [],
    ),
    generate_ticket: IDL.Func([GenerateTicketReq], [Result_1], []),
    generate_ticket_v2: IDL.Func([GenerateTicketReq], [Result_1], []),
    get_chain_list: IDL.Func([], [IDL.Vec(Chain)], ["query"]),
    get_fee_account: IDL.Func(
      [IDL.Opt(IDL.Principal)],
      [IDL.Vec(IDL.Nat8)],
      ["query"],
    ),
    get_readable_fee_account: IDL.Func(
      [IDL.Opt(IDL.Principal)],
      [IDL.Text],
      ["query"],
    ),
    get_redeem_fee: IDL.Func([IDL.Text], [IDL.Opt(IDL.Nat64)], ["query"]),
    get_route_state: IDL.Func([], [RouteState], ["query"]),
    get_token_ledger: IDL.Func([IDL.Text], [IDL.Opt(IDL.Principal)], ["query"]),
    get_token_list: IDL.Func([], [IDL.Vec(TokenResp)], ["query"]),
    icrc21_canister_call_consent_message: IDL.Func(
      [ConsentMessageRequest],
      [Result_2],
      [],
    ),
    mint_token_status: IDL.Func([IDL.Text], [MintTokenStatus], ["query"]),
    query_failed_tickets: IDL.Func([], [IDL.Vec(Ticket)], ["query"]),
    remove_controller: IDL.Func([IDL.Principal, IDL.Principal], [Result], []),
    resend_ticket: IDL.Func([IDL.Text], [Result], []),
    set_next_directive_seq: IDL.Func([IDL.Nat64], [], []),
    update_icrc_ledger: IDL.Func([IDL.Principal, UpgradeArgs], [Result], []),
  });
};
export const init = ({ IDL }) => {
  return [];
};
