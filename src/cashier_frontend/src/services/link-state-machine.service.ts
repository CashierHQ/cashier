import { LINK_STATE } from "./types/enum";

// Define direction enum for state transitions
export enum Direction {
    FORWARD = "FORWARD",
    BACKWARD = "BACKWARD",
}

export class LinkStateMachine {
    // Define the order of states
    private static readonly STATE_ORDER: string[] = [
        LINK_STATE.CHOOSE_TEMPLATE,
        LINK_STATE.ADD_ASSET,
        LINK_STATE.CREATE_LINK,
        LINK_STATE.ACTIVE,
        LINK_STATE.INACTIVE,
        LINK_STATE.INACTIVE_ENDED,
    ];

    /**
     * Determines if the transition is moving forward (continue) or backward (back)
     * @param previousState The previous state in the flow
     * @param currentState The current state in the flow
     * @returns Direction enum indicating whether moving FORWARD or BACKWARD
     */
    public static goBackOrContinue(previousState: string, currentState: string): Direction {
        const previousIndex = this.STATE_ORDER.indexOf(previousState);
        const currentIndex = this.STATE_ORDER.indexOf(currentState);

        // If current state comes after previous state in the order, it's a forward operation
        // Otherwise, it's a backward operation
        return currentIndex > previousIndex ? Direction.FORWARD : Direction.BACKWARD;
    }
}
