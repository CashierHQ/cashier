import type { Action } from "../../links/types/action/action";

class ActionDrawerState {
  #isOpen = $state(false);
  #action = $state<Action | null>(null);

  get isOpen() {
    return this.#isOpen;
  }

  get action() {
    return this.#action;
  }

  open(action: Action) {
    this.#action = action;
    this.#isOpen = true;
  }

  close() {
    this.#isOpen = false;
    // Keep action data briefly for closing animation
    setTimeout(() => {
      this.#action = null;
    }, 300);
  }

  toggle(action?: Action) {
    if (this.#isOpen) {
      this.close();
    } else if (action) {
      this.open(action);
    }
  }
}

// Export a singleton instance
export const actionDrawerState = new ActionDrawerState();
