/**
 * Generic class for storing:
 * - a text instruction.
 * - an object of type QueryComponent constructed from the instruction, if the instruction is valid.
 * - otherwise, an error message explaining in what wat the instruction is invalid.
 *
 * An example type of QueryComponent is {@link Filter}. See {@link FilterOrErrorMessage}.
 */
export class QueryComponentOrError<QueryComponent> {
    readonly instruction: string;
    private _queryComponent: QueryComponent | undefined;
    private _error: string | undefined;

    constructor(instruction: string) {
        this.instruction = instruction;
    }

    public get queryComponent(): QueryComponent | undefined {
        return this._queryComponent;
    }

    protected set queryComponent(value: QueryComponent | undefined) {
        this._queryComponent = value;
    }

    public get error(): string | undefined {
        return this._error;
    }

    protected set error(value: string | undefined) {
        this._error = value;
    }
}
