import { SidebarMenuItem } from "@/components/app-sidebar";
import { LuCompass } from "react-icons/lu";
import { LuGanttChartSquare } from "react-icons/lu";
import React from "react";
import { CircleHelp, Link } from "lucide-react";

export const INCREASE = "increase";
export const DECREASE = "decrease";

export const BOTTOM_MENU_ITEMS: SidebarMenuItem[] = [
    {
        title: "FAQ",
        icon: React.createElement(CircleHelp, { size: 22 }),
        onClick: () =>
            window.open(
                "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4812/2b32fa3ed781459",
                "_blank",
            ),
    },
];

export const TOP_MENU_ITEMS: SidebarMenuItem[] = [
    {
        title: "About us",
        icon: React.createElement(Link, { size: 22 }),
        onClick: () =>
            window.open(
                "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4792/cd2e9646a3a8a0a",
                "_blank",
            ),
    },
    {
        title: "Explore Cashier",
        icon: React.createElement(LuCompass, { size: 22 }),
        onClick: () =>
            window.open(
                "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4852/8a86f74b2d7ea73",
                "_blank",
            ),
    },
    {
        title: "Cashier project overview",
        icon: React.createElement(LuGanttChartSquare, { size: 22 }),
        onClick: () =>
            window.open(
                "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4292/9a3796b6e853ef0",
                "_blank",
            ),
    },
];
