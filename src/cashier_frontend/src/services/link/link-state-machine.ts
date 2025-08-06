// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { UserInputAsset, UserInputItem } from "@/stores/linkCreationFormStore";
import { LINK_STATE, LINK_TYPE } from "../types/enum";
import { LinkDto } from "../../../../declarations/cashier_backend/cashier_backend.did";
import { mapPartialDtoToLinkDetailModel } from "../types/mapper/link.service.mapper";
import { AssetInfoModel } from "../types/link.service.types";

/**
 * Singleton class that handles the state machine logic for link creation flow
 */
export class LinkStateMachine {
    private static instance: LinkStateMachine;

    private constructor() {
        // Private constructor to prevent direct construction calls with the `new` operator
    }

    /**
     * Get the singleton instance of LinkStateMachine
     * @returns The singleton instance
     */
    public static getInstance(): LinkStateMachine {
        if (!LinkStateMachine.instance) {
            LinkStateMachine.instance = new LinkStateMachine();
        }
        return LinkStateMachine.instance;
    }

    /**
     * Determines the next state based on current state and transition direction
     * @param currentState The current state
     * @param isContinue Whether this is a forward transition
     * @returns The next state or undefined if no transition is available
     */
    public getNextState(currentState: LINK_STATE, isContinue: boolean): LINK_STATE | undefined {
        const stateTransitions: Record<
            LINK_STATE,
            { forward?: LINK_STATE; backward?: LINK_STATE }
        > = {
            [LINK_STATE.CHOOSE_TEMPLATE]: {
                forward: LINK_STATE.ADD_ASSET,
            },
            [LINK_STATE.ADD_ASSET]: {
                forward: LINK_STATE.PREVIEW,
                backward: LINK_STATE.CHOOSE_TEMPLATE,
            },
            [LINK_STATE.PREVIEW]: {
                forward: LINK_STATE.CREATE_LINK,
                backward: LINK_STATE.ADD_ASSET,
            },
            [LINK_STATE.CREATE_LINK]: {
                backward: LINK_STATE.PREVIEW,
            },
            // Add other states as needed
            [LINK_STATE.INACTIVE_ENDED]: {},
            // Default states
            [LINK_STATE.INACTIVE]: {},
            [LINK_STATE.ACTIVE]: {},
        };

        const transitions = stateTransitions[currentState];
        if (!transitions) {
            return undefined;
        }

        return isContinue ? transitions.forward : transitions.backward;
    }

    /**
     * Validates if the state transition is allowed based on current link state and action direction.
     * Each state has specific validation rules that must be met before allowing the transition.
     * The method checks various conditions based on the current state and whether the action is 'Continue' or 'Back'.
     * For example, when transitioning from CHOOSE_TEMPLATE, it requires a title and linkType.
     *
     * @param link The current link data stored in local storage
     * @param action The action direction ('Continue' or 'Back')
     * @param updateLinkInput The partial UserInputItem data for the update
     * @returns Boolean indicating if the transition is valid
     * @throws Error with a descriptive message if validation fails
     */
    public validateStateTransition(
        link: Partial<LinkDto>,
        action: string,
        updateLinkInput?: Partial<UserInputItem>,
    ): boolean {
        if (!updateLinkInput) throw new Error("Missing update link input data");

        // CHOOSE_TEMPLATE -> ADD_ASSET
        if (link.state === LINK_STATE.CHOOSE_TEMPLATE) {
            if (action === "Continue") {
                if (!updateLinkInput?.title) {
                    throw new Error("Title is required for this transition");
                }
                if (!updateLinkInput?.linkType) {
                    throw new Error("Link type is required for this transition");
                }

                // For CHOOSE_TEMPLATE state, only title and linkType can change
                const whitelist = ["title", "linkType", "assets"];
                if (this.checkPropsChanged(whitelist, updateLinkInput, link)) {
                    throw new Error("Cannot modify non-whitelisted properties in this state");
                }

                return true;
            }

            throw new Error(`Invalid action ${action} for state ${link.state}`);
        }

        // ADD_ASSET -> PREVIEW
        if (link.state === LINK_STATE.ADD_ASSET) {
            if (action === "Continue") {
                // Validate required fields for this transition
                if (!updateLinkInput?.assets || updateLinkInput.assets.length === 0) {
                    throw new Error("At least one asset is required for this transition");
                }

                if (
                    updateLinkInput.maxActionNumber !== undefined &&
                    updateLinkInput.maxActionNumber <= BigInt(0)
                ) {
                    throw new Error("Maximum action count must be greater than zero");
                }

                // Validate link type specific requirements
                if (updateLinkInput.linkType) {
                    this.validateLinkTypeSpecificRequirements(
                        updateLinkInput.linkType,
                        updateLinkInput.assets,
                        updateLinkInput.maxActionNumber,
                    );
                }
                // For ADD_ASSET state, assets and maxActionNumber can change
                const whitelist = ["assets", "maxActionNumber"];
                if (this.checkPropsChanged(whitelist, updateLinkInput, link)) {
                    throw new Error("Cannot modify non-whitelisted properties in this state");
                }

                return true;
            } else if (action === "Back") {
                // When going back, allow only changing assets and maxActionNumber
                const whitelist = ["assets", "maxActionNumber"];
                if (this.checkPropsChanged(whitelist, updateLinkInput, link)) {
                    throw new Error("Cannot modify non-whitelisted properties when going back");
                }

                return true;
            }

            throw new Error(`Invalid action ${action} for state ${link.state}`);
        }

        if (link.state === LINK_STATE.PREVIEW) {
            if (action === "Continue") {
                // When going to CREATE_LINK, no property changes are allowed
                const whitelist: string[] = [];
                if (this.checkPropsChanged(whitelist, updateLinkInput, link)) {
                    throw new Error("Cannot modify any properties in this state");
                }
                return true;
            } else if (action === "Back") {
                // When going back from PREVIEW, no property changes are allowed
                const whitelist: string[] = [];
                console.log("link ", link);
                console.log("updateLinkInput ", updateLinkInput);

                if (this.checkPropsChanged(whitelist, updateLinkInput, link)) {
                    throw new Error("Cannot modify any properties when going back");
                }
                return true;
            }
        }

        // Default: transition not allowed
        throw new Error(`Invalid state transition from ${link.state}`);
    }

