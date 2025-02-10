import { UserToken } from "../icExplorer.service";

export interface ITokenProviderService {
    getUserTokens(walletAddress: string): Promise<UserToken[]>;
}
