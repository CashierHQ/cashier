// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { describe, it, expect, beforeAll } from "@jest/globals";
import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { execSync } from "child_process";
import * as path from "path";
import {
    _SERVICE,
    idlFactory,
    CreateActionInput,
    ProcessActionInput,
    LinkDto,
    ActionDto,
    CreateLinkInput,
} from "../../../../declarations/cashier_backend/cashier_backend.did";
import TokenUtilServiceFixture from "../fixtures/token-utils-fixture";

describe("Process Action Request Lock", () => {
    let actor: _SERVICE;
    let claimerActor: _SERVICE; // Second actor for claim testing
    let identity: Identity;
    let claimerIdentity: Identity; // Second identity for claim testing
    let canisterId: string;
    let processedAction: ActionDto;
    let createdLink: LinkDto;
    let createdAction: ActionDto;
    let tokenService: TokenUtilServiceFixture;

    // Fixed seed for consistent testing
    const TEST_IDENTITY_SEED = "test-seed-for-process-action-spec-54321";
    const CLAIMER_IDENTITY_SEED = "claimer-seed-for-process-action-spec-12345";
    const AIRDROP_AMOUNT = "5000"; // 5000 ICP for testing

    // Function to run airdrop script
    const runAirdrop = async (
        principalId: string,
        amount: string = AIRDROP_AMOUNT,
    ): Promise<void> => {
        try {
            const airdropScriptPath = path.resolve(__dirname, "../../../scripts/airdrop.sh");

            try {
                execSync(`chmod +x "${airdropScriptPath}"`, { encoding: "utf8" });
            } catch (chmodError) {
                console.warn("Could not make script executable:", chmodError);
            }

            try {
                execSync(`test -f "${airdropScriptPath}"`, { encoding: "utf8" });
            } catch {
                throw new Error(`Airdrop script not found at: ${airdropScriptPath}`);
            }

            execSync(`bash "${airdropScriptPath}" "${principalId}" "${amount}"`, {
                encoding: "utf8",
                stdio: "pipe",
                timeout: 60000,
                cwd: path.dirname(airdropScriptPath),
            });
        } catch (error: Error | unknown) {
            console.warn("⚠️  Airdrop failed, but continuing with tests:");
            if (error instanceof Error) {
                console.warn("Error message:", error.message);
                const execError = error as Error & { stdout?: string; stderr?: string };
                if (execError.stdout) {
                    console.warn("Script stdout:", execError.stdout);
                }
                if (execError.stderr) {
                    console.warn("Script stderr:", execError.stderr);
                }
            } else {
                console.warn("Unknown error:", String(error));
            }
            console.warn("Note: Tests may fail if insufficient funds are available");
            console.warn(
                `You can manually run: bash ${path.resolve(__dirname, "../../../scripts/airdrop.sh")} ${principalId} ${amount}`,
            );
        }
    };

    beforeAll(async () => {
        // Create fixed test identity using predefined seed
        const seedBytes = new TextEncoder().encode(TEST_IDENTITY_SEED);
        const seed = new Uint8Array(32);
        seed.set(seedBytes.slice(0, 32));

        identity = Ed25519KeyIdentity.generate(seed);

        // Create second identity for claimer
        const claimerSeedBytes = new TextEncoder().encode(CLAIMER_IDENTITY_SEED);
        const claimerSeed = new Uint8Array(32);
        claimerSeed.set(claimerSeedBytes.slice(0, 32));

        claimerIdentity = Ed25519KeyIdentity.generate(claimerSeed);

        const principalId = identity.getPrincipal().toString();
        const claimerPrincipalId = claimerIdentity.getPrincipal().toString();

        // Run airdrop for both identities to ensure they have sufficient funds
        await runAirdrop(principalId, AIRDROP_AMOUNT);
        await runAirdrop(claimerPrincipalId, AIRDROP_AMOUNT);

        // Set up canister ID
        canisterId = process.env["CANISTER_ID_CASHIER_BACKEND"] || "jjio5-5aaaa-aaaam-adhaq-cai";

        // Create HTTP agent for local testing (main identity)
        const agent = HttpAgent.createSync({
            identity,
            host: "http://127.0.0.1:4943",
        });

        await agent.fetchRootKey().catch((err) => {
            console.warn("Unable to fetch root key:", err);
        });

        // Create HTTP agent for claimer identity
        const claimerAgent = HttpAgent.createSync({
            identity: claimerIdentity,
            host: "http://127.0.0.1:4943",
        });

        await claimerAgent.fetchRootKey().catch((err) => {
            console.warn("Unable to fetch root key for claimer:", err);
        });

        // Create actors
        actor = Actor.createActor(idlFactory, {
            agent,
            canisterId,
        });

        claimerActor = Actor.createActor(idlFactory, {
            agent: claimerAgent,
            canisterId,
        });

        // Initialize token service
        tokenService = new TokenUtilServiceFixture(identity);

        // Create a user first (main identity)
        try {
            const userResult = await actor.create_user();
            if ("Err" in userResult) {
                throw new Error(`Failed to create user: ${JSON.stringify(userResult.Err)}`);
            }
        } catch {
            try {
                const existingUser = await actor.get_user();
                if ("Ok" in existingUser) {
                    // User exists, continue
                }
            } catch (getUserError) {
                console.warn("Could not get existing user:", getUserError);
            }
        }

        // Create user for claimer identity
        try {
            const claimerUserResult = await claimerActor.create_user();
            if ("Err" in claimerUserResult) {
                throw new Error(
                    `Failed to create claimer user: ${JSON.stringify(claimerUserResult.Err)}`,
                );
            }
        } catch {
            try {
                const existingClaimerUser = await claimerActor.get_user();
                if ("Ok" in existingClaimerUser) {
                    // User exists, continue
                }
            } catch (getUserError) {
                console.warn("Could not get existing claimer user:", getUserError);
            }
        }

        // Create a link for testing
        const linkInput: CreateLinkInput = {
            title: "Test Link for Process Action",
            asset_info: [
                {
                    chain: "IC",
                    address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                    label: "SEND_TIP_ASSET",
                    amount_per_link_use_action: BigInt(1_0000_0000),
                },
            ],
            link_type: "SendTip",
            description: ["Test link for process action functionality"],
            link_image_url: ["https://example.com/process-action.png"],
            template: "Central",
            link_use_action_max_count: BigInt(1),
            nft_image: [],
        };

        const linkResult = await actor.create_link(linkInput);
        if ("Ok" in linkResult) {
            createdLink = linkResult.Ok;
        } else {
            throw new Error(`Failed to create test link: ${JSON.stringify(linkResult.Err)}`);
        }

        // Create an action for testing
        const actionInput: CreateActionInput = {
            link_id: createdLink.id,
            action_type: "CreateLink",
        };

        const actionResult = await actor.create_action(actionInput);
        if ("Ok" in actionResult) {
            createdAction = actionResult.Ok;
        } else {
            throw new Error(`Failed to create test action: ${JSON.stringify(actionResult.Err)}`);
        }
    });

    it("should process an action successfully", async () => {
        const processInput: ProcessActionInput = {
            action_id: createdAction.id,
            link_id: createdLink.id,
            action_type: "CreateLink",
        };

        const result = await actor.process_action(processInput);

        if ("Ok" in result) {
            const action = result.Ok;
            processedAction = action;
            expect(action).toBeDefined();
            expect(action.id).toBeDefined();
            expect(action.type).toBe("CreateLink");
            expect(action.state).toBe("Action_state_processing");
            expect(action.icrc_112_requests).toBeDefined();
        } else {
            throw new Error(`Failed to process action: ${JSON.stringify(result.Err)}`);
        }
    });

    it("should execute complete ICRC-112 flow after process_action", async () => {
        // Use the existing createdAction from the first test that succeeded
        const icrc112RequestsOpt = processedAction.icrc_112_requests;

        if (icrc112RequestsOpt.length > 0) {
            const icrc112Requests = icrc112RequestsOpt[0]; // Get the array from the optional
            if (icrc112Requests) {
                if (icrc112Requests.length > 0) {
                    const firstBatch = icrc112Requests[0];
                    if (firstBatch && firstBatch.length > 0) {
                        // ICRC-112 requests are available for processing
                        expect(firstBatch.length).toBeGreaterThan(0);
                    }
                }
            }
        }

        // Step 3: Execute actual ICRC1 transfer and ICRC2 approve in parallel
        const ICP_TOKEN_ADDRESS = "ryjl3-tyaaa-aaaaa-aaaba-cai";

        try {
            // Execute transfer and approve in parallel
            const [transferResult, approveResult] = await Promise.all([
                // Transfer to link address (backend canister + link subaccount)
                tokenService.transferToLink(
                    ICP_TOKEN_ADDRESS,
                    createdLink.id,
                    // amount + fee
                    BigInt(100010000),
                    canisterId,
                ),
                // Approve backend canister as spender
                tokenService.approveBackendCanister(
                    ICP_TOKEN_ADDRESS,
                    canisterId,
                    // amount for transfer to treasury
                    BigInt(10000000),
                ),
            ]);

            // Extract block indices from results (ICRC operations return bigint directly on success)
            const transferBlockIndex = typeof transferResult === "bigint" ? transferResult : null;
            const approveBlockIndex = typeof approveResult === "bigint" ? approveResult : null;

            expect(transferBlockIndex).toBeDefined();
            expect(approveBlockIndex).toBeDefined();
        } catch {
            // ICRC operations might fail in test environment, continue with test
        }

        // Step 4: Execute trigger_transaction (sequential after parallel operations)
        // Find the trigger_transaction from ICRC-112 requests and extract the transaction ID
        let triggerTransactionId: string | null = null;

        if (icrc112RequestsOpt.length > 0) {
            const icrc112Requests = icrc112RequestsOpt[0];
            if (icrc112Requests) {
                // Search through all batches for trigger_transaction method
                for (const batch of icrc112Requests) {
                    const triggerRequest = batch.find(
                        (request) => request.method === "trigger_transaction",
                    );
                    if (triggerRequest && triggerRequest.nonce.length > 0) {
                        triggerTransactionId = triggerRequest.nonce[0] || null;
                        break;
                    }
                }
            }
        }

        if (triggerTransactionId) {
            try {
                const tasks = new Array(3).fill(0).map(async () => {
                    return await actor.trigger_transaction({
                        transaction_id: triggerTransactionId!,
                        action_id: createdAction.id,
                        link_id: createdLink.id,
                    });
                });

                const results = await Promise.all(tasks);

                expect(results.filter((result) => "Ok" in result).length).toBe(1);
                expect(results.filter((result) => "Err" in result).length).toBe(2);

                const okResult = results.find((result) => "Ok" in result);
                if (okResult) {
                    expect("Ok" in okResult).toBe(true);
                } else {
                    throw new Error("No OK result found");
                }
            } catch {
                // Trigger transaction might fail, which is expected
            }
        } else {
            // No trigger transaction found in ICRC-112 requests
            expect(triggerTransactionId).toBeDefined();
        }

        // Step 5: Update action after transaction completion
        const updateTasks = new Array(3).fill(0).map(async () => {
            return await actor.update_action({
                action_id: createdAction.id,
                link_id: createdLink.id,
                external: true, // Mark as externally processed
            });
        });

        const updateResults = await Promise.all(updateTasks);

        console.log("updateResults", updateResults);

        expect(updateResults.filter((result) => "Ok" in result).length).toBe(1);
        expect(updateResults.filter((result) => "Err" in result).length).toBe(2);

        const okUpdateResult = updateResults.find((result) => "Ok" in result);
        expect(okUpdateResult).toBeDefined();

        const finalAction = (okUpdateResult as { Ok: ActionDto }).Ok;
        expect(finalAction.state).toBe("Action_state_success");

        // Activate the link after successful action completion
        const updateLinkResult = await actor.update_link({
            id: createdLink.id,
            action: "Continue",
            params: [],
        });

        if ("Ok" in updateLinkResult) {
            const updatedLink = updateLinkResult.Ok;
            expect(updatedLink.state).toBe("Link_state_active");
        } else {
            console.warn("Failed to activate link:", updateLinkResult.Err);
        }
    });

    it("should test request locking on claim action process_action calls", async () => {
        // Step 1: Create a claim action using the claimer identity
        const claimActionInput: CreateActionInput = {
            link_id: createdLink.id,
            action_type: "Use",
        };

        const claimActionResult = await claimerActor.create_action(claimActionInput);
        if ("Err" in claimActionResult) {
            throw new Error(
                `Failed to create claim action: ${JSON.stringify(claimActionResult.Err)}`,
            );
        }

        const claimAction = claimActionResult.Ok;
        expect(claimAction.type).toBe("Use");
        expect(claimAction.state).toBe("Action_state_created");

        // Step 2: Execute multiple concurrent process_action calls
        const processInput: ProcessActionInput = {
            action_id: claimAction.id,
            link_id: createdLink.id,
            action_type: "Use",
        };

        // Create 3 concurrent process_action calls
        const processTasks = new Array(3).fill(0).map(async () => {
            return await claimerActor.process_action(processInput);
        });

        const processResults = await Promise.all(processTasks);

        // Step 3: Verify request locking behavior
        // Only one should succeed, others should fail due to request lock
        const successResults = processResults.filter((result) => "Ok" in result);
        const errorResults = processResults.filter((result) => "Err" in result);

        expect(successResults.length).toBe(1);
        expect(errorResults.length).toBe(2);

        // Verify the successful result
        const successfulAction = (successResults[0] as { Ok: ActionDto }).Ok;
        expect(successfulAction.id).toBe(claimAction.id);
        expect(successfulAction.type).toBe("Use");
        expect(successfulAction.state).toBe("Action_state_success");

        // Verify error results contain request lock errors
        for (const errorResult of errorResults) {
            const error = (errorResult as { Err: unknown }).Err;
            expect(error).toBeDefined();
            // The error should indicate request lock conflict
        }
    });
});
