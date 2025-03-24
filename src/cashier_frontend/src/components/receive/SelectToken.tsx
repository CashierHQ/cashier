import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useUserAssets } from "@/components/link-details/tip-link-asset-form.hooks";
import { Spinner } from "@/components/ui/spinner";
import { AssetSelectItem } from "@/components/asset-select";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SelectTokenProps {
    onSelect: (token: AssetSelectItem) => void;
    selectedToken?: AssetSelectItem;
}

export const SelectToken = ({ onSelect, selectedToken }: SelectTokenProps) => {
    const { isLoadingAssets, assets: tokenList } = useUserAssets();

    const handleValueChange = (value: string) => {
        const token = tokenList?.find((t) => t.tokenAddress === value);
        if (token) {
            onSelect(token);
        }
    };

    if (isLoadingAssets) {
        return <Spinner width={26} height={26} />;
    }

    return (
        <Select value={selectedToken?.tokenAddress} onValueChange={handleValueChange}>
            <SelectTrigger className="w-full py-6">
                <SelectValue placeholder="Select Token">
                    {selectedToken && (
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage
                                    src={`${IC_EXPLORER_IMAGES_PATH}${selectedToken.tokenAddress.toLowerCase()}`}
                                    alt={selectedToken.name}
                                />
                                <AvatarFallback>
                                    {selectedToken.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{selectedToken.name}</span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {tokenList?.map((token) => (
                    <SelectItem
                        key={token.tokenAddress}
                        value={token.tokenAddress}
                        className="py-3"
                    >
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage
                                    src={`${IC_EXPLORER_IMAGES_PATH}${token.tokenAddress.toLowerCase()}`}
                                    alt={token.name}
                                />
                                <AvatarFallback>
                                    {token.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{token.name}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
