import React from "react";
import { ParitalFormProps } from "@/components/multi-step-form";

interface LinkDetailOverviewData {
    name: string;
    image: string;
    description: string;
}

export const LinkDetailOverview = ({ handleSubmit }: ParitalFormProps<LinkDetailOverviewData>) => {
    return <div>LinkDetailOverview</div>;
};
