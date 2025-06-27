// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserInputAsset, UserInputItem } from "@/stores/linkCreationFormStore";
import { v4 as uuidv4 } from "uuid";
import { LinkDetailModel } from "../types/link.service.types";
import { LINK_STATE, LINK_TYPE } from "../types/enum";
import { LinkDto } from "../../../../declarations/cashier_backend/cashier_backend.did";
import {
    mapLinkDetailModelToLinkDto,
    mapPartialDtoToLinkDetailModel,
    mapUserInputItemToLinkDetailModel,
} from "../types/mapper/link.service.mapper";
import { ResponseLinksModel } from "./link.service";

const LINK_STORAGE_KEY = "cashier_link_storage";
export const LOCAL_lINK_ID_PREFIX = "local_link_";

// Helper function to safely stringify BigInt
const replacer = (key: string, value: any) => {
    // Convert BigInt to a special format that can be parsed later
    if (typeof value === "bigint") {
        return { type: "bigint", value: value.toString() };
    }
    return value;
};

// Helper function to revive BigInt when parsing JSON
const reviver = (key: string, value: any) => {
    // Check if this is our special BigInt format
    if (value && typeof value === "object" && value.type === "bigint") {
        return BigInt(value.value);
    }
    return value;
};

class LinkLocalStorageService {
    private userPid: string;
    constructor(userPid: string) {
        this.userPid = userPid;
    }
    /**
     * Create a local storage link (before sending to backend)
     * @param creator The creator of the link
     * @param initialData Optional initial data for the link
     * @returns Generated local link id
     */
    createLink(): string {
        const linkId = LOCAL_lINK_ID_PREFIX + uuidv4();
        const links = this.getLinks();

        const linkData: LinkDetailModel = {
            id: linkId,
            creator: this.userPid,
            create_at: new Date(),
            state: LINK_STATE.CHOOSE_TEMPLATE,
            title: "",
            linkType: LINK_TYPE.SEND_TIP,
            asset_info: [],
            maxActionNumber: BigInt(0),
            useActionCounter: BigInt(0),
            description: "",
            image: "",
        };

        const linkDto = mapLinkDetailModelToLinkDto(linkData);

        links[linkId] = linkDto;
        this.saveLinks(links);

        return linkId;
    }

    /**
     * Get a link from local storage by ID
     * @param linkId The ID of the link to retrieve
     * @returns The link data or undefined if not found
     */
    getLink(linkId: string): Partial<LinkDto> {
        const links = this.getLinks();
        return links[linkId];
    }

    /**
     * Get all links from local storage as an array
     * @returns ResponseLinksModel containing an array of links
     */
    getLinkList(): ResponseLinksModel {
        const links = this.getLinks();

        // Convert object values to array
        const linkArray = Object.values(links);

        const linkModels = linkArray.map((link) => {
            return {
                link: mapPartialDtoToLinkDetailModel(link),
            };
        });

        return {
            data: linkModels,
            metadata: null,
        };
    }

    /**
     * Update a link in local storage
     * @param linkId The ID of the link to update
     * @param data The data to update
     * @returns True if successful, false if link not found
     */
    updateLink(linkId: string, data: Partial<UserInputItem>): LinkDto {
        const links = this.getLinks();
        if (!links[linkId]) {
            throw new Error("Link not found");
        }

        const updatedlinkModelDetail = mapUserInputItemToLinkDetailModel(data);

        const updatedLinkDto = mapLinkDetailModelToLinkDto(updatedlinkModelDetail);

        links[linkId] = {
            ...updatedLinkDto,
            // always overwrite the id with prefix
            id: linkId,
        };

        this.saveLinks(links);
        return links[linkId];
    }

    /**
     * Delete a link from local storage
     * @param linkId The ID of the link to delete
     * @returns True if successful, false if link not found
     */
    deleteLink(linkId: string): boolean {
        const links = this.getLinks();
        if (!links[linkId]) {
            return false;
        }

        delete links[linkId];
        this.saveLinks(links);
        return true;
    }

