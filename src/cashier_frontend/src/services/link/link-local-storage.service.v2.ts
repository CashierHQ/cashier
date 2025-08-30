// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserInputItem } from "@/stores/linkCreationFormStore";
import { v4 as uuidv4 } from "uuid";
import { LinkDetailModel } from "../types/link.service.types";
import { LINK_STATE, LINK_TYPE } from "../types/enum";
import {
  mapLinkDetailModelToLinkDto,
  mapUserInputItemToLinkDetailModel,
} from "../types/mapper/link.service.mapper";
import { ResponseLinksModel } from "./link.service";
import linkStateMachine from "./link-state-machine";
import { LinkStateMachine } from "./link-state-machine";
import { Principal } from "@dfinity/principal";
import { LinkDto } from "@/generated/cashier_backend/cashier_backend.did";

const LINK_STORAGE_KEY = "cashier_link_storage";
export const LOCAL_lINK_ID_PREFIX = "local_link_";

// Helper to get current time in nanoseconds as bigint
export const nowInNanoseconds = (): bigint => BigInt(Date.now()) * 1_000_000n;

// Helper function to safely stringify BigInt and Principal and Date
const replacer = (key: string, value: any) => {
  if (typeof value === "bigint") {
    return { type: "bigint", value: value.toString() };
  }
  if (value instanceof Principal) {
    return { type: "principal", value: value.toText() };
  }
  if (value instanceof Date) {
    return { type: "date", value: value.toISOString() };
  }
  return value;
};

// Helper function to revive BigInt, Principal and Date when parsing JSON
const reviver = (key: string, value: any) => {
  if (value && typeof value === "object" && value.type === "bigint") {
    return BigInt(value.value);
  }
  if (value && typeof value === "object" && value.type === "principal") {
    return Principal.fromText(value.value);
  }
  if (value && typeof value === "object" && value.type === "date") {
    return new Date(value.value);
  }
  return value;
};

/**
 * V2 implementation of LinkLocalStorageService that uses the LinkStateMachine
 * for handling state transitions — storage uses LinkDetailModel end-to-end.
 */
class LinkLocalStorageServiceV2 {
  private userPid: string;
  private stateMachine: LinkStateMachine;

  constructor(
    userPid: string,
    stateMachine: LinkStateMachine = linkStateMachine,
  ) {
    this.userPid = userPid;
    this.stateMachine = stateMachine;
  }

  /** Create a local storage link (before sending to backend) */
  createLink(): string {
    const linkId = LOCAL_lINK_ID_PREFIX + uuidv4();
    const links = this.getLinks();

    const linkData: LinkDetailModel = {
      id: linkId,
      creator: this.userPid,
      create_at: new Date().getTime() * 1_000_000, // store as nanoseconds
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

    console.log("Link created with ID:", linkId);
    return linkId;
  }

  /** Get a link from local storage by ID */
  getLink(linkId: string): LinkDetailModel {
    const links = this.getLinks();
    return links[linkId];
  }

  /** Get all links from local storage as an array */
  getLinkList(): ResponseLinksModel {
    const links = this.getLinks();
    const linkArray = Object.values(links) as LinkDetailModel[];
    const linkModels = linkArray.map((link) => ({ link }));
    return { data: linkModels, metadata: null };
  }

  /** Update a link in local storage */
  updateLink(
    linkId: string,
    data: Partial<UserInputItem>,
    caller: string,
  ): LinkDto {
    const links = this.getLinks();
    if (!links[linkId]) throw new Error("Link not found");

    const updatedlinkModelDetail = mapUserInputItemToLinkDetailModel(data);
    const existing = links[linkId];

    const composed: LinkDetailModel = {
      ...existing,
      ...updatedlinkModelDetail,
      creator: caller,
      id: linkId,
      create_at: existing.create_at || new Date().getTime() * 1_000_000, // store as nanoseconds
    };

    links[linkId] = composed;
    this.saveLinks(links);

    return mapLinkDetailModelToLinkDto(composed);
  }

  /** Delete a link from local storage */
  deleteLink(linkId: string): boolean {
    const links = this.getLinks();
    if (!links[linkId]) return false;
    delete links[linkId];
    this.saveLinks(links);
    return true;
  }

  /** Use state machine to compute and apply state transition */
  callUpdateLink(
    linkId: string,
    data: Partial<UserInputItem>,
    isContinue: boolean,
    caller: string,
  ): LinkDto {
    const link = this.getLink(linkId);
    if (!link) throw new Error("Link not found");
    if (!link.state) throw new Error("Link state is undefined");

    const currentState = link.state;
    const action = isContinue ? "Continue" : "Back";
    const isValid = this.stateMachine.validateStateTransition(
      link as Partial<LinkDetailModel>,
      action,
      data,
    );

    if (!isValid) {
      throw new Error(
        `Invalid state transition from ${currentState} with direction ${isContinue ? "continue" : "back"}`,
      );
    }

    const nextState = this.stateMachine.getNextState(currentState, isContinue);
    if (!nextState) {
      throw new Error(`No valid next state from ${currentState}`);
    }

    const updatedData = { ...data, state: nextState };
    return this.updateLink(linkId, updatedData, caller);
  }

  /** Read links from localStorage (stored as LinkDetailModel) */
  private getLinks(): Record<string, LinkDetailModel> {
    const localStorageKey = LINK_STORAGE_KEY + "_" + this.userPid;
    const linksJson = localStorage.getItem(localStorageKey);
    if (!linksJson) return {};

    try {
      const stored = JSON.parse(linksJson, reviver) as Record<string, any>;
      const result: Record<string, LinkDetailModel> = {};
      Object.entries(stored).forEach(([id, obj]) => {
        result[id] = obj as LinkDetailModel;
      });
      return result;
    } catch (error) {
      console.error("Error parsing links from local storage:", error);
      return {};
    }
  }

  /** Save links to localStorage */
  private saveLinks(links: Record<string, LinkDetailModel>): void {
    try {
      const localStorageKey = LINK_STORAGE_KEY + "_" + this.userPid;
      localStorage.setItem(localStorageKey, JSON.stringify(links, replacer));
    } catch (error) {
      console.error("Error saving links to local storage:", error);
    }
  }
}

export default LinkLocalStorageServiceV2;
