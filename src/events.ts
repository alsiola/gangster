export enum BreakerEventNames {
    called = "called",
    callBlocked = "callBlocked",
    callAllowed = "callAllowed",
    validResult = "validResult",
    invalidResult = "invalidResult",
    validError = "validError",
    invalidError = "invalidError",
    tripperOpened = "tripperOpened"
}

export interface BreakerEvents<T, U> {
    [BreakerEventNames.called]: {
        args: T;
    };
    [BreakerEventNames.callAllowed]: {
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
    [BreakerEventNames.tripperOpened]: {
        tripperName: string;
    };
}

export enum TripperEventNames {
    opened = "opened"
}

export interface TripperEvents {
    [TripperEventNames.opened]: {
        tripperName: string;
    };
}
