// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

export interface WalletNftCardProps {
    src: string;
    name: string;
}

export function WalletNftCard({ src, name }: WalletNftCardProps) {
    return (
        <div className="bg-lightgreen rounded-xl">
            <img className="h-[150px] rounded-xl w-full object-cover" src={src} alt={name} />

            <h3 className="text-xs whitespace-nowrap text-green text-center py-1.5 px-2">{name}</h3>
        </div>
    );
}
