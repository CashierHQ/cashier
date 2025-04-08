import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useResponsive } from "./hooks/responsive-hook";
import LinkPage from "./pages/edit/[id]";
import HomePage from "@/pages";
import ClaimPage from "./pages/[id]";
import DetailPage from "./pages/details/[id]";
import WalletLayout from "./pages/wallet/layout";
import WalletPage from "./pages/wallet/page";
import ManageTokensPage from "./pages/wallet/manage/page";
import ImportTokenPage from "./pages/wallet/import/page";
import TokenDetailsPage from "./pages/wallet/details/[id]/page";
import RequireAuth from "./router/RequireAuth";
import ReceiveTokenPage from "./pages/wallet/receive/[id]/page";
import SendTokenPage from "./pages/wallet/send/[id]/page";

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />,
    },
    {
        path: "/edit/:linkId",
        element: (
            <RequireAuth>
                <LinkPage />
            </RequireAuth>
        ),
    },
    {
        path: "/:linkId",
        element: <ClaimPage />,
    },
    {
        path: "/details/:linkId",
        element: (
            <RequireAuth>
                <DetailPage />
            </RequireAuth>
        ),
    },
    {
        path: "/wallet",
        element: (
            <RequireAuth>
                <WalletLayout />
            </RequireAuth>
        ),
        children: [
            {
                index: true,
                element: <WalletPage />,
            },
            {
                path: "manage",
                element: <ManageTokensPage />,
            },
            {
                path: "import",
                element: <ImportTokenPage />,
            },
            {
                path: "details/:tokenId",
                element: <TokenDetailsPage />,
            },
            {
                path: "receive/:tokenId?",
                element: <ReceiveTokenPage />,
            },
            {
                path: "send/:tokenId?",
                element: <SendTokenPage />,
            },
        ],
    },
]);

export default function AppRouter() {
    const { isSmallDevice } = useResponsive();
    return (
        <div
            className={
                isSmallDevice
                    ? "min-h-screen h-full"
                    : "bg-gradient-to-r h-[100vh] from-[#F4FCF9] to-[#F7FAF8] flex items-center justify-center"
            }
        >
            <RouterProvider router={router} />
        </div>
    );
}
