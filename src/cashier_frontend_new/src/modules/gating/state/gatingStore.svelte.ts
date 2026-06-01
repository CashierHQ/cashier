import { locale } from "$lib/i18n";
import { GateType, type GateDraft } from "$modules/gating/types/gate";

export class GatingStore {
  #selectedGateTypes = $state<GateType[]>([]);
  #password = $state("");
  #confirmPassword = $state("");
  #configuredPassword = $state<string | null>(null);
  #onChange: ((gateDrafts: GateDraft[]) => void) | null = null;

  constructor(
    gateDrafts: GateDraft[] = [],
    onChange: ((gateDrafts: GateDraft[]) => void) | null = null,
  ) {
    this.#onChange = onChange;
    this.restore(gateDrafts);
  }

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
    if (this.#password.trim().length === 0) {
      return locale.t("links.linkForm.lock.errors.passwordRequired");
    }
    if (this.#confirmPassword.trim().length === 0) {
      return locale.t("links.linkForm.lock.errors.confirmPasswordRequired");
    }
    if (this.#password !== this.#confirmPassword) {
      return locale.t("links.linkForm.lock.errors.passwordsDifferent");
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

  restore(gateDrafts: GateDraft[]): void {
    const passwordGate = gateDrafts.find(
      (gate) => gate.type === GateType.PASSWORD,
    );

    this.#configuredPassword = passwordGate?.password ?? null;
    this.#selectedGateTypes = passwordGate ? [GateType.PASSWORD] : [];
    this.#password = "";
    this.#confirmPassword = "";
  }

  #emitChange(): void {
    this.#onChange?.(this.gateDrafts);
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
    this.#emitChange();
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
    this.#emitChange();
  }
}
