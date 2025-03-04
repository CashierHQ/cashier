import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { Chain } from "@/services/types/link.service.types";

const chainNameMap: { [key in Chain]: string } = {
    [Chain.IC]: "Internet Computer",
};

export function mapChainToPrettyName(chain: Chain): string {
    return chainNameMap[chain];
}

const chainLogoMap: { [key in Chain]: string } = {
    [Chain.IC]: `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`,
};

export function mapChainToLogo(chain: Chain): string {
    return chainLogoMap[chain];
}
