import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useResponsive } from "./hooks/responsive-hook";
import LinkPage from "./pages/edit/[id]";
import HomePage from "@/pages";
import ClaimPage from "./pages/[id]";
import DetailPage from "./pages/details/[id]";
import WalletLayout from "./pages/wallet/layout";
import WalletPage from "./pages/wallet/page";
import ManageTokensPage from "./pages/wallet/manage/page";
import { ImportTokenPage } from "./components/import-token/import-token-page";
import { TokenDetailsScreen } from "./components/token-details/token-details-screen";

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />,
    },
    {
        path: "/edit/:linkId",
        element: <LinkPage />,
    },
    {
        path: "/:linkId",
        element: <ClaimPage />,
    },
    {
        path: "/details/:linkId",
        element: <DetailPage />,
    },
    {
        path: "/wallet",
        element: <WalletLayout />,
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
                element: <TokenDetailsScreen />,
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
                    ? ""
                    : "bg-gradient-to-r from-[#F4FCF9] to-[#F7FAF8] h-[100vh] flex items-center justify-center"
            }
        >
            <RouterProvider router={router} />
        </div>
    );
}
