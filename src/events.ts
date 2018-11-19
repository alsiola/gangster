export enum BreakerEventNames {
    called = "called",
    validResult = "validResult",
    invalidResult = "invalidResult",
    validError = "validError",
    invalidError = "invalidError"
}

export interface BreakerEvents<T, U> {
    [BreakerEventNames.called]: {
        args: T;
    };
}
