import type { DevalueSerde } from ".";
import { Principal } from "@dfinity/principal";

// class for serde testing
export class TestValue {
  public name: string;
  public age: number;
  public principal: Principal;
  public testers: Principal[];
  public option: Option;
  constructor({
    name,
    age,
    principal,
    testers,
    option,
  }: {
    name: string;
    age: number;
    principal: Principal;
    testers: Principal[];
    option: Option;
  }) {
    this.name = name;
    this.age = age;
    this.principal = principal;
    this.testers = testers;
    this.option = option;
  }
}

// class for serde testing
export class Option {
  private constructor() {}

  static readonly OPTION_A = "OPTION_A";
  static readonly OPTION_B = "OPTION_B";
  static readonly OPTION_C = "OPTION_C";
  static readonly OPTION_D = "OPTION_D";
}

// type for serde testing
export type OptionValue =
  | typeof Option.OPTION_A
  | typeof Option.OPTION_B
  | typeof Option.OPTION_C
  | typeof Option.OPTION_D;

// serde implementation for testing
export const testValueDevalueSerde: DevalueSerde = {
  serialize: {
    TestValue: (v) =>
      v instanceof TestValue && {
        name: v.name,
        age: v.age,
        principal: v.principal,
        testers: v.testers,
        option: v.option,
      },
    Principal: (principal) =>
      principal instanceof Principal && principal.toText(),
  },
  deserialize: {
    TestValue: (v) => {
      const value = v as {
        name: string;
        age: number;
        principal: Principal;
        testers: Principal[];
        option: string;
      };
      return new TestValue({
        name: value.name,
        age: value.age,
        principal: value.principal,
        testers: value.testers,
        option: value.option,
      });
    },
    Principal: (data) => typeof data == "string" && Principal.fromText(data),
  },
};
