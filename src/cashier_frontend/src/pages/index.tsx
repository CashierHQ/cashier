import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <Link to="/create"><Button>Create</Button></Link>
    );
}