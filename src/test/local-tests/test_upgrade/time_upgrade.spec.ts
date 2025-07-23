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
    LinkDto,
    ActionDto,
    CreateLinkInput,
    ProcessActionInput,
} from "../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable } from "@dfinity/utils";

describe("Canister Upgrade During Action Processing", () => {
    let actor: _SERVICE;
    let identity: Identity;
    let canisterId: string;
    let createdLink: LinkDto;
    let createdAction: ActionDto;
    let processedAction: ActionDto;
    let startTimeoutAt: number;

    // Fixed seed for consistent testing
    const TEST_IDENTITY_SEED = "test-seed-for-canister-upgrade-spec-98765";
    const AIRDROP_AMOUNT = "5000"; // 5000 ICP for testing

    // Increase Jest timeout for long-running tests with transaction waits
    jest.setTimeout(300000); // 5 minutes timeout

    // Function to run airdrop script
    const runAirdrop = async (
        principalId: string,
        amount: string = AIRDROP_AMOUNT,
    ): Promise<void> => {
        try {
            // Construct path to airdrop script
            const airdropScriptPath = path.resolve(__dirname, "../../../scripts/airdrop.sh");
            console.log(`Running airdrop script: ${airdropScriptPath}`);
            console.log(`Airdropping ${amount} ICP to ${principalId}`);

            // Make sure script is executable
            try {
                execSync(`chmod +x "${airdropScriptPath}"`, { encoding: "utf8" });
            } catch (chmodError) {
                console.warn("Could not make script executable:", chmodError);
            }

            // Check if script exists
            try {
                execSync(`test -f "${airdropScriptPath}"`, { encoding: "utf8" });
            } catch {
                throw new Error(`Airdrop script not found at: ${airdropScriptPath}`);
            }

            // Run the airdrop script with proper arguments
            console.log(`Executing: bash "${airdropScriptPath}" "${principalId}" "${amount}"`);

            const result = execSync(`bash "${airdropScriptPath}" "${principalId}" "${amount}"`, {
                encoding: "utf8",
                stdio: "pipe", // Capture output for better error handling
                timeout: 60000, // 60 second timeout
                cwd: path.dirname(airdropScriptPath), // Run from script directory
            });

            console.log("Airdrop script output:", result);
            console.log("✅ Airdrop completed successfully");
        } catch (error: Error | unknown) {
            console.warn("⚠️  Airdrop failed, but continuing with tests:");
            if (error instanceof Error) {
                console.warn("Error message:", error.message);
                // Handle execSync errors which may have stdout/stderr properties
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

    // Function to upgrade canister
    const upgradeCanister = async (): Promise<void> => {
        try {
            const upgradeScriptPath = path.resolve(__dirname, "../../scripts/upgrade_canister.sh");
            console.log(`🔄 Upgrading canister using script: ${upgradeScriptPath}`);

            // Make sure script is executable
            try {
                execSync(`chmod +x "${upgradeScriptPath}"`, { encoding: "utf8" });
            } catch (chmodError) {
                console.warn("Could not make upgrade script executable:", chmodError);
            }

            // Check if script exists
            try {
                execSync(`test -f "${upgradeScriptPath}"`, { encoding: "utf8" });
            } catch {
                throw new Error(`Upgrade script not found at: ${upgradeScriptPath}`);
            }

            // Run the upgrade script from the project root directory
            const projectRoot = path.resolve(__dirname, "../../../..");
            console.log(`Executing: bash "${upgradeScriptPath}" from project root: ${projectRoot}`);

            const result = execSync(`bash "${upgradeScriptPath}"`, {
                encoding: "utf8",
                stdio: "pipe",
                timeout: 300000, // 5 minute timeout for canister upgrade (includes build time)
                cwd: projectRoot, // Run from project root where dfx.json is located
            });

            console.log("Upgrade script output:", result);
            console.log("✅ Canister upgrade completed successfully");
        } catch (error: Error | unknown) {
            console.error("❌ Canister upgrade failed:");
            if (error instanceof Error) {
                console.error("Error message:", error.message);
                const execError = error as Error & { stdout?: string; stderr?: string };
                if (execError.stdout) {
                    console.error("Script stdout:", execError.stdout);
                }
                if (execError.stderr) {
                    console.error("Script stderr:", execError.stderr);
                }
            } else {
                console.error("Unknown error:", String(error));
            }
            throw error;
        }
    };

    // // Function to check transaction status and details
    // const checkTransactionStatus = async (linkId: string): Promise<void> => {
    //     try {
    //         console.log("🔍 Checking transaction status...");

    //         // Get the current action with potential transaction details
    //         const linkWithActionResult = await actor.get_link(linkId, [{ action_type: "CreateLink" }]);

    //         if ("Ok" in linkWithActionResult) {
    //             const getLinkResp = linkWithActionResult.Ok;
    //             const actionOpt = getLinkResp.action;

    //             if (actionOpt.length > 0) {
    //                 const currentAction = actionOpt[0]!;
    //                 console.log(`📊 Current action state: ${currentAction.state}`);
    //                 console.log(`📊 Action ID: ${currentAction.id}`);
    //                 console.log(`📊 Action type: ${currentAction.type}`);

    //                 // Check for ICRC-112 requests and their status
    //                 if (currentAction.icrc_112_requests && currentAction.icrc_112_requests.length > 0) {
    //                     const icrc112Requests = currentAction.icrc_112_requests[0];
    //                     if (icrc112Requests && icrc112Requests.length > 0) {
    //                         console.log(`📋 Found ${icrc112Requests.length} batches of ICRC-112 requests`);

    //                         // Log details of first batch for inspection
    //                         const firstBatch = icrc112Requests[0];
    //                         if (firstBatch && firstBatch.length > 0) {
    //                             console.log(`📋 First batch contains ${firstBatch.length} requests`);
    //                             const firstRequest = firstBatch[0];
    //                             if (firstRequest) {
    //                                 console.log("📋 First request details:", JSON.stringify(firstRequest, null, 2));
    //                             }
    //                         }
    //                     }
    //                 } else {
    //                     console.log("📋 No ICRC-112 requests found or they have been processed");
    //                 }

    //                 // Check if action has any error states or failure information
    //                 if (currentAction.state.includes("fail") || currentAction.state.includes("error")) {
    //                     console.log("❌ Action appears to be in a failure state");
    //                 } else if (currentAction.state === "Action_state_processing") {
    //                     console.log("🔄 Action is still in processing state");
    //                 } else if (currentAction.state === "Action_state_success") {
    //                     console.log("✅ Action completed successfully");
    //                 }

    //             } else {
    //                 console.warn("⚠️  No action found in link response");
    //             }
    //         } else {
    //             console.error("❌ Failed to get link with action:", linkWithActionResult.Err);
    //         }

    //     } catch (error) {
    //         console.error("❌ Failed to check transaction status:", error);
    //     }
    // };

    beforeAll(async () => {
        // Create fixed test identity using predefined seed
        const seedBytes = new TextEncoder().encode(TEST_IDENTITY_SEED);
        const seed = new Uint8Array(32); // Ed25519 requires 32 bytes
        seed.set(seedBytes.slice(0, 32)); // Take first 32 bytes

        identity = Ed25519KeyIdentity.generate(seed);

        const principalId = identity.getPrincipal().toString();
        console.log("Test Identity Principal:", principalId);

        // Run airdrop to ensure test identity has sufficient funds
        console.log("🪂 Setting up test funds...");
        await runAirdrop(principalId, AIRDROP_AMOUNT);

        // Set up canister ID
        canisterId = process.env["CANISTER_ID_CASHIER_BACKEND"] || "jjio5-5aaaa-aaaam-adhaq-cai";

        console.log("Using Canister ID:", canisterId);

        // Create HTTP agent for local testing
        const agent = HttpAgent.createSync({
            identity,
            host: "http://127.0.0.1:4943",
        });

        // Fetch root key for local development
        await agent.fetchRootKey().catch((err) => {
            console.warn("Unable to fetch root key:", err);
        });

        // Create actor
        actor = Actor.createActor(idlFactory, {
            agent,
            canisterId,
        });

        console.log("Actor created successfully");

        // Create a user first (required for creating links)
        try {
            console.log("Creating user...");
            const userResult = await actor.create_user();
            if ("Err" in userResult) {
                throw new Error(`Failed to create user: ${JSON.stringify(userResult.Err)}`);
            }
            console.log("User created successfully:", userResult.Ok);
        } catch (error) {
            console.log("User might already exist:", error);
            // Try to get existing user
            try {
                const existingUser = await actor.get_user();
                if ("Ok" in existingUser) {
                    console.log("Using existing user:", existingUser.Ok);
                }
            } catch (getUserError) {
                console.warn("Could not get existing user:", getUserError);
            }
        }

        console.log("🚀 Test setup completed successfully!");
    });

    it("should create a link successfully", async () => {
        console.log("Creating test link...");

        const linkInput: CreateLinkInput = {
            title: "Test Link for Canister Upgrade",
            asset_info: [
                {
                    chain: "IC",
                    address: "ryjl3-tyaaa-aaaaa-aaaba-cai", // ICP canister ID
                    label: "SEND_TIP_ASSET",
                    amount_per_link_use_action: BigInt(1_0000_0000), // 0.1 ICP
                },
            ],
            link_type: "SendTip",
            description: ["Test link for canister upgrade scenario"],
            link_image_url: ["https://example.com/upgrade-test.png"],
            template: "Central",
            link_use_action_max_count: BigInt(1),
            nft_image: [],
        };

        const result = await actor.create_link(linkInput);

        expect(result).toBeDefined();
        expect("Ok" in result).toBe(true);

        if ("Ok" in result) {
            createdLink = result.Ok;
            console.log("Link created successfully with ID:", createdLink.id);

            expect(createdLink.id).toBeDefined();
            expect(fromNullable(createdLink.title)).toBe("Test Link for Canister Upgrade");
            expect(fromNullable(createdLink.link_type)).toBe("SendTip");
            expect(createdLink.state).toBe("Link_state_create_link");
        } else {
            throw new Error(`Failed to create link: ${JSON.stringify(result.Err)}`);
        }
    });

    it("should create an action successfully", async () => {
        expect(createdLink).toBeDefined();
        console.log("Creating action for link:", createdLink.id);

        const actionInput: CreateActionInput = {
            link_id: createdLink.id,
            action_type: "CreateLink",
        };

        const result = await actor.create_action(actionInput);

        expect(result).toBeDefined();
        expect("Ok" in result).toBe(true);

        if ("Ok" in result) {
            createdAction = result.Ok;
            console.log("Action created successfully with ID:", createdAction.id);

            expect(createdAction.id).toBeDefined();
            expect(createdAction.type).toBe("CreateLink");
            expect(createdAction.state).toBe("Action_state_created");
        } else {
            throw new Error(`Failed to create action: ${JSON.stringify(result.Err)}`);
        }
    });

    it("should process action and get ICRC-112 requests without executing them", async () => {
        expect(createdAction).toBeDefined();
        console.log("Processing action:", createdAction.id);

        const processInput: ProcessActionInput = {
            action_id: createdAction.id,
            link_id: createdLink.id,
            action_type: "CreateLink",
        };

        const start_timeout_out = Date.now();
        startTimeoutAt = start_timeout_out;
        const result = await actor.process_action(processInput);

        expect(result).toBeDefined();
        expect("Ok" in result).toBe(true);

        if ("Ok" in result) {
            processedAction = result.Ok;
            console.log("Action processed successfully. State:", processedAction.state);

            expect(processedAction.id).toBe(createdAction.id);
            expect(processedAction.type).toBe("CreateLink");
            expect(processedAction.state).toBe("Action_state_processing");
            expect(processedAction.icrc_112_requests).toBeDefined();

            // Verify ICRC-112 requests are present (but don't execute them)
            const icrc112RequestsOpt = processedAction.icrc_112_requests;
            expect(icrc112RequestsOpt.length).toBeGreaterThan(0);

            if (icrc112RequestsOpt.length > 0) {
                const icrc112Requests = icrc112RequestsOpt[0];
                expect(icrc112Requests).toBeDefined();
                if (icrc112Requests && icrc112Requests.length > 0) {
                    const firstBatch = icrc112Requests[0];
                    expect(firstBatch).toBeDefined();
                    expect(firstBatch.length).toBeGreaterThan(0);
                    console.log(
                        `✅ ICRC-112 requests prepared: ${firstBatch.length} requests in first batch`,
                    );
                }
            }

            // Now upgrade the canister while the action is in processing state
            console.log("🔄 Upgrading canister during action processing...");
            await upgradeCanister();

            console.log("✅ Canister upgrade completed while action was in processing state");
        } else {
            throw new Error(`Failed to process action: ${JSON.stringify(result.Err)}`);
        }
    });

    it("should timeout transactions after canister upgrade and verify they are marked as failed", async () => {
        expect(processedAction).toBeDefined();
        expect(startTimeoutAt).toBeDefined();

        // Calculate how much time to sleep to ensure the transaction times out
        // Transaction timeout is 20 seconds, so we wait 25 seconds from when the action was processed
        const timeoutDurationMs = 25000; // 25 seconds to ensure timeout
        const elapsedMs = Date.now() - startTimeoutAt;
        const remainingWaitMs = Math.max(0, timeoutDurationMs - elapsedMs);

        console.log(`⏱️  Waiting ${remainingWaitMs}ms more for transaction to timeout...`);
        console.log(`📊 Action was processed at: ${new Date(startTimeoutAt).toISOString()}`);
        console.log(`📊 Current time: ${new Date().toISOString()}`);

        if (remainingWaitMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, remainingWaitMs));
        }

        console.log("⏰ Timeout period elapsed, checking transaction status...");

        // Now check that the action/transaction has been marked as failed due to timeout
        try {
            console.log("🔍 Checking action status after timeout...");

            // Get the current action to check its final state
            const linkWithActionResult = await actor.get_link(createdLink.id, [
                { action_type: "CreateLink" },
            ]);

            expect("Ok" in linkWithActionResult).toBe(true);

            if ("Ok" in linkWithActionResult) {
                const getLinkResp = linkWithActionResult.Ok;
                const actionOpt = getLinkResp.action;

                expect(actionOpt.length).toBeGreaterThan(0);

                if (actionOpt.length > 0) {
                    const currentAction = actionOpt[0]!;
                    console.log(`📊 Final action state: ${currentAction.state}`);
                    console.log(`📊 Action ID: ${currentAction.id}`);

                    // Verify the action is in a failed state due to timeout
                    expect(currentAction.state).toBe("Action_state_fail");
                    expect(currentAction.id).toBe(processedAction.id);

                    console.log("✅ Action correctly marked as failed after timeout");

                    // Optionally check if there are any error details or status information
                    if (
                        currentAction.icrc_112_requests &&
                        currentAction.icrc_112_requests.length > 0
                    ) {
                        console.log(
                            "📋 ICRC-112 requests still present but action marked as failed",
                        );
                    }
                } else {
                    throw new Error("No action found in link response after timeout");
                }
            } else {
                throw new Error(
                    `Failed to get link with action: ${JSON.stringify(linkWithActionResult.Err)}`,
                );
            }
        } catch (error) {
            console.error("❌ Failed to verify timeout behavior:", error);
            throw error;
        }
    });
});
