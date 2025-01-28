pub type UserKey = String;

pub type UserWalletKey = String;

pub type LinkKey = String;

pub type ActionKey = String;

pub type ActionTypeKey = String;

pub type IntentKey = String;

pub type TransactionKey = String;

pub type UserLinkKey = (UserKey, LinkKey);

pub type UserActionKey = (UserKey, ActionKey);

pub type LinkActionKey = (LinkKey, ActionTypeKey, ActionKey);

pub type ActionIntentKey = (ActionKey, IntentKey);

pub type IntentTransactionKey = (TransactionKey, IntentKey);
