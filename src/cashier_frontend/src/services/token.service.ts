import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/token_storage";
import {
    _SERVICE,
    AddTokenInput,
    RemoveTokenInput,
    UserPreference,
    UserPreferenceInput,
    UserTokenDto,
} from "../../../declarations/token_storage/token_storage.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IC_HOST, TOKEN_STORAGE_CANISTER_ID } from "@/const";

class TokenService {
    private actor: _SERVICE;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.actor = createActor(TOKEN_STORAGE_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: IC_HOST }),
        });
    }

    async listTokens(): Promise<UserTokenDto[]> {
        const response = parseResultResponse(await this.actor.list_tokens());
        return response;
    }

    async getUserPreference(): Promise<UserPreference> {
        const response = parseResultResponse(await this.actor.get_user_preference());
        return response;
    }

    async addToken(input: AddTokenInput): Promise<void> {
        parseResultResponse(await this.actor.add_token(input));
    }

    async removeToken(input: RemoveTokenInput): Promise<void> {
        parseResultResponse(await this.actor.remove_token(input));
    }

    async updateUserPreference(input: UserPreferenceInput): Promise<void> {
        parseResultResponse(await this.actor.update_user_preference(input));
    }
}

export default TokenService;
