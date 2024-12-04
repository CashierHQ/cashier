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
                            title: [""],
                            asset_info: [
                                [
                                    {
                                        chain: "IC",
                                        address: "",
                                        amount: 100n,
                                    },
                                ],
                            ],
                            description: ["2345678234567"],
                            template: ["Central"],
                            image: ["23456765432"],
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
