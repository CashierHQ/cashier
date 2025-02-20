import { Agent } from "@dfinity/agent";
import { CallCanisterService } from "../../cashier_frontend/src/services/signerService/callCanister.service";
import { ICRC112Service } from "../../cashier_frontend/src/services/signerService/icrc112.service";

describe("ICRC-112 service", () => {
    const mockCall = jest.fn();
    const mockPoll = jest.fn();

    const mockedCallCanisterService = {
        call: mockCall,
        poll: mockPoll,
    } as unknown as CallCanisterService;

    const mockedGetPrincipal = jest.fn();
    const mockedAgent = {
        getPrincipal: mockedGetPrincipal,
    } as unknown as Agent;

    const service = new ICRC112Service({
        agent: mockedAgent,
        callCanisterService: mockedCallCanisterService,
    });

    it("should get method success", () => {
        const result = service.getMethod();
        expect(result).toBe("icrc_112_batch_call_canister");
    });

    it("should get method success", async () => {
        // Arrange
        const id = "123456789";
        const requests = [
            [
                {
                    canisterId: id,
                    method: "icrc1_transfer",
                    arg: "abcxyz",
                    nonce: new Uint32Array([Math.floor(Math.random() * 1000000)]),
                },
            ],
        ];

        const mockedResponse = {
            contentMap: "xcvbvc",
            certificate: "xiuhsai",
            reply: "xiuhsai",
        };
        mockCall.mockResolvedValue(mockedResponse);
        mockedGetPrincipal.mockReturnValue("mockedPrincipal");

        // Act
        const result = await service.icrc112Execute(requests);

        console.log(JSON.stringify(result, null, 2));

        // Assert
        expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(1);
    });
});
