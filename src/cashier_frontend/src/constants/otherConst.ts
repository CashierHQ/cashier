import { SidebarMenuItem } from "@/components/app-sidebar";
import { FaLink } from "react-icons/fa6";
import { LuCompass } from "react-icons/lu";
import { CiSettings } from "react-icons/ci";
import React from "react";

export const INCREASE = "increase";
export const DECREASE = "decrease";
export const LINK_STATE = {
    PENDING_DETAIL: "PendingDetail",
    PENDING_PREVIEW: "PendingPreview",
    ACTIVE: "Active",
    NEW: "New",
    INACTIVE: "Inactive",
};

export const BOTTOM_MENU_ITEMS: SidebarMenuItem[] = [
    {
        title: "FAQ",
        icon: React.createElement(CiSettings, { size: 22 }),
        docSource: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4812/2b32fa3ed781459",
    },
];

export const TOP_MENU_ITEMS: SidebarMenuItem[] = [
    {
        title: "About us",
        icon: React.createElement(FaLink, { size: 22 }),
        docSource: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4792/cd2e9646a3a8a0a",
    },
    {
        title: "Explore Cashier",
        icon: React.createElement(LuCompass, { size: 22 }),
        docSource: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4852/8a86f74b2d7ea73",
    },
];
