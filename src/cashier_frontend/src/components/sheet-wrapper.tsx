// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
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
