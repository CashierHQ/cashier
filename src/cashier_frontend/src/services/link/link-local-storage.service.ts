/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserInputItem } from "@/stores/linkCreationFormStore";
// import { v4 as uuidv4 } from "uuid";
import { LinkDetailModel } from "../types/link.service.types";
import { LINK_STATE, LINK_TYPE } from "../types/enum";
import { LinkDto } from "../../../../declarations/cashier_backend/cashier_backend.did";
import {
    mapLinkDetailModelToLinkDto,
    MapLinkToLinkDetailModel,
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
    /**
     * Create a local storage link (before sending to backend)
     * @param creator The creator of the link
     * @param initialData Optional initial data for the link
     * @returns Generated local link id
     */
    createLink(creator: string, linkId?: string): string {
        // Use UUIDv7 for better B-tree performance
        // const linkId = lINK_ID_PREFIX + uuidv4();
        // TODO: remove after get rid of backend for create link
        const tempId = LOCAL_lINK_ID_PREFIX + linkId;
        const links = this.getLinks();

        const linkData: LinkDetailModel = {
            id: tempId,
            creator: creator,
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

        links[tempId] = linkDto;
        this.saveLinks(links);

        return tempId;
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
                link: MapLinkToLinkDetailModel(link),
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

        console.log("🚀 ~  updatedLinkDto:", updatedLinkDto);

        links[linkId] = updatedLinkDto;

        console.log("🚀 ~  links[linkId]", links[linkId]);

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

    /**
     * Determines the next state based on current state and transition direction
     * @param linkId The link id
     * @param data The parital UserInputItem
     * @param isContinue Whether this is a forward transition
     * @returns The next state after the transition
     */
    updateStateMachine(linkId: string, data: Partial<UserInputItem>, isContinue: boolean): LinkDto {
        const link = this.getLink(linkId);
        if (!link) {
            throw new Error("Link not found");
        }
        const currentState = link.state;
        let nextState: LINK_STATE | undefined = currentState as LINK_STATE;
        // Handle state transitions using if-else logic
        if (isContinue) {
            // Forward transitions
            if (currentState === LINK_STATE.CHOOSE_TEMPLATE) {
                nextState = LINK_STATE.ADD_ASSET;
            } else if (currentState === LINK_STATE.ADD_ASSET) {
                nextState = LINK_STATE.PREVIEW;
            }
            // INACTIVE_ENDED has no forward transition
        } else {
            // Backward transitions
            if (currentState === LINK_STATE.ADD_ASSET) {
                nextState = LINK_STATE.CHOOSE_TEMPLATE;
            } else if (currentState === LINK_STATE.PREVIEW) {
                nextState = LINK_STATE.ADD_ASSET;
            } else if (currentState === LINK_STATE.CREATE_LINK) {
                nextState = LINK_STATE.PREVIEW;
            }
        }

        data = {
            ...data,
            state: nextState,
        };

        return this.updateLink(linkId, data);
    }

    /**
     * Get all links from local storage
     * @returns Object containing all links
     */
    private getLinks(): Record<string, LinkDto> {
        const linksJson = localStorage.getItem(LINK_STORAGE_KEY);
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
            localStorage.setItem(LINK_STORAGE_KEY, linksJson);
        } catch (error) {
            console.error("Error saving links to localStorage:", error);
        }
    }
}

export default LinkLocalStorageService;
