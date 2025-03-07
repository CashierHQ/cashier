import {
    Icrc112BatchCallCanistersRawResponse,
    Icrc25SupportedStandardsRawResponse,
    IcrcMethod,
} from "@/types/icrc-method";
import { Icrc112Requests, Icrc112Response } from "../signerService/icrc112.service";
import { IWallet } from "./IWallet";
import { Signer } from "@slide-computer/signer";

export class AccountDelegationWallet implements IWallet {
    private signer: Signer;

    constructor(signer: Signer) {
        this.signer = signer;
    }

    public async execute(input: Icrc112Requests): Promise<Icrc112Response> {
        const supportsIcrc112 = await this.checkWalletSupportsIcrc112();

        if (!supportsIcrc112) {
            throw new Error("Account Delegation Wallet does not support ICRC-112");
        }

        return this.executeBatchCall(input);
    }

    private async checkWalletSupportsIcrc112(): Promise<boolean> {
        try {
            // Execute an ICRC-25 RPC call to check if the wallet supports ICRC-112
            const rawResponse = await this.signer.sendRequest({
                id: "1",
                jsonrpc: "2.0",
                method: IcrcMethod.Icrc25SupportedStandards,
                params: {},
            });

            const response = rawResponse as Icrc25SupportedStandardsRawResponse;

            const supportedMethods = response.result.supportedStandards.map(
                (standard) => standard.name,
            );

            return supportedMethods.includes(IcrcMethod.Icrc112BatchCallCanisters);
        } catch (error) {
            console.error(`Failed to get supported standards`, error);

            return false;
        }
    }

    private async executeBatchCall(input: Icrc112Requests): Promise<Icrc112Response> {
        const response = await this.signer.sendRequest({
            id: "1",
            jsonrpc: "2.0",
            method: IcrcMethod.Icrc112BatchCallCanisters,
            params: input,
        });

        const castResponse = response as unknown as Icrc112BatchCallCanistersRawResponse;

        return castResponse.result.responses;
    }
}
