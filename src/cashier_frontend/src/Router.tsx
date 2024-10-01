import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LinkPage from "./pages/edit/[id]";
import HomePage from "@/pages";
import ClaimPage from "./pages/[id]";

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
]);
export default function AppRouter() {
    return <RouterProvider router={router} />;
}
