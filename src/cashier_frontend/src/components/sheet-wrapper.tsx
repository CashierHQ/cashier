import React from "react";
import { Sheet } from "@/components/ui/sheet";
import AppSidebar from "./app-sidebar";

interface SheetWrapperProps {
    children: React.ReactNode;
}

const SheetWrapper: React.FC<SheetWrapperProps> = ({ children }) => {
    return (
        <Sheet>
            {children}
            <AppSidebar />
        </Sheet>
    );
};

export default SheetWrapper;
