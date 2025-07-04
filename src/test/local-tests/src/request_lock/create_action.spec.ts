// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
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
} from "../../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable } from "@dfinity/utils";

describe("Create Link Action", () => {
    let actor: _SERVICE;
    let identity: Identity;
    let canisterId: string;
    let createdLink: LinkDto;

    // Fixed seed for consistent testing
    const TEST_IDENTITY_SEED = "test-seed-for-create-link-action-spec-12345";
    const AIRDROP_AMOUNT = "5000"; // 5000 ICP for testing

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

    beforeAll(async () => {
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

    it("should create a link successfully", async () => {
        console.log("Creating test link...");

        const linkInput: CreateLinkInput = {
            title: "Test Link for Action Creation",
            asset_info: [
                {
                    chain: "IC",
                    address: "ryjl3-tyaaa-aaaaa-aaaba-cai", // ICP canister ID
                    label: "SEND_TIP_ASSET",
                    amount_per_link_use_action: BigInt(1_0000_0000), // 0.1 ICP
                },
            ],
            link_type: "SendTip",
            description: ["Test link for creating actions"],
            link_image_url: ["https://example.com/image.png"],
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

            // Handle optional fields properly - they come as arrays from Candid
            expect(fromNullable(createdLink.title)).toBe("Test Link for Action Creation");
            expect(fromNullable(createdLink.link_type)).toBe("SendTip");
            expect(createdLink.state).toBe("Link_state_create_link");

            // Log the actual values for debugging
            console.log("Created link title:", createdLink.title);
            console.log("Created link type:", createdLink.link_type);
            console.log("Created link state:", createdLink.state);
        } else {
            throw new Error(`Failed to create link: ${JSON.stringify(result.Err)}`);
        }
    });

    it("should block multiple calls to create action for the same link", async () => {
        expect(createdLink).toBeDefined();
        console.log("Creating action for link:", createdLink.id);

        const actionInput: CreateActionInput = {
            link_id: createdLink.id,
            action_type: "CreateLink",
        };

        const tasks = Array(4)
            .fill(0)
            .map(async () => {
                const result = await actor.create_action(actionInput);
                return result;
            });

        const results = await Promise.all(tasks);

        // expect only one of the results to be Ok and other should be Err
        expect(results.filter((result) => "Ok" in result).length).toBe(1);
        expect(results.filter((result) => "Err" in result).length).toBe(3);

        // expect the Ok result to be an ActionDto
        const okResult = results.find((result) => "Ok" in result) as { Ok: ActionDto };
        const action = okResult.Ok;
        expect(action).toBeDefined();
        expect(action.id).toBeDefined();
        expect(action.type).toBe("CreateLink");
        expect(action.state).toBe("Action_state_created");

        // expect the Err results to contain error information
        const errResult = results.find((result) => "Err" in result) as { Err: unknown };
        expect(errResult.Err).toBeDefined();
        expect(errResult.Err).toEqual({
            ValidationErrors: expect.stringContaining("Request lock already exists for key:"),
        });
    });

    afterAll(async () => {
        console.log("Tests completed");
        console.log("Test Identity Principal:", identity.getPrincipal().toString());
        console.log("💰 Note: Test identity should now have ICP tokens available for future tests");
    });
});
