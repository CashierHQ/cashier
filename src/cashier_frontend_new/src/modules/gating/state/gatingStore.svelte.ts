import { GateType, type GateDraft } from "$modules/gating/types/gate";

export class GatingStore {
  #selectedGateTypes = $state<GateType[]>([]);
  #password = $state("");
  #confirmPassword = $state("");
  #configuredPassword = $state<string | null>(null);

  get selectedGateTypes(): GateType[] {
    return this.#selectedGateTypes;
  }

  get password(): string {
    return this.#password;
  }

  get confirmPassword(): string {
    return this.#confirmPassword;
  }

  get hasConfiguredPassword(): boolean {
    return this.#configuredPassword !== null;
  }

  get hasLocks(): boolean {
    return this.hasConfiguredPassword;
  }

  get passwordSetupError(): string | null {
    if (this.#password.trim().length === 0) return "Password is required";
    if (this.#confirmPassword.trim().length === 0) {
      return "Confirm password is required";
    }
    if (this.#password !== this.#confirmPassword) {
      return "The passwords are different.";
    }
    return null;
  }

  get gateDrafts(): GateDraft[] {
    const gates: GateDraft[] = [];

    if (this.hasConfiguredPassword) {
      gates.push({
        type: GateType.PASSWORD,
        password: this.#configuredPassword ?? "",
      });
    }

    return gates;
  }

  setPassword(password: string): void {
    this.#password = password;
  }

  setConfirmPassword(confirmPassword: string): void {
    this.#confirmPassword = confirmPassword;
  }

  savePasswordLock(): void {
    if (this.passwordSetupError) return;

    this.#configuredPassword = this.#password.trim();
    this.#selectedGateTypes = [GateType.PASSWORD];
  }

  clearPasswordDraft(): void {
    this.#password = "";
    this.#confirmPassword = "";
  }

  resetAll(): void {
    this.#selectedGateTypes = [];
    this.#password = "";
    this.#confirmPassword = "";
    this.#configuredPassword = null;
  }
}
