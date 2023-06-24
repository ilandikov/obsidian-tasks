export class QueryComponent {
    readonly instruction: string;

    constructor(instruction: string) {
        this.instruction = instruction;
    }
}

/**
 * Generic class for storing:
 * - a text instruction.
 * - an object of type QueryComponent constructed from the instruction, if the instruction is valid.
 * - otherwise, an error message explaining in what wat the instruction is invalid.
 *
 * An example type of QueryComponent is {@link Filter}. See {@link FilterOrErrorMessage}.
 */
export class QueryComponentOrError<T extends QueryComponent> {
    readonly instruction: string;
    private _queryComponent: T | undefined;
    private _error: string | undefined;

    constructor(instruction: string) {
        this.instruction = instruction;
    }

    public get queryComponent(): T | undefined {
        return this._queryComponent;
    }

    protected set queryComponent(value: T | undefined) {
        this._queryComponent = value;
    }

    public get error(): string | undefined {
        return this._error;
    }

    protected set error(value: string | undefined) {
        this._error = value;
    }

    /**
     * Construct an ObjectOrErrorMessage with the given QueryComponent.
     *
     * @param instruction
     * @param object - a {@link Filter}
     */
    public static fromObject<T extends QueryComponent>(instruction: string, object: T): QueryComponentOrError<T> {
        const result = new QueryComponentOrError<T>(instruction);
        result._queryComponent = object;
        return result;
    }

    /**
     * Construct a ObjectOrErrorMessage with the given error message.
     * @param instruction
     * @param errorMessage
     */
    public static fromError<T extends QueryComponent>(
        instruction: string,
        errorMessage: string,
    ): QueryComponentOrError<T> {
        const result = new QueryComponentOrError<T>(instruction);
        result._error = errorMessage;
        return result;
    }
}
