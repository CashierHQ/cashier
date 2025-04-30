import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { IoIosClose } from "react-icons/io";
import Menu from "./asset-menu";
import { FungibleToken } from "@/types/fungible-token.speculative";

interface AssetDrawerProps {
    open: boolean;
    title: string;
    assetList: FungibleToken[];
    handleClose: () => void;
    handleChange: (val: string) => void;
}

const AssetDrawer: React.FC<AssetDrawerProps> = ({
    open,
    title,
    handleClose,
    handleChange,
    assetList,
}) => {
    return (
        <Drawer open={open} onClose={handleClose}>
            <DrawerContent className="max-w-[400px] max-h-full mx-auto p-3 flex flex-col">
                <DrawerHeader>
                    <DrawerTitle className="flex justify-center">
                        <div className="text-center w-[100%]">{title}</div>
                        <IoIosClose
                            onClick={handleClose}
                            className="ml-auto cursor-pointer"
                            size={32}
                        />
                    </DrawerTitle>
                </DrawerHeader>
                <div className="font-semibold mb-3">Your asset</div>
                <div className="flex-1 overflow-y-auto">
                    <Menu assetList={assetList} onSelect={handleChange} />
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default AssetDrawer;