    /**
     * Validates link type specific requirements for assets and action count
     * @param linkType The type of link being created
     * @param assets The assets attached to the link
     * @param maxActionNumber The maximum number of actions allowed for this link
     * @throws Error with a descriptive message if validation fails
     */
    public validateLinkTypeSpecificRequirements(
        linkType: string,
        assets?: UserInputAsset[],
        maxActionNumber?: bigint,
    ): void {
        if (!assets || assets.length === 0) {
            throw new Error("Assets are required for link creation");
        }

        // Validate common asset fields across all link types
        for (let i = 0; i < assets.length; i++) {
            const asset = assets[i];
            if (!asset.address) {
                throw new Error(`Asset ${i + 1} must have an address`);
            }
            if (!asset.chain) {
                throw new Error(`Asset ${i + 1} must have a chain`);
            }
            if (!asset.label) {
                throw new Error(`Asset ${i + 1} must have a label`);
            }
            if (!asset.linkUseAmount || asset.linkUseAmount <= BigInt(0)) {
                throw new Error(`Asset ${i + 1} must have a positive amount per use`);
            }
        }

        switch (linkType) {
            case LINK_TYPE.SEND_TIP:
                // For SendTip:
                // - exactly 1 action count
                // - exactly 1 asset
                if (maxActionNumber !== undefined && maxActionNumber !== BigInt(1)) {
                    throw new Error("SendTip links must have exactly 1 action count");
                }
                if (assets.length !== 1) {
                    throw new Error("SendTip links must have exactly 1 asset");
                }
                break;

            case LINK_TYPE.SEND_AIRDROP:
                // For SendAirdrop:
                // - at least 1 action count
                // - exactly 1 asset
                if (maxActionNumber !== undefined && maxActionNumber < BigInt(1)) {
                    throw new Error("SendAirdrop links must have at least 1 action count");
                }
                if (assets.length !== 1) {
                    throw new Error("SendAirdrop links must have exactly 1 asset");
                }
                break;

            case LINK_TYPE.SEND_TOKEN_BASKET:
                // For SendTokenBasket:
                // - exactly 1 action count
                // - multiple assets (at least 1)
                if (maxActionNumber !== undefined && maxActionNumber !== BigInt(1)) {
                    throw new Error("SendTokenBasket links must have exactly 1 action count");
                }
                if (assets.length < 1) {
                    throw new Error("SendTokenBasket links must have at least 1 asset");
                }
                break;

            case LINK_TYPE.RECEIVE_PAYMENT:
                // For ReceivePayment:
                // - no fixed action count (can be 1 or more)
                // - exactly 1 asset
                if (maxActionNumber !== undefined && maxActionNumber <= BigInt(0)) {
                    throw new Error("ReceivePayment links must have at least 1 action count");
                }
                if (assets.length !== 1) {
                    throw new Error("ReceivePayment links must have exactly 1 asset");
                }
                break;

            default:
                // For other link types, use default validation
                if (maxActionNumber !== undefined && maxActionNumber <= BigInt(0)) {
                    throw new Error("Maximum action count must be greater than zero");
                }
                if (assets.length < 1) {
                    throw new Error("At least one asset is required");
                }
        }
    }

