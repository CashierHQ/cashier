import { LinkStep } from "$modules/links/types";

export interface LinkState {
  readonly step: LinkStep;
  goNext(): Promise<void>;
  goBack(): Promise<void>;
}
