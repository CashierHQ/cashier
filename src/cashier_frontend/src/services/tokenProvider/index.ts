import { DevTokenProviderService } from "./devTokenProvider.service";
import { IcExplorerTokenProviderService } from "./icExplorerTokenProvider.service";
import { ITokenProviderService } from "./ITokenProviderService";

export const TokenProviderService: ITokenProviderService =
    import.meta.env.MODE === "production"
        ? new IcExplorerTokenProviderService()
        : new DevTokenProviderService();
