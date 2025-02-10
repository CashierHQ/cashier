import { icExplorerService, UserToken } from "../icExplorer.service";
import { ITokenProviderService } from "./ITokenProviderService";

export class IcExplorerTokenProviderService implements ITokenProviderService {
    async getUserTokens(walletAddress: string): Promise<UserToken[]> {
        const { data } = await icExplorerService.getUserTokens({
            principal: walletAddress,
            isDesc: true,
            page: 1,
            size: 100,
        });

        return data.list as UserToken[];
    }
}
