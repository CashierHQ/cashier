/* eslint-disable @typescript-eslint/no-explicit-any */
import { Principal } from "@dfinity/principal";

export interface JsonnableCandid {
    toJSON(value: any): any;

    fromJSON(value: any): any;
}

class EmptyClass implements JsonnableCandid {
    public toJSON(): any {
        return undefined;
    }

    public fromJSON(): any {
        return undefined;
    }
}

class ReservedClass implements JsonnableCandid {
    public toJSON(): any {
        return null;
    }

    public fromJSON(): any {
        return null;
    }
}

class UnknownClass implements JsonnableCandid {
    public toJSON(): any {
        return undefined;
    }

    public fromJSON(): any {
        return undefined;
    }
}

class BoolClass implements JsonnableCandid {
    public toJSON(value: any): any {
        return value;
    }

    public fromJSON(value: any): any {
        return value;
    }
}

class NullClass implements JsonnableCandid {
    public toJSON(): any {
        return null;
    }

    public fromJSON(): any {
        return null;
    }
}

class TextClass implements JsonnableCandid {
    public toJSON(value: any): any {
        return value;
    }

    public fromJSON(value: any): any {
        return value;
    }
}

class IntClass implements JsonnableCandid {
    public toJSON(value: bigint): any {
        return value.toString(10);
    }

    public fromJSON(value: string): any {
        return BigInt(value);
    }
}

class NatClass implements JsonnableCandid {
    public toJSON(value: bigint): any {
        return value.toString(10);
    }

    public fromJSON(value: string): any {
        return BigInt(value);
    }
}

class FloatClass implements JsonnableCandid {
    public toJSON(value: number): any {
        return value;
    }

    public fromJSON(value: number): any {
        return value;
    }
}

class FixedIntClass implements JsonnableCandid {
    constructor(public bits: number) {}

    public toJSON(value: number | bigint): any {
        if (this.bits === 64) {
            return value.toString();
        }
        return value;
    }

    public fromJSON(value: number | string): any {
        if (this.bits === 64) {
            return BigInt(value);
        }
        return value;
    }
}

class FixedNatClass implements JsonnableCandid {
    constructor(public bits: number) {}

    public toJSON(value: number | bigint): any {
        if (this.bits === 64) {
            return value.toString();
        }
        return value;
    }

    public fromJSON(value: number | string): any {
        if (this.bits === 64) {
            return BigInt(value);
        }
        return value;
    }
}

class PrincipalClass implements JsonnableCandid {
    public toJSON(value: Principal): any {
        return value.toText();
    }

    public fromJSON(value: string): any {
        return Principal.fromText(value);
    }
}

class TupleClass implements JsonnableCandid {
    constructor(private types: JsonnableCandid[]) {}

    public toJSON(value: any[]): any {
        return this.types.map((type, index) => type.toJSON(value[index]));
    }

    public fromJSON(value: string): any {
        return this.types.map((type, index) => type.fromJSON(value[index]));
    }
}

class VecClass implements JsonnableCandid {
    private readonly blobOptimization: boolean;

    constructor(private type: JsonnableCandid) {
        this.blobOptimization = type instanceof FixedNatClass && type.bits === 8;
    }

    public toJSON(value: number[] | Uint8Array): any {
        if (this.blobOptimization) {
            return [...value].map((byte: number) => byte.toString(16).padStart(2, "0")).join("");
        }
        return value.map((v) => this.type.toJSON(v));
    }

    public fromJSON(value: number[] | string): any {
        if (this.blobOptimization) {
            return new Uint8Array(
                (value as string).match(/.{1,2}/g)?.map((v) => parseInt(v, 16)) ?? [],
            );
        }
        return (value as number[]).map((v) => this.type.fromJSON(v));
    }
}

class OptClass implements JsonnableCandid {
    constructor(private type: JsonnableCandid) {}

    public toJSON(value: any): any {
        const jsonnable = value.length ? this.type.toJSON(value[0]) : undefined;
        if (this.type instanceof OptClass) {
            return [jsonnable];
        }
        return jsonnable;
    }

    public fromJSON(value: any): any {
        if (this.type instanceof OptClass) {
            return Array.isArray(value) ? [this.type.fromJSON(value[0])] : [];
        }
        return value !== undefined ? [this.type.fromJSON(value)] : [];
    }
}

class RecordClass implements JsonnableCandid {
    constructor(private fields: Record<string, JsonnableCandid>) {}

    public toJSON(value: Record<string, any>): any {
        return Object.fromEntries(
            Object.entries(this.fields).map(([field, fieldType]) => [
                field,
                fieldType.toJSON(value[field]),
            ]),
        );
    }

