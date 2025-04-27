/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserInputItem } from "@/stores/linkCreationFormStore";
import { v4 as uuidv4 } from "uuid";
import { LinkDetailModel, LinkModel } from "../types/link.service.types";
import { LINK_STATE, LINK_TYPE } from "../types/enum";

const LINK_STORAGE_KEY = "cashier_link_storage";
export const lINK_ID_PREFIX = "local_link_";

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
    createLink(creator: string): string {
        // Use UUIDv7 for better B-tree performance
        const linkId = lINK_ID_PREFIX + uuidv4();
        const links = this.getLinks();

        const linkData: LinkDetailModel = {
            id: linkId,
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

        links[linkId] = linkData;
        this.saveLinks(links);

        return linkId;
    }

    /**
     * Get a link from local storage by ID
     * @param linkId The ID of the link to retrieve
     * @returns The link data or undefined if not found
     */
    getLink(linkId: string): Partial<LinkModel> {
        const links = this.getLinks();
        return {
            link: links[linkId] as LinkDetailModel,
        };
    }

    /**
     * Update a link in local storage
     * @param linkId The ID of the link to update
     * @param data The data to update
     * @returns True if successful, false if link not found
     */
    updateLink(linkId: string, data: Partial<UserInputItem>, state?: string): Partial<LinkModel> {
        const links = this.getLinks();
        if (!links[linkId]) {
            throw new Error("Link not found");
        }

        // Convert any BigInt in data to our special format for storage
        const preparedData = JSON.parse(JSON.stringify(data, replacer));

        links[linkId] = {
            ...links[linkId],
            ...preparedData,
            ...(state && { state }),
        };

        this.saveLinks(links);
        return {
            link: links[linkId] as LinkDetailModel,
        };
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
     * Get all links from local storage
     * @returns Object containing all links
     */
    private getLinks(): Record<string, Partial<LinkDetailModel>> {
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
    private saveLinks(links: Record<string, Partial<LinkDetailModel>>): void {
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
