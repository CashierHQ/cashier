import { Chain, State, Template, UpdateLinkInput } from "@/services/types/link.service.types";
import { LinkDetail } from "../../../declarations/cashier_backend/cashier_backend.did";
import { base64SampleLinkImage1, base64SampleLinkImage2 } from "./base64Images";

export const sampleLink1 = {
    title: "Special moments",
    image: base64SampleLinkImage1,
    description:
        "I wanted to capture this special moment forever. And I’d like to share it with my closest of friends.",
    amount: 10,
    chain: Chain.IC,
    state: State.PendingPreview,
    template: Template.Left,
};

export const sampleLink2 = {
    title: "Proof of attendance",
    image: base64SampleLinkImage2,
    description:
        "Thank you for attending our coffee brewing workshop. Here is an NFT as a proof of your attendance.",
    amount: 20,
    chain: Chain.IC,
    state: { PendingPreview: null },
    template: Template.Left,
};
