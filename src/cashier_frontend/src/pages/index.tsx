import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <div className="w-screen flex justify-center py-5">
            <Link to="/create"><Button>Create</Button></Link>
        </div>
    );
}