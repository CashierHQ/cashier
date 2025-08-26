// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserInputItem } from "@/stores/linkCreationFormStore";
import { v4 as uuidv4 } from "uuid";
import { LinkDetailModel } from "../types/link.service.types";
import { LINK_STATE, LINK_TYPE } from "../types/enum";
import { LinkDto } from "../../generated/cashier_backend/cashier_backend.did";
import {
  mapLinkDetailModelToLinkDto,
  mapPartialDtoToLinkDetailModel,
  mapUserInputItemToLinkDetailModel,
} from "../types/mapper/link.service.mapper";
import { ResponseLinksModel } from "./link.service";
import linkStateMachine from "./link-state-machine";
import { LinkStateMachine } from "./link-state-machine";

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

/**
 * V2 implementation of LinkLocalStorageService that uses the LinkStateMachine
 * for handling state transitions
 */
class LinkLocalStorageServiceV2 {
  private userPid: string;
  private stateMachine: LinkStateMachine;

  /**
   *
   * @param userPid The user's unique identifier
   * @param stateMachine Optional LinkStateMachine instance
   */
  constructor(
    userPid: string,
    stateMachine: LinkStateMachine = linkStateMachine,
  ) {
    this.userPid = userPid;
    this.stateMachine = stateMachine;
  }

  /**
   * Create a local storage link (before sending to backend)
   * @returns Generated local link id
   */
  createLink(): string {
    // Use UUID for unique identifier
    const linkId = LOCAL_lINK_ID_PREFIX + uuidv4();
    // TODO: remove after get rid of backend for create link
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

    console.log("Link created with ID:", linkId);

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
   * @returns The updated LinkDto
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

  /**
   * Determines the next state based on current state and transition direction
   * Using the LinkStateMachine for state transitions
   * @param linkId The link id
   * @param data The parital UserInputItem
   * @param isContinue Whether this is a forward transition
   * @returns The next state after the transition
   */
  callUpdateLink(
    linkId: string,
    data: Partial<UserInputItem>,
    isContinue: boolean,
  ): LinkDto {
    const link = this.getLink(linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    const currentState = link.state as LINK_STATE;

    const action = isContinue ? "Continue" : "Back";

    // Validate state transition using the state machine
    const isValid = this.stateMachine.validateStateTransition(
      link,
      action,
      data,
    );

    if (!isValid) {
      throw new Error(
        `Invalid state transition from ${currentState} with direction ${isContinue ? "continue" : "back"}`,
      );
    }

    // Determine next state from the state machine
    const nextState = this.stateMachine.getNextState(currentState, isContinue);
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
   * Get all links from local storage
   * @returns Object containing all links
   */
  private getLinks(): Record<string, LinkDto> {
    const localStorageKey = LINK_STORAGE_KEY + "_" + this.userPid;
    const linksJson = localStorage.getItem(localStorageKey);
    if (!linksJson) return {};

    try {
      return JSON.parse(linksJson, reviver);
    } catch (error) {
      console.error("Error parsing links from local storage:", error);
      return {};
    }
  }

  /**
   * Save links to local storage
   * @param links Object containing links to save
   */
  private saveLinks(links: Record<string, LinkDto>): void {
    try {
      const localStorageKey = LINK_STORAGE_KEY + "_" + this.userPid;
      localStorage.setItem(localStorageKey, JSON.stringify(links, replacer));
    } catch (error) {
      console.error("Error saving links to local storage:", error);
    }
  }
}

export default LinkLocalStorageServiceV2;