    public fromJSON(value: any): any {
        return Object.fromEntries(
            Object.entries(this.fields).map(([field, fieldType]) => [
                field,
                fieldType.fromJSON(value[field]),
            ]),
        );
    }
}

class VariantClass implements JsonnableCandid {
    constructor(private fields: Record<string, JsonnableCandid>) {}

    public toJSON(value: Record<string, any>): any {
        const keys = Object.keys(value);
        const fieldEntry = Object.entries(this.fields).find(([f]) => keys.includes(f));
        if (!fieldEntry) {
            throw Error("Variant could not be found");
        }
        const [field, fieldType] = fieldEntry;
        return {
            [field]: fieldType.toJSON(value[field]),
        };
    }

    public fromJSON(value: any): any {
        const keys = Object.keys(value);
        const fieldEntry = Object.entries(this.fields).find(([f]) => keys.includes(f));
        if (!fieldEntry) {
            throw Error("Variant could not be found");
        }
        const [field, fieldType] = fieldEntry;
        return {
            [field]: fieldType.fromJSON(value[field]),
        };
    }
}

class RecClass implements JsonnableCandid {
    private type?: JsonnableCandid;

    public fill(type: JsonnableCandid) {
        this.type = type;
    }

    public toJSON(value: any): any {
        if (!this.type) {
            throw Error("Recursive type is not set");
        }
        return this.type.toJSON(value);
    }

    public fromJSON(value: any): any {
        if (!this.type) {
            throw Error("Recursive type is not set");
        }
        return this.type.fromJSON(value);
    }
}

class FuncClass implements JsonnableCandid {
    public toJSON(value: [Principal, string]): any {
        return [value[0].toText(), value[1]];
    }

    public fromJSON(value: [string, string]): any {
        return [Principal.fromText(value[0]), value[1]];
    }
}

class ServiceClass implements JsonnableCandid {
    public toJSON(value: Principal): any {
        return value.toText();
    }

    public fromJSON(value: string): any {
        return Principal.fromText(value);
    }
}

export type InterfaceFactory = (idl: {
    IDL: {
        Empty: EmptyClass;
        Reserved: ReservedClass;
        Unknown: UnknownClass;
        Bool: BoolClass;
        Null: NullClass;
        Text: TextClass;
        Int: IntClass;
        Nat: NatClass;
        Float32: FloatClass;
        Float64: FloatClass;
        Int8: FixedIntClass;
        Int16: FixedIntClass;
        Int32: FixedIntClass;
        Int64: FixedIntClass;
        Nat8: FixedNatClass;
        Nat16: FixedNatClass;
        Nat32: FixedNatClass;
        Nat64: FixedNatClass;
        Principal: PrincipalClass;
        Tuple: (...types: JsonnableCandid[]) => TupleClass;
        Vec: (type: JsonnableCandid) => VecClass;
        Opt: (type: JsonnableCandid) => OptClass;
        Record: (fields: Record<string, JsonnableCandid>) => RecordClass;
        Variant: (fields: Record<string, JsonnableCandid>) => VariantClass;
        Rec: () => RecClass;
        Func: () => FuncClass;
        Service: (t?: Record<string, FuncClass>) => ServiceClass;
    };
}) => JsonnableCandid;

export class CandidJSON implements JsonnableCandid {
    private type: JsonnableCandid;

    constructor(interfaceFactory: InterfaceFactory) {
        this.type = interfaceFactory({
            IDL: {
                Empty: new EmptyClass(),
                Reserved: new ReservedClass(),
                Unknown: new UnknownClass(),
                Bool: new BoolClass(),
                Null: new NullClass(),
                Text: new TextClass(),
                Int: new IntClass(),
                Nat: new NatClass(),
                Float32: new FloatClass(),
                Float64: new FloatClass(),
                Int8: new FixedIntClass(8),
                Int16: new FixedIntClass(16),
                Int32: new FixedIntClass(32),
                Int64: new FixedIntClass(64),
                Nat8: new FixedNatClass(8),
                Nat16: new FixedNatClass(16),
                Nat32: new FixedNatClass(32),
                Nat64: new FixedNatClass(64),
                Principal: new PrincipalClass(),
                Tuple: (...types) => new TupleClass(types),
                Vec: (type) => new VecClass(type),
                Opt: (type) => new OptClass(type),
                Record: (fields) => new RecordClass(fields),
                Variant: (fields) => new VariantClass(fields),
                Rec: () => new RecClass(),
                Func: () => new FuncClass(),
                Service: () => new ServiceClass(),
            },
        });
    }

    public toJSON(value: any) {
        return this.type.toJSON(value);
    }

    public fromJSON(value: any) {
        return this.type.fromJSON(value);
    }
}
