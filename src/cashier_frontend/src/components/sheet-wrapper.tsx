import React, { useState } from "react";
import { Sheet, SheetClose } from "@/components/ui/sheet";
import AppSidebar from "./app-sidebar";

interface SheetWrapperProps {
    children: React.ReactNode;
}

const SheetWrapper: React.FC<SheetWrapperProps> = ({ children }) => {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {children}
            <AppSidebar onClose={() => setOpen(false)} />
        </Sheet>
    );
};

export default SheetWrapper;
