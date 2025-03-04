import { generate } from "@/utils/helpers/array";
import { WalletNftCard } from "./nft-card";

const MOCK_NFT_DATA = generate(10, () => ({
    src: "https://fakeimg.pl/300x300",
    name: "NFT placeholder",
}));

export function WalletNftsTab() {
    return (
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
            {MOCK_NFT_DATA.map((props, index) => (
                <WalletNftCard key={index} {...props} />
            ))}
        </div>
    );
}
