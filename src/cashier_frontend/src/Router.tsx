import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LinkPage from "./pages/edit/[id]";
import HomePage from "@/pages";
import ClaimPage from "./pages/[id]";
import DetailPage from "./pages/details/[id]";
import { useResponsive } from "./hooks/responsive-hook";
import { WalletPage } from "./components/wallet-page/wallet-page";
import { WalletLayout } from "./components/wallet-page/wallet-layout";
import { ManageTokensPage } from "./components/manage-tokens/manage-tokens-page";
import { ImportTokenPage } from "./components/import-token/import-token-page";

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
                element: <div>Token details</div>,
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
