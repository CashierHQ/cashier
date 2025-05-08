import { FC } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { ChevronDown } from "lucide-react";

type SelectedAssetButtonInfoProps = {
    selectedToken?: FungibleToken | null;
    showInput?: boolean;
};

export const SelectedAssetButtonInfo: FC<SelectedAssetButtonInfoProps> = ({
    selectedToken,
    showInput = true,
}) => {
    if (!selectedToken) {
        return null;
    }

    const amount = TokenUtilService.getHumanReadableAmountFromToken(
        selectedToken.amount ?? 0n,
        selectedToken,
    );

    return (
        <div className="flex font-normal flex-grow items-center">
            <Avatar className="mr-2 w-6 h-6">
                <AvatarImage src={selectedToken.logo} />
                <AvatarFallback>{selectedToken.name}</AvatarFallback>
            </Avatar>
            <div id="asset-info" className="text-left flex gap-3 w-full leading-none items-center">
                <div className="text-[14px] font-normal">{selectedToken.name}</div>
                <ChevronDown
                    color="#36A18B"
                    strokeWidth={2}
                    size={22}
                    className={`${showInput ? "" : "ml-auto"}`}
                />
            </div>
        </div>
    );
};
