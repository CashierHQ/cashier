import { Agent } from "@dfinity/agent";
import { CallCanisterService } from "../signerService/callCanister.service";
import {
    ErrorResponse,
    Icrc112Requests,
    ICRC112Service,
    SuccessResponse,
} from "../signerService/icrc112.service";

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

    it("should execute icrc112 requests return success for all response", async () => {
        // Arrange
        const mockCanisterId = "123456789";
        const requests: Icrc112Requests = [
            [
                {
                    canisterId: mockCanisterId,
                    method: "icrc1_transfer",
                    arg: "abcxyz",
                },
                {
                    canisterId: mockCanisterId,
                    method: "icrc2_approve",
                    arg: "abcxyz",
                },
            ],
        ];

        const mockedResponseFromCallCanister = {
            contentMap: "contentMapResponse",
            certificate: "certificateResponse",
            reply: "replyResponse",
        };
        mockCall.mockResolvedValue(mockedResponseFromCallCanister);
        mockedGetPrincipal.mockReturnValue("mockedPrincipal");

        // Act
        const response = await service.icrc112Execute(requests);
        console.log(JSON.stringify(response));
        // Assert
        expect(mockedCallCanisterService.call).toHaveBeenCalled();
        expect(response.responses.length).toBe(1);
        expect(response.responses[0].length).toBe(2);
        expect(response.responses[0][0]).toHaveProperty("result");
        const errorResponse = response.responses[0][0] as SuccessResponse;
        expect(errorResponse.result.certificate).toEqual(
            mockedResponseFromCallCanister.certificate,
        );
    });

    it("should execute icrc112 requests return fail for all response", async () => {
        // Arrange
        const mockCanisterId = "123456789";
        const requests: Icrc112Requests = [
            [
                {
                    canisterId: mockCanisterId,
                    method: "icrc1_transfer",
                    arg: "abcxyz",
                },
                {
                    canisterId: mockCanisterId,
                    method: "icrc2_approve",
                    arg: "abcxyz",
                },
            ],
        ];

        const mockErrorMessage = "Error from canister";
        mockCall.mockRejectedValue(new Error(mockErrorMessage));
        mockedGetPrincipal.mockReturnValue(mockErrorMessage);

        // Act
        const response = await service.icrc112Execute(requests);
        console.log(JSON.stringify(response.responses[0]));
        // Assert
        expect(mockedCallCanisterService.call).toHaveBeenCalled();
        expect(response.responses.length).toBe(1);
        expect(response.responses[0].length).toBe(2);
        expect(response.responses[0][0]).toHaveProperty("error");
        const errorResponse = response.responses[0][0] as ErrorResponse;
        expect(errorResponse.error.message).toEqual(mockErrorMessage);
    });

    it("should execute icrc112 requests with one return success and one return fail response", async () => {
        // Arrange
        const mockCanisterId = "123456789";
        const requests: Icrc112Requests = [
            [
                {
                    canisterId: mockCanisterId,
                    method: "icrc1_transfer",
                    arg: "abcxyz",
                },
                {
                    canisterId: mockCanisterId,
                    method: "icrc2_approve",
                    arg: "abcxyz",
                },
            ],
        ];

        const mockedSuccessResponse = {
            contentMap: "contentMapResponse",
            certificate: "certificateResponse",
            reply: "replyResponse",
        };
        const mockErrorMessage = "Error from canister";

        mockCall
            .mockResolvedValueOnce(mockedSuccessResponse)
            .mockRejectedValueOnce(new Error(mockErrorMessage));
        mockedGetPrincipal.mockReturnValue("mockedPrincipal");

        // Act
        const response = await service.icrc112Execute(requests);
        console.log(JSON.stringify(response.responses[0]));
        // Assert
        expect(mockedCallCanisterService.call).toHaveBeenCalled();
        expect(response.responses.length).toBe(1);
        expect(response.responses[0].length).toBe(2);

        expect(response.responses[0][0]).toHaveProperty("result");
        const successResponse = response.responses[0][0] as SuccessResponse;
        expect(successResponse.result.certificate).toEqual(mockedSuccessResponse.certificate);

        expect(response.responses[0][1]).toHaveProperty("error");
        const errorResponse = response.responses[0][1] as ErrorResponse;
        expect(errorResponse.error.message).toEqual(mockErrorMessage);
    });
});
