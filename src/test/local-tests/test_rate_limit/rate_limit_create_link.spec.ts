// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/**
 * Rate Limit Create Link Test
 *
 * This test verifies that the rate limiting service properly enforces the limit of
 * 5 create_link requests per 10 minutes for a single user principal.
 *
 * To run this test:
 * 1. Make sure you have a local DFX replica running: `dfx start --clean --background`
 * 2. Set up the test environment: `bash src/test/scripts/setup.sh`
 * 3. Run the test: `npx jest src/test/local-tests/test_rate_limiter/rate_limit_create_link.spec.ts`
 *
 * Or use the Makefile: `make test-request-lock`
 *
 * The test will:
 * - Create 5 links successfully (within rate limit)
 * - Attempt to create a 6th link and verify it gets rate limited
 * - Verify the error message format includes proper rate limit information
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { execSync } from "child_process";
import * as path from "path";
import {
    _SERVICE,
    idlFactory,
    CreateLinkInput,
    LinkDto,
} from "../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable } from "@dfinity/utils";

describe("Rate Limit Create Link Test", () => {
    let actor: _SERVICE;
    let identity: Identity;
    let canisterId: string;
    const createdLinks: LinkDto[] = [];

    // Fixed seed for consistent testing
    const TEST_IDENTITY_SEED = "test-seed-for-rate-limit-create-link-spec-67890";
    const AIRDROP_AMOUNT = "10000"; // 10000 ICP for testing multiple link creations

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

    // Helper function to create a link and handle both success and failure cases
    const attemptCreateLink = async (
        linkIndex: number,
        expectSuccess: boolean = true,
    ): Promise<LinkDto | string> => {
        const linkInput: CreateLinkInput = {
            title: `Rate Limit Test Link ${linkIndex}`,
            asset_info: [
                {
                    chain: "IC",
                    address: "ryjl3-tyaaa-aaaaa-aaaba-cai", // ICP canister ID
                    label: "SEND_TIP_ASSET",
                    amount_per_link_use_action: BigInt(1_0000_0000), // 0.1 ICP
                },
            ],
            link_type: "SendTip",
            description: [`Test link ${linkIndex} for rate limiting create_link`],
            link_image_url: ["https://example.com/image.png"],
            template: "Central",
            link_use_action_max_count: BigInt(1),
            nft_image: [],
        };

        const result = await actor.create_link(linkInput);
        expect(result).toBeDefined();

        if (expectSuccess) {
            expect("Ok" in result).toBe(true);
            if ("Ok" in result) {
                const createdLink = result.Ok;
                console.log(`✅ Link ${linkIndex} created successfully with ID:`, createdLink.id);
                expect(createdLink.id).toBeDefined();
                expect(fromNullable(createdLink.title)).toBe(`Rate Limit Test Link ${linkIndex}`);
                expect(fromNullable(createdLink.link_type)).toBe("SendTip");
                expect(createdLink.state).toBe("Link_state_create_link");
                return createdLink;
            }
        } else {
            expect("Err" in result).toBe(true);
            if ("Err" in result && "HandleLogicError" in result.Err) {
                const errorMessage = result.Err.HandleLogicError;
                console.log(`🚫 Link ${linkIndex} properly rate limited:`, errorMessage);
                expect(errorMessage).toContain("Rate limit exceeded");
                expect(errorMessage).toContain("create_link");
                expect(errorMessage).toContain("5 requests per 10 minutes");
                return errorMessage;
            }
        }

        throw new Error(`Unexpected result for link ${linkIndex}: ${JSON.stringify(result)}`);
    };

    beforeAll(async () => {
        console.log("🚀 Setting up rate limit create link test...");

        // Create fixed test identity using predefined seed
        // Convert string seed to Uint8Array
        const seedBytes = new TextEncoder().encode(TEST_IDENTITY_SEED);
        const seed = new Uint8Array(32); // Ed25519 requires 32 bytes
        seed.set(seedBytes.slice(0, 32)); // Take first 32 bytes

        identity = Ed25519KeyIdentity.generate(seed);

        const principalId = identity.getPrincipal().toString();
        console.log("Test Identity Principal:", principalId);

        // Run airdrop to ensure test identity has sufficient funds
        console.log("🪂 Setting up test funds...");
        await runAirdrop(principalId, AIRDROP_AMOUNT);

        // Set up canister ID (you may need to adjust this based on your local setup)
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

    afterAll(async () => {
        console.log("Rate limit create link tests completed");
        console.log("Test Identity Principal:", identity.getPrincipal().toString());
        console.log(`Created ${createdLinks.length} links during testing`);
        console.log(
            "💰 Note: Test identity should now have remaining ICP tokens available for future tests",
        );
    });

    it("should successfully create links up to the rate limit (5 within 10 minutes)", async () => {
        console.log("🔄 Testing successful link creation up to rate limit...");

        // Create 5 links successfully (this is the rate limit)
        for (let i = 1; i <= 5; i++) {
            console.log(`Creating link ${i}/5...`);

            const start = Date.now();
            const link = (await attemptCreateLink(i, true)) as LinkDto;
            const end = Date.now();

            createdLinks.push(link);

            console.log(`✅ Link ${i} created in ${end - start}ms`);

            // Add a small delay between requests to be realistic
            if (i < 5) {
                await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
            }
        }

        expect(createdLinks).toHaveLength(5);
        console.log("✅ Successfully created 5 links within rate limit");
    });

    it("should reject the 6th link creation due to rate limiting", async () => {
        console.log("🚫 Testing rate limit enforcement on 6th request...");

        console.log("Attempting to create 6th link (should be rate limited)...");

        const start = Date.now();
        const errorMessage = (await attemptCreateLink(6, false)) as string;
        const end = Date.now();

        console.log(`Rate limit check completed in ${end - start}ms`);
        console.log("✅ Rate limit properly enforced with correct error message");
        console.log("Error message:", errorMessage);
    });

    it("should show proper error format with user principal and timing information", async () => {
        console.log("🔍 Testing error message format and content...");

        // Try to create another link (should still be rate limited)
        const errorMessage = (await attemptCreateLink(7, false)) as string;

        // The error should contain the user principal ID
        const userPrincipal = identity.getPrincipal().toString();
        expect(errorMessage).toContain(userPrincipal);
        expect(errorMessage).toContain("Try again after");
        expect(errorMessage).toContain("ms");

        console.log("✅ Error message format is correct and contains all expected information");
        console.log("User Principal:", userPrincipal);
        console.log("Full error message:", errorMessage);
    });

    it("should show rate limit statistics", async () => {
        console.log("📊 Displaying rate limit test statistics...");

        const userPrincipal = identity.getPrincipal().toString();

        console.log("=== Rate Limit Test Summary ===");
        console.log(`User Principal: ${userPrincipal}`);
        console.log(`Successful link creations: ${createdLinks.length}`);
        console.log(`Rate limit: 5 requests per 10 minutes`);
        console.log(`Test duration: Completed within rate limit window`);
        console.log("===");

        // Verify we created exactly the expected number of links
        expect(createdLinks).toHaveLength(5);

        // All created links should have valid IDs and correct properties
        createdLinks.forEach((link, index) => {
            expect(link.id).toBeDefined();
            expect(link.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            ); // UUID format
            expect(fromNullable(link.title)).toBe(`Rate Limit Test Link ${index + 1}`);
            expect(fromNullable(link.link_type)).toBe("SendTip");
            expect(link.state).toBe("Link_state_create_link");

            console.log(`Link ${index + 1}: ${link.id} - ${fromNullable(link.title)}`);
        });

        console.log("✅ All created links have valid properties");
    });
});
