export enum GateType {
  PASSWORD = "password",
}

export type PasswordGateDraft = {
  type: GateType.PASSWORD;
  password: string;
};

export type GateDraft = PasswordGateDraft;
