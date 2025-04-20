import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTokens } from "@/hooks/useTokens";
import { FungibleToken } from "@/types/fungible-token.speculative";

interface SelectTokenProps {
    onSelect: (token: FungibleToken) => void;
    selectedToken?: FungibleToken | Partial<FungibleToken> | undefined;
}

export const SelectToken = ({ onSelect, selectedToken }: SelectTokenProps) => {
    const { isLoading, filteredTokenList: filteredTokens } = useTokens();

    const handleValueChange = (value: string) => {
        const token = filteredTokens?.find((t) => t.id === value);

        if (token) {
            onSelect(token);
        }
    };

    if (isLoading) {
        return <Spinner width={26} height={26} />;
    }

    return (
        <Select value={selectedToken?.id} onValueChange={handleValueChange}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Token">
                    {selectedToken && (
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={selectedToken.logo} alt={selectedToken.name} />
                                <AvatarFallback>
                                    {selectedToken.name!.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-normal">{selectedToken.name}</span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {filteredTokens?.map((token) => (
                    <SelectItem key={token.id} value={token.id} className="">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={token.logo} alt={token.name} />
                                <AvatarFallback>
                                    {token.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-normal">{token.name}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
