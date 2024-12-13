import { _SERVICE, CreateIntentInput } from "../declarations/cashier_backend/cashier_backend.did";

export const callCreateAction = async ({ backend, id }: { backend: _SERVICE; id: string }) => {
    const input: CreateIntentInput = {
        link_id: id,
        intent_type: "Create",
        params: [],
    };
    return await backend.create_intent(input);
};
