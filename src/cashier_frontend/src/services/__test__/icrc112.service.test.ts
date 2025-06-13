// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Agent } from "@dfinity/agent";
import { CallCanisterService } from "../signerService/callCanister.service";
import {
    ErrorResponse,
    ICRC112Request,
    Icrc112Requests,
    ICRC112Service,
    SuccessResponse,
} from "../signerService/icrc112.service";
import { CallCanisterResponse } from "../types/callCanister.service.types";

const generateMockCallCanisterResponse = (requestNum: number): CallCanisterResponse => {
    return {
        certificate: "certificateResponse" + requestNum,
        contentMap: "contentMapResponse" + requestNum,
        reply: new TextEncoder().encode("replyResponse" + requestNum).buffer,
    };
};

const generateMockICRC112Request = (
    requestNum: number,
    methodName: string,
    mockResponseState: string,
): ICRC112Request => {
    return {
        canisterId: "testCanisterId",
        method: methodName,
        arg: `request${requestNum}_${mockResponseState}`,
        nonce: `nonce${requestNum}`,
    };
};

describe("ICRC-112 service", () => {
    let mockCall: jest.Mock;
    let mockPoll: jest.Mock;
    let mockedCallCanisterService: CallCanisterService;
    let mockedGetPrincipal: jest.Mock;
    let mockedAgent: Agent;
    let service: ICRC112Service;

    const nonExecuteErrorMessage = "Not processed due to batch request failure";

    beforeEach(() => {
        mockCall = jest.fn();
        mockPoll = jest.fn();

        mockedCallCanisterService = {
            call: mockCall,
            poll: mockPoll,
        } as unknown as CallCanisterService;

        mockedGetPrincipal = jest.fn();
        mockedAgent = {
            getPrincipal: mockedGetPrincipal,
        } as unknown as Agent;

        service = new ICRC112Service({
            agent: mockedAgent,
            callCanisterService: mockedCallCanisterService,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should get method success", () => {
        const result = service.getMethod();
        expect(result).toBe("icrc112_batch_call_canister");
    });

    it("should execute icrc112 requests return success for all response", async () => {
        // Arrange
        const mockRequest1 = generateMockICRC112Request(1, "icrc1_transfer", "success");
        const mockRequest2 = generateMockICRC112Request(2, "icrc2_approve", "success");
        const mockResponseCallCanister1: CallCanisterResponse = {
            contentMap: "contentMapResponse1",
            certificate: "certificateResponse1",
            reply: new TextEncoder().encode("replyResponse1").buffer,
        };

        const mockResponseCallCanister2: CallCanisterResponse = {
            contentMap: "contentMapResponse2",
            certificate: "certificateResponse2",
            reply: new TextEncoder().encode("replyResponse2").buffer,
        };

        const requests: Icrc112Requests = [[mockRequest1, mockRequest2]];

        mockCall
            .mockResolvedValueOnce(mockResponseCallCanister1)
            .mockResolvedValueOnce(mockResponseCallCanister2);
        mockedGetPrincipal.mockReturnValue("mockedPrincipal");

        // Act
        const response = await service.icrc112Execute(requests);
        const successResponse1 = response.responses[0][0] as SuccessResponse;
        const successResponse2 = response.responses[0][1] as SuccessResponse;
        // Assert
        expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(2);
        expect(response.responses.length).toBe(1);
        expect(response.responses[0].length).toBe(2);

        expect(response.responses[0][0]).toHaveProperty("result");
        expect(response.responses[0][1]).toHaveProperty("result");

        expect(successResponse1.result.certificate).toEqual(mockResponseCallCanister1.certificate);
        expect(successResponse2.result.contentMap).toEqual(mockResponseCallCanister2.contentMap);
    });

    it("should execute icrc112 requests return fail for all response", async () => {
        // Arrange
        const mockRequest1 = generateMockICRC112Request(1, "icrc1_transfer", "fail");
        const mockRequest2 = generateMockICRC112Request(2, "icrc2_approve", "fail");
        const requests: Icrc112Requests = [[mockRequest1, mockRequest2]];

        const mockErrorMessage1 = "Error from request 1";
        const mockErrorMessage2 = "Error from request 2";
        mockCall
            .mockRejectedValueOnce(new Error(mockErrorMessage1))
            .mockRejectedValueOnce(new Error(mockErrorMessage2));
        mockedGetPrincipal.mockReturnValue("mockedPrincipal");

        // Act
        const response = await service.icrc112Execute(requests);
        const errorResponse1 = response.responses[0][0] as ErrorResponse;
        const errorResponse2 = response.responses[0][1] as ErrorResponse;

        // Assert
        expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(2);
        expect(response.responses.length).toBe(1);
        expect(response.responses[0].length).toBe(2);

        expect(response.responses[0][0]).toHaveProperty("error");
        expect(response.responses[0][1]).toHaveProperty("error");

        expect(errorResponse1.error.message).toEqual(mockErrorMessage1);
        expect(errorResponse2.error.message).toEqual(mockErrorMessage2);

        expect(errorResponse1.error.code).toEqual(1000);
        expect(errorResponse2.error.code).toEqual(1000);
    });

    it("should execute icrc112 requests with one return success and one return fail response", async () => {
        // Arrange
        const requests: Icrc112Requests = [
            [
                generateMockICRC112Request(1, "icrc1_transfer", "success"),
                generateMockICRC112Request(2, "icrc2_approve", "fail"),
            ],
        ];

        const mockedSuccessResponse = generateMockCallCanisterResponse(1);
        const mockErrorMessage = "Error from canister";

        mockCall
            .mockResolvedValueOnce(mockedSuccessResponse)
            .mockRejectedValueOnce(new Error(mockErrorMessage));
        mockedGetPrincipal.mockReturnValue("mockedPrincipal");

        // Act
        const response = await service.icrc112Execute(requests);

        const successResponse1 = response.responses[0][0] as SuccessResponse;
        const errorResponse2 = response.responses[0][1] as ErrorResponse;

        // Assert
        expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(2);
        expect(response.responses.length).toBe(1);
        expect(response.responses[0].length).toBe(2);

        expect(successResponse1).toHaveProperty("result");
        expect(successResponse1.result.certificate).toEqual(mockedSuccessResponse.certificate);

        expect(errorResponse2).toHaveProperty("error");
        expect(errorResponse2.error.message).toEqual(mockErrorMessage);
        expect(errorResponse2.error.code).toEqual(1000);
    });

    describe("execute icrc112 requests with 1001 non execute error response", () => {
        it("execute icrc112 requests with 2 sub-arrays which one request in a row return error and then rest of non-execute request will have 1001 error", async () => {
            // Arrange
            const mockRequest1: ICRC112Request = generateMockICRC112Request(
                1,
                "icrc1_transfer",
                "success",
            );
            const mockRequest2: ICRC112Request = generateMockICRC112Request(
                2,
                "icrc2_approve",
                "fail",
            );
            const mockRequest3: ICRC112Request = generateMockICRC112Request(
                3,
                "icrc7_transfer",
                "nonExecute",
            );

            const requests: Icrc112Requests = [[mockRequest1, mockRequest2], [mockRequest3]];

            const mockedSuccessResponse1 = generateMockCallCanisterResponse(1);
            const mockErrorMessage2 = "Error from request 2";

            mockCall
                .mockResolvedValueOnce(mockedSuccessResponse1)
                .mockRejectedValueOnce(new Error(mockErrorMessage2));
            mockedGetPrincipal.mockReturnValue("mockedPrincipal");

            // Act
            const response = await service.icrc112Execute(requests);

            const successResponse1 = response.responses[0][0] as SuccessResponse;
            const errorResponse2 = response.responses[0][1] as ErrorResponse;
            const nonExecuteResponse3 = response.responses[1][0] as ErrorResponse;

            // Assert
            expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(2);
            expect(response.responses.length).toBe(2);
            expect(response.responses[0].length).toBe(2);
            expect(response.responses[1].length).toBe(1);

            expect(successResponse1).toHaveProperty("result");
            expect(successResponse1.result.certificate).toEqual(mockedSuccessResponse1.certificate);

            expect(errorResponse2).toHaveProperty("error");
            expect(errorResponse2.error.message).toEqual(mockErrorMessage2);
            expect(errorResponse2.error.code).toEqual(1000);

            expect(nonExecuteResponse3).toHaveProperty("error");
            expect(nonExecuteResponse3.error.code).toEqual(1001);
            expect(nonExecuteResponse3.error.message).toEqual(nonExecuteErrorMessage);
        });

        it("execute icrc112 requests with 3 sub-arrays which one request in a row return error and then rest of non-execute request will have 1001 error_1", async () => {
            // Arrange
            const mockRequest1: ICRC112Request = generateMockICRC112Request(
                1,
                "icrc1_transfer",
                "success",
            );
            const mockRequest2: ICRC112Request = generateMockICRC112Request(
                2,
                "icrc2_approve",
                "success",
            );
            const mockRequest3: ICRC112Request = generateMockICRC112Request(
                3,
                "icrc7_transfer",
                "fail",
            );
            const mockRequest4: ICRC112Request = generateMockICRC112Request(
                4,
                "icrc1_transfer",
                "nonExecute",
            );
            const requests: Icrc112Requests = [
                [mockRequest1, mockRequest2],
                [mockRequest3],
                [mockRequest4],
            ];

            const mockedSuccessResponse1 = generateMockCallCanisterResponse(1);
            const mockedSuccessResponse2 = generateMockCallCanisterResponse(2);
            const mockErrorMessage3 = "Error from request 3";

            mockCall
                .mockResolvedValueOnce(mockedSuccessResponse1)
                .mockResolvedValueOnce(mockedSuccessResponse2)
                .mockRejectedValueOnce(new Error(mockErrorMessage3));
            mockedGetPrincipal.mockReturnValue("mockedPrincipal");

            // Act
            const response = await service.icrc112Execute(requests);

            const successResponse1 = response.responses[0][0] as SuccessResponse;
            const successResponse2 = response.responses[0][1] as SuccessResponse;
            const errorResponse3 = response.responses[1][0] as ErrorResponse;
            const nonExecuteResponse4 = response.responses[2][0] as ErrorResponse;

            // Assert
            expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(3);
            expect(response.responses.length).toBe(3);
            expect(response.responses[0].length).toBe(2);
            expect(response.responses[1].length).toBe(1);
            expect(response.responses[2].length).toBe(1);

            expect(successResponse1).toHaveProperty("result");
            expect(successResponse2).toHaveProperty("result");
            expect(successResponse1.result.certificate).toEqual(mockedSuccessResponse1.certificate);
            expect(successResponse2.result.certificate).toEqual(mockedSuccessResponse2.certificate);

            expect(errorResponse3).toHaveProperty("error");
            expect(errorResponse3.error.message).toEqual(mockErrorMessage3);
            expect(errorResponse3.error.code).toEqual(1000);

            expect(nonExecuteResponse4).toHaveProperty("error");
            expect(nonExecuteResponse4.error.code).toEqual(1001);
            expect(nonExecuteResponse4.error.message).toEqual(nonExecuteErrorMessage);
        });

        it("execute icrc112 requests with 3 sub-arrays which one request in a row return error and then rest of non-execute request will have 1001 error_2", async () => {
            // Arrange
            const mockRequest1: ICRC112Request = generateMockICRC112Request(
                1,
                "icrc1_transfer",
                "success",
            );
            const mockRequest2: ICRC112Request = generateMockICRC112Request(
                2,
                "icrc2_approve",
                "success",
            );
            const mockRequest3: ICRC112Request = generateMockICRC112Request(
                3,
                "icrc7_transfer",
                "fail",
            );
            const mockRequest4: ICRC112Request = generateMockICRC112Request(
                4,
                "icrc1_transfer",
                "nonExecute",
            );
            const mockRequest5: ICRC112Request = generateMockICRC112Request(
                5,
                "icrc1_transfer",
                "nonExecute",
            );
            const requests: Icrc112Requests = [
                [mockRequest1, mockRequest2],
                [mockRequest3],
                [mockRequest4, mockRequest5],
            ];

            const mockedSuccessResponse1 = generateMockCallCanisterResponse(1);
            const mockedSuccessResponse2 = generateMockCallCanisterResponse(2);
            const mockErrorMessage3 = "Error from request 3";

            mockCall
                .mockResolvedValueOnce(mockedSuccessResponse1)
                .mockResolvedValueOnce(mockedSuccessResponse2)
                .mockRejectedValueOnce(new Error(mockErrorMessage3));
            mockedGetPrincipal.mockReturnValue("mockedPrincipal");

            // Act
            const response = await service.icrc112Execute(requests);
            const successResponse1 = response.responses[0][0] as SuccessResponse;
            const successResponse2 = response.responses[0][1] as SuccessResponse;
            const errorResponse3 = response.responses[1][0] as ErrorResponse;
            const nonExecuteResponse4 = response.responses[2][0] as ErrorResponse;
            const nonExecuteResponse5 = response.responses[2][1] as ErrorResponse;

            // Assert
            expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(3);
            expect(response.responses.length).toBe(3);
            expect(response.responses[0].length).toBe(2);
            expect(response.responses[1].length).toBe(1);
            expect(response.responses[2].length).toBe(2);

            expect(successResponse1).toHaveProperty("result");
            expect(successResponse2).toHaveProperty("result");
            expect(successResponse1.result.certificate).toEqual(mockedSuccessResponse1.certificate);
            expect(successResponse2.result.certificate).toEqual(mockedSuccessResponse2.certificate);

            expect(errorResponse3).toHaveProperty("error");
            expect(errorResponse3.error.code).toEqual(1000);
            expect(errorResponse3.error.message).toEqual(mockErrorMessage3);

            expect(nonExecuteResponse4).toHaveProperty("error");
            expect(nonExecuteResponse4.error.code).toEqual(1001);
            expect(nonExecuteResponse4.error.message).toEqual(nonExecuteErrorMessage);

            expect(nonExecuteResponse5).toHaveProperty("error");
            expect(nonExecuteResponse5.error.code).toEqual(1001);
            expect(nonExecuteResponse5.error.message).toEqual(nonExecuteErrorMessage);
        });

        it("execute icrc112 requests with 3 sub-arrays which one request in a row return error and then rest of non-execute request will have 1001 error_3", async () => {
            // Arrange
            const mockRequest1: ICRC112Request = generateMockICRC112Request(
                1,
                "icrc1_transfer",
                "fail",
            );
            const mockRequest2: ICRC112Request = generateMockICRC112Request(
                2,
                "icrc2_approve",
                "success",
            );

            const mockRequest3: ICRC112Request = generateMockICRC112Request(
                3,
                "icrc7_transfer",
                "nonExecute",
            );

            const mockRequest4: ICRC112Request = generateMockICRC112Request(
                4,
                "icrc1_transfer",
                "nonExecute",
            );
            const mockRequest5: ICRC112Request = generateMockICRC112Request(
                5,
                "icrc1_transfer",
                "nonExecute",
            );

            const requests: Icrc112Requests = [
                [mockRequest1, mockRequest2],
                [mockRequest3],
                [mockRequest4, mockRequest5],
            ];

            const mockErrorMessage1 = "Error from request 1";
            const mockedSuccessResponse2 = generateMockCallCanisterResponse(2);

            mockCall
                .mockRejectedValueOnce(new Error(mockErrorMessage1))
                .mockResolvedValueOnce(mockedSuccessResponse2);
            mockedGetPrincipal.mockReturnValue("mockedPrincipal");

            // Act
            const response = await service.icrc112Execute(requests);
            const errorResponse1 = response.responses[0][0] as ErrorResponse;
            const successResponse2 = response.responses[0][1] as SuccessResponse;
            const nonExecuteResponse3 = response.responses[1][0] as ErrorResponse;
            const nonExecuteResponse4 = response.responses[2][0] as ErrorResponse;
            const nonExecuteResponse5 = response.responses[2][1] as ErrorResponse;

            // Assert
            expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(2);
            expect(response.responses.length).toBe(3);
            expect(response.responses[0].length).toBe(2);
            expect(response.responses[1].length).toBe(1);
            expect(response.responses[2].length).toBe(2);

            expect(errorResponse1).toHaveProperty("error");
            expect(successResponse2).toHaveProperty("result");
            expect(errorResponse1.error.code).toEqual(1000);
            expect(errorResponse1.error.message).toEqual(mockErrorMessage1);
            expect(successResponse2.result.certificate).toEqual(mockedSuccessResponse2.certificate);

            expect(nonExecuteResponse3).toHaveProperty("error");
            expect(nonExecuteResponse3.error.code).toEqual(1001);
            expect(nonExecuteResponse3.error.message).toEqual(nonExecuteErrorMessage);

            expect(nonExecuteResponse4).toHaveProperty("error");
            expect(nonExecuteResponse4.error.code).toEqual(1001);
            expect(nonExecuteResponse4.error.message).toEqual(nonExecuteErrorMessage);

            expect(nonExecuteResponse5).toHaveProperty("error");
            expect(nonExecuteResponse5.error.code).toEqual(1001);
            expect(nonExecuteResponse5.error.message).toEqual(nonExecuteErrorMessage);
        });

        it("execute icrc112 requests with 3 sub-arrays which one request in a row return error and then rest of non-execute request will have 1001 error_4", async () => {
            // Arrange
            const mockRequest1: ICRC112Request = generateMockICRC112Request(
                1,
                "icrc1_transfer",
                "success",
            );
            const mockRequest2: ICRC112Request = generateMockICRC112Request(
                2,
                "icrc2_approve",
                "success",
            );

            const mockRequest3: ICRC112Request = generateMockICRC112Request(
                3,
                "icrc7_transfer",
                "success",
            );
            const mockRequest4: ICRC112Request = generateMockICRC112Request(
                4,
                "icrc1_transfer",
                "fail",
            );

            const mockRequest5: ICRC112Request = generateMockICRC112Request(
                5,
                "icrc1_transfer",
                "nonExecute",
            );
            const mockRequest6: ICRC112Request = generateMockICRC112Request(
                6,
                "icrc2_approve",
                "nonExecute",
            );

            const requests: Icrc112Requests = [
                [mockRequest1, mockRequest2],
                [mockRequest3, mockRequest4],
                [mockRequest5, mockRequest6],
            ];

            const mockedSuccessResponse1 = generateMockCallCanisterResponse(1);
            const mockedSuccessResponse2 = generateMockCallCanisterResponse(2);
            const mockedSuccessResponse3 = generateMockCallCanisterResponse(3);
            const mockErrorMessage4 = "Error from request 4";

            mockCall
                .mockResolvedValueOnce(mockedSuccessResponse1)
                .mockResolvedValueOnce(mockedSuccessResponse2)
                .mockResolvedValueOnce(mockedSuccessResponse3)
                .mockRejectedValueOnce(new Error(mockErrorMessage4));
            mockedGetPrincipal.mockReturnValue("mockedPrincipal");

            // Act
            const response = await service.icrc112Execute(requests);
            const successResponse1 = response.responses[0][0] as SuccessResponse;
            const successResponse2 = response.responses[0][1] as SuccessResponse;
            const successResponse3 = response.responses[1][0] as SuccessResponse;
            const errorResponse4 = response.responses[1][1] as ErrorResponse;
            const nonExecuteResponse5 = response.responses[2][0] as ErrorResponse;
            const nonExecuteResponse6 = response.responses[2][1] as ErrorResponse;

            // Assert
            expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(4);
            expect(response.responses.length).toBe(3);
            expect(response.responses[0].length).toBe(2);
            expect(response.responses[1].length).toBe(2);
            expect(response.responses[2].length).toBe(2);

            expect(successResponse1).toHaveProperty("result");
            expect(successResponse2).toHaveProperty("result");
            expect(successResponse1.result.certificate).toEqual(mockedSuccessResponse1.certificate);
            expect(successResponse2.result.certificate).toEqual(mockedSuccessResponse2.certificate);

            expect(successResponse3).toHaveProperty("result");
            expect(successResponse3.result.certificate).toEqual(mockedSuccessResponse3.certificate);
            expect(errorResponse4).toHaveProperty("error");
            expect(errorResponse4.error.code).toEqual(1000);
            expect(errorResponse4.error.message).toEqual(mockErrorMessage4);

            expect(nonExecuteResponse5).toHaveProperty("error");
            expect(nonExecuteResponse5.error.code).toEqual(1001);
            expect(nonExecuteResponse5.error.message).toEqual(nonExecuteErrorMessage);
            expect(nonExecuteResponse6).toHaveProperty("error");
            expect(nonExecuteResponse6.error.code).toEqual(1001);
            expect(nonExecuteResponse6.error.message).toEqual(nonExecuteErrorMessage);
        });

        it("execute icrc112 requests with 4 sub-arrays which one request in a row return error and then rest of non-execute request will have 1001 error_5", async () => {
            // Arrange
            const mockRequest1: ICRC112Request = generateMockICRC112Request(
                1,
                "icrc1_transfer",
                "success",
            );
            const mockRequest2: ICRC112Request = generateMockICRC112Request(
                2,
                "icrc2_approve",
                "success",
            );

            const mockRequest3: ICRC112Request = generateMockICRC112Request(
                3,
                "icrc7_transfer",
                "success",
            );
            const mockRequest4: ICRC112Request = generateMockICRC112Request(
                4,
                "icrc1_transfer",
                "success",
            );

            const mockRequest5: ICRC112Request = generateMockICRC112Request(
                5,
                "icrc1_transfer",
                "fail",
            );
            const mockRequest6: ICRC112Request = generateMockICRC112Request(
                6,
                "icrc2_approve",
                "success",
            );

            const mockRequest7: ICRC112Request = generateMockICRC112Request(
                7,
                "icrc7_transfer",
                "nonExecute",
            );

            const requests: Icrc112Requests = [
                [mockRequest1, mockRequest2],
                [mockRequest3, mockRequest4],
                [mockRequest5, mockRequest6],
                [mockRequest7],
            ];

            const mockedSuccessResponse1 = generateMockCallCanisterResponse(1);
            const mockedSuccessResponse2 = generateMockCallCanisterResponse(2);
            const mockedSuccessResponse3 = generateMockCallCanisterResponse(3);
            const mockedSuccessResponse4 = generateMockCallCanisterResponse(4);
            const mockErrorMessage5 = "Error from request 5";
            const mockedSuccessResponse6 = generateMockCallCanisterResponse(6);

            mockCall
                .mockResolvedValueOnce(mockedSuccessResponse1)
                .mockResolvedValueOnce(mockedSuccessResponse2)
                .mockResolvedValueOnce(mockedSuccessResponse3)
                .mockResolvedValueOnce(mockedSuccessResponse4)
                .mockRejectedValueOnce(new Error(mockErrorMessage5))
                .mockResolvedValueOnce(mockedSuccessResponse6);
            mockedGetPrincipal.mockReturnValue("mockedPrincipal");

            // Act
            const response = await service.icrc112Execute(requests);
            const successResponse1 = response.responses[0][0] as SuccessResponse;
            const successResponse2 = response.responses[0][1] as SuccessResponse;
            const successResponse3 = response.responses[1][0] as SuccessResponse;
            const successResponse4 = response.responses[1][1] as SuccessResponse;
            const errorResponse5 = response.responses[2][0] as ErrorResponse;
            const successResponse6 = response.responses[2][1] as SuccessResponse;
            const nonExecuteResponse7 = response.responses[3][0] as ErrorResponse;

            // Assert
            expect(mockedCallCanisterService.call).toHaveBeenCalledTimes(6);
            expect(response.responses.length).toBe(4);
            expect(response.responses[0].length).toBe(2);
            expect(response.responses[1].length).toBe(2);
            expect(response.responses[2].length).toBe(2);
            expect(response.responses[3].length).toBe(1);

            expect(successResponse1).toHaveProperty("result");
            expect(successResponse1.result.certificate).toEqual(mockedSuccessResponse1.certificate);
            expect(successResponse2).toHaveProperty("result");
            expect(successResponse2.result.certificate).toEqual(mockedSuccessResponse2.certificate);

            expect(successResponse3).toHaveProperty("result");
            expect(successResponse3.result.certificate).toEqual(mockedSuccessResponse3.certificate);
            expect(successResponse4).toHaveProperty("result");
            expect(successResponse4.result.certificate).toEqual(mockedSuccessResponse4.certificate);

            expect(errorResponse5).toHaveProperty("error");
            expect(errorResponse5.error.code).toEqual(1000);
            expect(errorResponse5.error.message).toEqual(mockErrorMessage5);
            expect(successResponse6).toHaveProperty("result");
            expect(successResponse6.result.certificate).toEqual(mockedSuccessResponse6.certificate);

            expect(nonExecuteResponse7).toHaveProperty("error");
            expect(nonExecuteResponse7.error.code).toEqual(1001);
            expect(nonExecuteResponse7.error.message).toEqual(nonExecuteErrorMessage);
        });
    });
});
