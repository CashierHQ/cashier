import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import SignerService from "../signerService/signer.service";
import { Icrc112Requests, Icrc112Response, ICRC112Service } from "../signerService/icrc112.service";
import { callCanisterService } from "../signerService/callCanister.service";

jest.mock("@dfinity/agent");
jest.mock("./icrc112.service");
jest.mock("./callCanister.service");

describe("SignerService", () => {
    let signerService: SignerService;
    let mockIdentity: Identity | PartialIdentity;
    let mockIcrc112Service: jest.Mocked<ICRC112Service>;

    beforeEach(() => {
        mockIdentity = {} as Identity;
        signerService = new SignerService(mockIdentity);
        mockIcrc112Service = new ICRC112Service({
            agent: signerService["agent"],
            callCanisterService,
        }) as jest.Mocked<ICRC112Service>;
    });

    it("should create an instance of SignerService", () => {
        expect(signerService).toBeInstanceOf(SignerService);
    });

    it("should initialize HttpAgent with the provided identity", () => {
        expect(HttpAgent.createSync).toHaveBeenCalledWith({
            identity: mockIdentity,
            host: "https://icp0.io",
        });
    });

    it("should call icrc112Execute with the correct input", async () => {
        const input: Icrc112Requests = {
            /* mock input */
        };
        const expectedResponse: Icrc112Response = {
            /* mock response */
        };
        mockIcrc112Service.icrc112Execute.mockResolvedValue(expectedResponse);

        const response = await signerService.callIcrc112(input);

        expect(mockIcrc112Service.icrc112Execute).toHaveBeenCalledWith(input);
        expect(response).toEqual(expectedResponse);
    });
});
