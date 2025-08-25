// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { parseResultResponse } from "@/utils";
import { Actor, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { BACKEND_CANISTER_ID } from "@/const";
import {
  _SERVICE,
  idlFactory,
} from "../generated/cashier_backend/cashier_backend.did";
import { getAgent } from "@/utils/agent";

class UserService {
  private actor: _SERVICE;

  constructor(identity?: Identity | PartialIdentity | undefined) {
    const agent = getAgent(identity);
    this.actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
    });
  }

  async createUser() {
    const response = parseResultResponse(await this.actor.create_user());
    return response;
  }

  async getUser() {
    const response = parseResultResponse(await this.actor.get_user());
    return response;
  }
}

export default UserService;
