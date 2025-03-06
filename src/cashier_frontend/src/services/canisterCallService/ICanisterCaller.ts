export interface ICanisterCaller<IN, OUT> {
    call(args: IN): Promise<OUT>;
}
