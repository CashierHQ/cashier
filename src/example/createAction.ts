import { _SERVICE, CreateActionInput } from "../declarations/cashier_backend/cashier_backend.did";

export const callCreateAction = async ({ backend, id }: { backend: _SERVICE; id: string }) => {
    const input: CreateActionInput = {
        link_id: id,
        action_type: "Create",
        params: [],
    };
    return await backend.create_action(input);
};
