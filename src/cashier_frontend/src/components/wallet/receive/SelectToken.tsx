import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Token {
    id: string;
    symbol: string;
    icon: string;
    isSelected?: boolean;
}

interface SelectTokenProps {
    onSelect: (token: Token) => void;
    selectedToken?: Token;
}

const defaultTokens: Token[] = [
    {
        id: "icp",
        symbol: "ICP",
        icon: "/assets/icp-logo.svg",
    },
    {
        id: "btc",
        symbol: "BTC",
        icon: "/assets/btc-logo.svg",
    },
    {
        id: "eth",
        symbol: "ETH",
        icon: "/assets/eth-logo.svg",
    },
];

export const SelectToken = ({ onSelect, selectedToken }: SelectTokenProps) => {
    const handleValueChange = (value: string) => {
        const token = defaultTokens.find((t) => t.id === value);
        if (token) {
            onSelect(token);
        }
    };

    return (
        <Select value={selectedToken?.id} onValueChange={handleValueChange}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Token">
                    {selectedToken && (
                        <div className="flex items-center">
                            <img
                                src={selectedToken.icon}
                                alt={selectedToken.symbol}
                                className="w-6 h-6 mr-2"
                            />
                            <span>{selectedToken.symbol}</span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {defaultTokens.map((token) => (
                    <SelectItem key={token.id} value={token.id} className="flex items-center py-3">
                        <div className="flex items-center">
                            <img src={token.icon} alt={token.symbol} className="w-6 h-6 mr-2" />
                            <span>{token.symbol}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
