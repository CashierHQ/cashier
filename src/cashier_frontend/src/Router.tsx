import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LinkPage from "./pages/edit/[id]";
import HomePage from "@/pages";
import ClaimPage from "./pages/[id]";
import DetailPage from "./pages/details/[id]";
import TipLink from "./pages/edit/[id]/TipLink";
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
    return <RouterProvider router={router} />;
}
