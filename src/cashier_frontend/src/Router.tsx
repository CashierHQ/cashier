import { createBrowserRouter, RouterProvider } from "react-router-dom";
import CreatePage from "./pages/create";
import HomePage from "@/pages";

const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />,
    },
    {
        path: "/create",
        element: <CreatePage />,
    },
]);
export default function AppRouter() {
    return <RouterProvider router={router} />;
}
