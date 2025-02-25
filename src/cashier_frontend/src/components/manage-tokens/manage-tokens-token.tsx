import { AssetAvatar } from "../ui/asset-avatar";
import Switch from "../ui/switch";

export interface ManageTokensToken {
    name?: string;
    symbol?: string;
    src?: string;
    chainSrc?: string;
    chainSymbol?: string;
}

export function ManageTokensToken({ name, symbol, src, chainSrc, chainSymbol }: ManageTokensToken) {
    return (
        <div className="flex justify-between items-center">
            <div className="flex gap-1.5 items-center">
                <div className="relative">
                    <AssetAvatar src={src} symbol={symbol} className="w-[30px] h-[30px]" />
                    <AssetAvatar
                        src={chainSrc}
                        symbol={chainSymbol}
                        className="w-3 h-3 absolute bottom-0 right-0 translate-y-1/2"
                    />
                </div>

                <div className="flex flex-col">
                    <span>{name ?? symbol ?? "N/A"}</span>
                    <span className="text-grey">{symbol ?? "N/A"}</span>
                </div>
            </div>

            <Switch.Root defaultChecked={true}>
                <Switch.Thumb />
            </Switch.Root>
        </div>
    );
}
