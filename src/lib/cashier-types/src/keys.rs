pub type UserKey = String;

pub type UserWalletKey = String;

pub type LinkKey = String;

pub type ActionKey = String;

pub type ActionType = String;

pub type IntentKey = String;

pub type TransactionKey = String;

pub type UserLinkKey = (UserKey, LinkKey);

pub type UserActionKey = (UserKey, ActionKey);

pub type LinkActionKey = (LinkKey, ActionKey);

pub type ActionIntentKey = (ActionKey, ActionType, IntentKey);

pub type IntentTransactionKey = (TransactionKey, IntentKey);
