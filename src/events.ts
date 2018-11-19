export enum BreakerEventNames {
    called = "called",
    callBlocked = "callBlocked",
    validResult = "validResult",
    invalidResult = "invalidResult",
    validError = "validError",
    invalidError = "invalidError"
}

export interface BreakerEvents<T, U> {
    [BreakerEventNames.called]: {
        args: T;
    };
    [BreakerEventNames.callBlocked]: {
        args: T;
        tripperName: string;
    };
    [BreakerEventNames.validResult]: {
        args: T;
        result: U;
    };
    [BreakerEventNames.invalidResult]: {
        args: T;
        result: U;
    };
    [BreakerEventNames.validError]: {
        args: T;
        error: any;
    };
    [BreakerEventNames.invalidError]: {
        args: T;
        error: any;
    };
}
