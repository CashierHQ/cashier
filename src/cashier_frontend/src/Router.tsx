import { createHashRouter, RouterProvider } from "react-router-dom";
import { useResponsive } from "./hooks/responsive-hook";
import LinkPage from "./pages/edit/[id]";
import HomePage from "@/pages";
import ClaimPage from "./pages/[id]";
import DetailPage from "./pages/details/[id]";
import RequireAuth from "./router/RequireAuth";
import { WalletProvider } from "./contexts/wallet-context";

const router = createHashRouter([
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
]);

// Create a wrapper component that provides wallet context
const RouterWithWalletProvider = () => {
    const { isSmallDevice } = useResponsive();

    return (
        <div
            className={
                isSmallDevice
                    ? "min-h-screen h-full"
                    : "bg-gradient-to-r h-[100vh] from-[#F4FCF9] to-[#F7FAF8] flex items-center justify-center"
            }
        >
            <WalletProvider>
                <RouterProvider router={router} />
            </WalletProvider>
        </div>
    );
};

export default RouterWithWalletProvider;
