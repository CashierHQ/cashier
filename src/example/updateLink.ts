import { _SERVICE, UpdateLinkInput } from "../declarations/cashier_backend/cashier_backend.did";

export const continueUpdate = async ({ backend, id }: { backend: _SERVICE; id: string }) => {
    const linkInput: UpdateLinkInput = {
        id: id,
        action: "Continue",
        params: [
            {
                Update: {
                    params: [
                        {
                            title: ["213132"],
                            asset_info: [
                                [
                                    {
                                        chain: "IC",
                                        address: "x5qut-viaaa-aaaar-qajda-cai",
                                        amount_per_claim: 100n,
                                        total_amount: 100n,
                                    },
                                ],
                            ],
                            description: ["2345678234567"],
                            template: ["Central"],
                            link_image_url: ["https://www.google.com"],
                            nft_image: ["12345678"],
                            link_type: ["TipLink"],
                        },
                    ],
                },
            },
        ],
    };
    return await backend.update_link(linkInput);
};

export const back = async ({ backend, id }: { backend: _SERVICE; id: string }) => {
    const linkInput: UpdateLinkInput = {
        id: id,
        action: "Back",
        params: [],
    };
    return await backend.update_link(linkInput);
};

export const continueActive = async ({ backend, id }: { backend: _SERVICE; id: string }) => {
    const linkInput: UpdateLinkInput = {
        id: id,
        action: "Continue",
        params: [],
    };

    return await backend.update_link(linkInput);
};
