// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
