export const idlFactory = ({ IDL }) => {
  const GetEtchingResult = IDL.Record({
    'confirmations' : IDL.Nat32,
    'rune_id' : IDL.Text,
  });
  const Terms = IDL.Record({
    'cap' : IDL.Opt(IDL.Nat),
    'height' : IDL.Tuple(IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)),
    'offset' : IDL.Tuple(IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)),
    'amount' : IDL.Opt(IDL.Nat),
  });
  const RuneEntry = IDL.Record({
    'confirmations' : IDL.Nat32,
    'mints' : IDL.Nat,
    'terms' : IDL.Opt(Terms),
    'etching' : IDL.Text,
    'turbo' : IDL.Bool,
    'premine' : IDL.Nat,
    'divisibility' : IDL.Nat8,
    'spaced_rune' : IDL.Text,
    'number' : IDL.Nat64,
    'timestamp' : IDL.Nat64,
    'block' : IDL.Nat64,
    'burned' : IDL.Nat,
    'rune_id' : IDL.Text,
    'symbol' : IDL.Opt(IDL.Text),
  });
  const RuneBalance = IDL.Record({
    'confirmations' : IDL.Nat32,
    'divisibility' : IDL.Nat8,
    'amount' : IDL.Nat,
    'rune_id' : IDL.Text,
    'symbol' : IDL.Opt(IDL.Text),
  });
  const Error = IDL.Variant({ 'MaxOutpointsExceeded' : IDL.Null });
  const Result = IDL.Variant({
    'Ok' : IDL.Vec(IDL.Opt(IDL.Vec(RuneBalance))),
    'Err' : Error,
  });
  return IDL.Service({
    'get_etching' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(GetEtchingResult)],
        ['query'],
      ),
    'get_latest_block' : IDL.Func([], [IDL.Nat32, IDL.Text], ['query']),
    'get_rune' : IDL.Func([IDL.Text], [IDL.Opt(RuneEntry)], ['query']),
    'get_rune_balances_for_outputs' : IDL.Func(
        [IDL.Vec(IDL.Text)],
        [Result],
        ['query'],
      ),
    'get_rune_by_id' : IDL.Func([IDL.Text], [IDL.Opt(RuneEntry)], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };