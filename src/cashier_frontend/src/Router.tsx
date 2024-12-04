import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LinkPage from "./pages/edit/[id]";
import HomePage from "@/pages";
import ClaimPage from "./pages/[id]";
import DetailPage from "./pages/details/[id]";
import TipLink from "./pages/edit/[id]/TipLink";
import { useResponsive } from "./hooks/responsive-hook";

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
        path: "/tipLink/:linkId",
        element: <TipLink />,
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
