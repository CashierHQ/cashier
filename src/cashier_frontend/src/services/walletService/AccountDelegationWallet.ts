import { Icrc25SupportedStandardsResponse, IcrcMethod } from "@/types/icrc-method";
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
            const response = await this.executeIcrc25();

            const supportedMethods = response.result.supportedStandards.map(
                (standard) => standard.name,
            );

            return supportedMethods.includes(IcrcMethod.Icrc112BatchCallCanisters);
        } catch (error) {
            console.error(`Failed to get supported standards`, error);

            return false;
        }
    }

    private async executeIcrc25(): Promise<Icrc25SupportedStandardsResponse> {
        // Execute an ICRC-25 RPC call to check if the wallet supports ICRC-112
        // This is a placeholder implementation; adjust as needed
        const response = await this.signer.sendRequest({
            id: "1",
            jsonrpc: "2.0",
            method: IcrcMethod.Icrc25SupportedStandards,
            params: {},
        });

        return response as Icrc25SupportedStandardsResponse;
    }

    private async executeBatchCall(input: Icrc112Requests): Promise<Icrc112Response> {
        // Execute an ICRC-112 RPC call to execute batch transactions
        const signedRequests = input.requests.map((request) => {
            return this.signer.signMessage({
                message: JSON.stringify(request),
            });
        });

        const responses = await Promise.all(signedRequests);

        // Send the signed requests to the network and get responses
        // This is a placeholder implementation; adjust as needed
        const icrc112Response = await this.sendSignedRequests(responses);

        return icrc112Response;
    }

    private async sendSignedRequests(signedRequests: any[]): Promise<Icrc112Response> {
        // Send the signed requests to the network
        // This is a placeholder implementation; adjust as needed
        const responses = await Promise.all(
            signedRequests.map((request) => {
                return this.signer.send(request);
            }),
        );

        return { responses };
    }
}
