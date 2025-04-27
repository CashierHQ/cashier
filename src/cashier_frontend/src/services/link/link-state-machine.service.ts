import { Identity } from "@dfinity/agent";
import LinkService from "./link.service";
import LinkLocalStorageService, { lINK_ID_PREFIX } from "./linkLocalStorage.service";
import { LINK_STATE } from "../types/enum";
import { UserInputItem } from "@/stores/linkCreationFormStore";
import { LinkModel } from "../types/link.service.types";
import { MapLinkToLinkDetailModel } from "../types/mapper/link.service.mapper";

export class LinkStateMachine {
    private linkService: LinkService;
    private linkLocalStorageService: LinkLocalStorageService;

    // Define the order of states
    private static readonly STATE_ORDER: string[] = [
        LINK_STATE.CHOOSE_TEMPLATE,
        LINK_STATE.ADD_ASSET,
        LINK_STATE.PREVIEW,
        LINK_STATE.CREATE_LINK,
        LINK_STATE.ACTIVE,
        LINK_STATE.INACTIVE,
        LINK_STATE.INACTIVE_ENDED,
    ];

    constructor(identity?: Identity) {
        this.linkService = new LinkService(identity);
        this.linkLocalStorageService = new LinkLocalStorageService();
    }

    /**
     * Thia method create a link in local storage and returns the link ID
     */
    async createLink(creator_pid: string) {
        return this.linkLocalStorageService.createLink(creator_pid);
    }

    /**
     * Updates link state in both local storage and backend if available
     * @param linkId The ID of the link to update
     * @param data The data to update
     * @param isContinue Whether this is a forward transition
     * @returns Promise resolving to success status
     */
    async updateLink(linkId: string, data: Partial<UserInputItem>, isContinue: boolean) {
        // Get the current link to determine its state
        const currentLink = await this.getLink(linkId);

        if (!currentLink) {
            throw new Error("Link not found");
        }

        const currentState = currentLink.link?.state;

        if (!currentState) {
            throw new Error("currentState is undefined");
        }

        // Determine the next state based on current state and direction
        let nextState = currentState;

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
            // Other states don't have backward transitions
        }

        // TODO: call frontend if state = CHOOSE_TEMPLATE, ADD_ASSET, PREVIEW
        if (linkId.startsWith(lINK_ID_PREFIX)) {
            const updatedLink = this.linkLocalStorageService.updateLink(linkId, data, nextState);

            return updatedLink;
        }

        // PREVIEW -> CREATE_LINK call create link

        // TODO: call backend if state = CREATE_LINK, ACTIVE, INACTIVE, INACTIVE_ENDED

        const linkDto = await this.linkService.updateLink(linkId, data, isContinue);
        console.log("🚀 ~ [LinkStateMachine] linkDto:", linkDto);

        const linkDetail = MapLinkToLinkDetailModel(linkDto);

        return {
            link: linkDetail,
        };
    }

    /**
     * Gets link data from backend or falls back to local storage
     * @param linkId The ID of the link to retrieve
     * @returns Promise resolving to link data
     */
    public async getLink(linkId: string): Promise<Partial<LinkModel>> {
        if (linkId.startsWith(lINK_ID_PREFIX)) {
            return this.linkLocalStorageService.getLink(linkId);
        }

        return this.linkService.getLink(linkId);
    }
}
