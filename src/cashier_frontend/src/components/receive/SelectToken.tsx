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
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTokens } from "@/hooks/useTokens";
import { FungibleToken } from "@/types/fungible-token.speculative";

interface SelectTokenProps {
    onSelect: (token: FungibleToken) => void;
    selectedToken?: FungibleToken | Partial<FungibleToken> | undefined;
}

export const SelectToken = ({ onSelect, selectedToken }: SelectTokenProps) => {
    const { isLoading, getDisplayTokens } = useTokens();

    const handleValueChange = (value: string) => {
        const token = getDisplayTokens()?.find((t) => t.id === value);

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
                {getDisplayTokens()?.map((token) => (
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
