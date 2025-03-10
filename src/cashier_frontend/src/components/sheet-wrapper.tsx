import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import AppSidebar from "./app-sidebar";
import { Dialog, DialogContent, DialogDescription } from "@radix-ui/react-dialog";

interface SheetWrapperProps {
    children: React.ReactNode;
}

const SheetWrapper: React.FC<SheetWrapperProps> = ({ children }) => {
    const [openDocumentDialog, setOpenDocumentDialog] = useState(false);
    const [documentUrl, setDocumentUrl] = useState("");

    const handleMenuClick = (docSource: string) => {
        setDocumentUrl(docSource);
        setOpenDocumentDialog(true);
    };

    return (
        <Sheet>
            {children}
            <Dialog open={openDocumentDialog} onOpenChange={setOpenDocumentDialog}>
                <DialogContent className="h-[80%] w-[90%]">
                    <DialogDescription>
                        <iframe
                            src={documentUrl}
                            title="description"
                            width="100%"
                            height="100%"
                        ></iframe>
                    </DialogDescription>
                </DialogContent>
            </Dialog>
            <AppSidebar onItemClick={handleMenuClick} />
        </Sheet>
    );
};

export default SheetWrapper;
