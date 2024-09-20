import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LinkPage from "./pages/[id]";
import HomePage from "@/pages";

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />,
    },
    {
        path: "/:linkId",
        element: <LinkPage />,
    },
]);
export default function AppRouter() {
    return <RouterProvider router={router} />;
}
