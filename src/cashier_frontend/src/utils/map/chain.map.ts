import { Chain } from "@/services/types/link.service.types";

const chainNameMap: { [key in Chain]: string } = {
    [Chain.IC]: "Internet Computer",
};

export function mapChainToPrettyName(chain: Chain): string {
    return chainNameMap[chain];
}
