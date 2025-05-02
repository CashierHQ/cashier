import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getTokenImage } from "@/utils";
import { ICP_LOGO } from "@/const";
import { AssetAvatar } from "../ui/asset-avatar";

export type FeeBreakdownDrawerProps = {
    open?: boolean;
    onClose?: () => void;
    totalFees: number;
    feesBreakdown: {
        name: string;
        amount: string;
        tokenSymbol: string;
        tokenAddress: string;
        usdAmount: string;
    }[];
};

export const FeeBreakdownDrawer: FC<FeeBreakdownDrawerProps> = ({
    open,
    onClose,
    totalFees,
    feesBreakdown,
}) => {
    const { t } = useTranslation();

    return (
        <Drawer open={open}>
            <DrawerContent className="max-w-[400px] mx-auto p-3">
                <DrawerHeader>
                    <DrawerTitle className="flex relative justify-center items-center">
                        <div className="text-center w-[100%] text-[18px] font-semibold">
                            Total fees breakdown
                        </div>
                        <ChevronLeft
                            onClick={onClose}
                            strokeWidth={1.5}
                            className="ml-auto cursor-pointer absolute left-0"
                            size={28}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                <div className="mt-2 light-borders-green px-4 py-4 flex flex-col gap-4">
                    {feesBreakdown.map((fee, index) => (
                        <div key={index} className="">
                            <div className="flex justify-between items-center">
                                <span className="text-[14px] font-normal">{fee.name}</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[14px] font-normal">
                                            {fee.amount} {fee.tokenSymbol}
                                        </span>
                                        <AssetAvatar
                                            src={getTokenImage(fee.tokenAddress) || ICP_LOGO}
                                            symbol={fee.tokenSymbol}
                                            className="w-5 h-5 rounded-full"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <p className="text-[10px] font-normal text-grey/50">
                                    ~{fee.usdAmount}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-2 light-borders-green px-4 py-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[14px] font-normal">Total fees</span>
                        <span className="text-[14px] font-normal">~${totalFees.toFixed(4)}</span>
                    </div>
                </div>

                <Button className="mt-6 py-5" onClick={onClose}>
                    Close
                </Button>
            </DrawerContent>
        </Drawer>
    );
};