    /**
     * Checks if non-whitelisted properties have changed between a link and new user input
     * @param whitelistProps Array of property names that are allowed to change
     * @param userInput The new user input data
     * @param linkDto The existing link data
     * @returns True if any non-whitelisted property has changed, false otherwise
     */
    public checkPropsChanged(
        whitelistProps: string[],
        userInput: Partial<UserInputItem>,
        linkDto: Partial<LinkDto>,
    ): boolean {
        const propsToCheck = [
            "title",
            "description",
            "assets", // maps to asset_info
            "linkType", // maps to link_type
            "image", // maps to link_image_url
            "maxActionNumber", // maps to link_use_action_max_count
        ].filter((prop) => !whitelistProps.includes(prop));

        // Convert LinkDto to LinkDetailModel for easier comparison
        const linkDetailModel = mapPartialDtoToLinkDetailModel(linkDto);

        for (const prop of propsToCheck) {
            switch (prop) {
                case "title":
                    if (
                        userInput.title !== undefined &&
                        userInput.title !== linkDetailModel.title
                    ) {
                        return true;
                    }
                    break;
                case "description":
                    if (
                        userInput.description !== undefined &&
                        userInput.description !== linkDetailModel.description
                    ) {
                        return true;
                    }
                    break;
                case "assets":
                    // Check if assets have changed using custom comparison for BigInt values
                    if (
                        userInput.assets !== undefined &&
                        !this.compareAssets(userInput.assets, linkDetailModel.asset_info)
                    ) {
                        return true;
                    }
                    break;
                case "linkType":
                    if (
                        userInput.linkType !== undefined &&
                        userInput.linkType !== linkDetailModel.linkType
                    ) {
                        return true;
                    }
                    break;
                case "image":
                    if (
                        userInput.image !== undefined &&
                        userInput.image !== linkDetailModel.image
                    ) {
                        return true;
                    }
                    break;
                case "maxActionNumber":
                    if (
                        userInput.maxActionNumber !== undefined &&
                        userInput.maxActionNumber !== linkDetailModel.maxActionNumber
                    ) {
                        return true;
                    }
                    break;
            }
        }

        return false;
    }

    /**
     * Compares two arrays of assets taking into account BigInt values
     * @param userInputAssets Array of UserInputAsset objects
     * @param assetInfoModels Array of AssetInfoModel objects
     * @returns True if the arrays are equivalent, false otherwise
     */
    private compareAssets(
        userInputAssets: UserInputAsset[] | undefined,
        assetInfoModels: AssetInfoModel[] | undefined,
    ): boolean {
        // Handle undefined cases
        if (!userInputAssets && !assetInfoModels) return true;
        if (!userInputAssets || !assetInfoModels) return false;

        // Check if array lengths match
        if (userInputAssets.length !== assetInfoModels.length) return false;

        // Sort both arrays to ensure consistent comparison
        // We'll sort by address (string) which should be safe to compare
        const sortedUserInputAssets = [...userInputAssets].sort((a, b) =>
            a.address.localeCompare(b.address),
        );
        const sortedAssetInfoModels = [...assetInfoModels].sort((a, b) =>
            a.address.localeCompare(b.address),
        );

        // Compare each asset
        for (let i = 0; i < sortedUserInputAssets.length; i++) {
            const userAsset = sortedUserInputAssets[i];
            const modelAsset = sortedAssetInfoModels[i];

            // Compare address
            if (userAsset.address !== modelAsset.address) return false;

            // Compare chain
            if (userAsset.chain !== modelAsset.chain) return false;

            // Compare label (undefined handling)
            if (userAsset.label !== modelAsset.label) return false;

            // Compare BigInt values (linkUseAmount in UserInputAsset maps to amountPerUse in AssetInfoModel)
            if (userAsset.linkUseAmount.toString() !== modelAsset.amountPerUse.toString())
                return false;
        }

        return true;
    }
}

// Export a singleton instance
export default LinkStateMachine.getInstance();
