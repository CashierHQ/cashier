import { Identity } from "@dfinity/agent";
import { AccountDelegationWallet } from "./AccountDelegationWallet";
import { RelyingPartyWallet } from "./RelyingPartyWallet";
import { Wallet } from "./Wallet";

type WalletCreationOptions = {
    identity?: Identity;
};

export abstract class WalletFactory {
    public static create(options: WalletCreationOptions): Wallet {
        const isRelyingPartyWallet = true;

        return isRelyingPartyWallet
            ? new RelyingPartyWallet(options.identity!)
            : new AccountDelegationWallet();
    }
}
