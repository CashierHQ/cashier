import type {
	Action,
	Intent,
} from '$shared';
import {
	ActionType,
	ActionState,
	IntentState,
	AddressType,
} from '$shared';
import type { Principal } from '@dfinity/principal';

class ActionStore {
	private _action = $state<Action | null>(null);

	get action(): Action | null {
		return this._action;
	}

	// Initialize Action for CreateLink
	initializeForCreateLink(creator: Principal) {
		this._action = {
			id: crypto.randomUUID(),
			creator,
			creator_address_type: AddressType.Creator,
			action_type: ActionType.CreateLink,
			intents: [],
			action_state: ActionState.Created,
		};
	}

	// Add an intent to the action
	addIntent(intent: Intent) {
		if (this._action) {
			this._action.intents.push(intent);
		}
	}

	/** Replace all intents. Used when building Action for V3 create flow. */
	setIntents(intents: Intent[]) {
		if (this._action) {
			this._action.intents = intents;
		}
	}

	/** Update creator principal. Used when building Action with real user identity. */
	updateCreator(creator: Principal) {
		if (this._action) {
			this._action.creator = creator;
		}
	}

	// Update action state
	updateActionState(state: ActionState) {
		if (this._action) {
			this._action.action_state = state;
		}
	}

	// Update intent state
	updateIntentState(intentId: string, state: IntentState) {
		if (this._action) {
			const intent = this._action.intents.find((i) => i.id === intentId);
			if (intent) {
				intent.intent_state = state;
			}
		}
	}

	// Clear the action
	clear() {
		this._action = null;
	}

	// Reset for new action
	reset() {
		this.clear();
	}
}

export const actionStore = new ActionStore();
