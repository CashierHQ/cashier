import { Icrc112Requests, Icrc112Response } from "../signerService/icrc112.service";
import { Wallet } from "./Wallet";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Icrc25Response = {};

export class AccountDelegationWallet extends Wallet {
    public async execute(input: Icrc112Requests): Promise<Icrc112Response> {
        const supportsIcrc112 = this.checkWalletSupportsIcrc112();

        if (!supportsIcrc112) {
            throw new Error("Account Delegation Wallet does not support ICRC-112");
        }

        return this.executeIcrc112(input);
    }

    private async checkWalletSupportsIcrc112(): Promise<boolean> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const response = this.executeIcrc25();

        return true;
    }

    private async executeIcrc25(): Promise<Icrc25Response> {
        // TODO: execute ICRC-25 RPC call to test if wallet supports ICRC-112
        // https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_25_signer_interaction_standard.md#icrc25_supported_standards
        return Promise.resolve<Icrc25Response>({});
    }

    private executeTransactions(input: Icrc112Requests): Promise<Icrc112Response> {
        return this.executeIcrc112(input);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async executeIcrc112(input: Icrc112Requests): Promise<Icrc112Response> {
        // TODO: execute ICRC-112 RPC call to execute batch tsx
        // https://github.com/dfinity/wg-identity-authentication/blob/2ff9833f6b35a42e2feec2319e7d1ea0972847a4/topics/icrc_112_batch_canister_call.md
        return Promise.resolve<Icrc112Response>({ responses: [] });
    }
}