    // !Frontend state machine
    /**
     * Determines the next state based on current state and transition direction
     * @param linkId The link id
     * @param data The parital UserInputItem
     * @param isContinue Whether this is a forward transition
     * @returns The next state after the transition
     */
    callUpdateLink(linkId: string, data: Partial<UserInputItem>, isContinue: boolean): LinkDto {
        const link = this.getLink(linkId);
        if (!link) {
            throw new Error("Link not found");
        }

        const currentState = link.state as LINK_STATE;

        const action = isContinue ? "Continue" : "Back";

        // Validate state transition using formatted input
        const isValid = this.validateStateTransition(link, action, data);

        if (!isValid) {
            throw new Error(
                `Invalid state transition from ${currentState} with direction ${isContinue ? "continue" : "back"}`,
            );
        }

        // Determine next state from the state machine
        const nextState = this.getNextState(currentState, isContinue);
        if (!nextState) {
            throw new Error(
                `No valid next state from ${currentState} with direction ${isContinue ? "continue" : "back"}`,
            );
        }

        // Update data with new state
        const updatedData = {
            ...data,
            state: nextState,
        };

        return this.updateLink(linkId, updatedData);
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
    private validateStateTransition(
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
                if (
                    updateLinkInput.maxActionNumber !== undefined &&
                    updateLinkInput.maxActionNumber <= BigInt(0)
                ) {
                    throw new Error("Maximum action count must be greater than zero");
                }

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
    private validateLinkTypeSpecificRequirements(
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
                // - exactly 1 action count
                // - exactly 1 asset
                if (maxActionNumber !== undefined && maxActionNumber !== BigInt(1)) {
                    throw new Error("ReceivePayment links must have exactly 1 action count");
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
    private checkPropsChanged(
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
                        console.log("Title changed");
                        return true;
                    }
                    break;
                case "description":
                    if (
                        userInput.description !== undefined &&
                        userInput.description !== linkDetailModel.description
                    ) {
                        console.log("Description changed");
                        return true;
                    }
                    break;
                case "image":
                    if (
                        userInput.image !== undefined &&
                        userInput.image !== linkDetailModel.image
                    ) {
                        console.log("Image changed");
                        return true;
                    }
                    break;
                case "linkType":
                    if (
                        userInput.linkType !== undefined &&
                        userInput.linkType !== linkDetailModel.linkType
                    ) {
                        console.log("Link type changed");
                        return true;
                    }
                    break;
                case "maxActionNumber":
                    if (
                        userInput.maxActionNumber !== undefined &&
                        userInput.maxActionNumber !== linkDetailModel.maxActionNumber
                    ) {
                        console.log("Max action number changed");
                        return true;
                    }
                    break;
                case "assets":
                    if (!userInput.assets) break;

                    // Compare number of assets
                    if (
                        !linkDetailModel.asset_info ||
                        userInput.assets.length !== linkDetailModel.asset_info.length
                    ) {
                        console.log("Assets changed");
                        return true;
                    }

                    // Compare each asset
                    for (const userAsset of userInput.assets) {
                        const matchingAsset = linkDetailModel.asset_info.find(
                            (asset) => asset.label === userAsset.label,
                        );

                        if (!matchingAsset) return true;

                        // Check if asset properties have changed
                        if (
                            userAsset.address !== matchingAsset.address ||
                            userAsset.chain !== matchingAsset.chain ||
                            userAsset.linkUseAmount !== matchingAsset.amountPerUse
                        ) {
                            console.log("Assets changed");
                            return true;
                        }
                    }
                    break;
            }
        }

        return false;
    }

    /**
     * Validates assets based on link type
     * @param linkType The type of link being created
     * @param assets The assets attached to the link
     * @returns Boolean indicating if assets are valid for this link type
     */
    private validateLinkTypeAssets(
        linkType: string | undefined,
        assets: UserInputAsset[] | undefined,
    ): boolean {
        if (!linkType || !assets || assets.length === 0) {
            return false;
        }

        // Implement link-type specific validation here
        // For example, different link types might require different asset configurations

        switch (linkType) {
            case LINK_TYPE.SEND_TIP:
                // Validate assets for tip links
                return assets.every(
                    (asset) =>
                        asset.address &&
                        asset.linkUseAmount > BigInt(0) &&
                        asset.chain &&
                        asset.label,
                );

            case LINK_TYPE.SEND_AIRDROP:
                // Validate assets for airdrop links
                return assets.every(
                    (asset) =>
                        asset.address &&
                        asset.linkUseAmount > BigInt(0) &&
                        asset.chain &&
                        asset.label,
                );

            default:
                // Default validation for other link types
                return assets.some((asset) => asset.linkUseAmount > BigInt(0));
        }
    }

    /**
     * Determines the next state based on current state and transition direction
     * @param currentState The current state
     * @param isContinue Whether this is a forward transition
     * @returns The next state or undefined if no transition is available
     */
    private getNextState(currentState: LINK_STATE, isContinue: boolean): LINK_STATE | undefined {
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
     * Get all links from local storage
     * @returns Object containing all links
     */
    private getLinks(): Record<string, LinkDto> {
        const localStorageKey = LINK_STORAGE_KEY + "_" + this.userPid;
        const linksJson = localStorage.getItem(localStorageKey);
        if (!linksJson) return {};

        try {
            // Parse with custom reviver to restore BigInt values
            return JSON.parse(linksJson, reviver);
        } catch (error) {
            console.error("Error parsing links from localStorage:", error);
            return {};
        }
    }

    /**
     * Save links to local storage
     * @param links Object containing links to save
     */
    private saveLinks(links: Record<string, LinkDto>): void {
        try {
            // Stringify with custom replacer to handle BigInt values
            const linksJson = JSON.stringify(links, replacer);
            const localStorageKey = LINK_STORAGE_KEY + "_" + this.userPid;
            localStorage.setItem(localStorageKey, linksJson);
        } catch (error) {
            console.error("Error saving links to localStorage:", error);
        }
    }
}

export default LinkLocalStorageService;
