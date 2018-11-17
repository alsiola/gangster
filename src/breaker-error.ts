export enum ErrorCode {
    // Remote call blocked because breaker is open
    BreakerOpen = 1,
    // Remote call succeeded, but result was invalid
    InvalidResult = 2,
    // Remote call threw error
    FunctionThrew = 3
}

/**
 * Extends the default Error class to allow a library-specific
 * message without losing detail on the underlying error
 */
export class BreakerError extends Error {
    constructor(
        msg: string,
        public code: ErrorCode,
        public internalError?: any
    ) {
        super(msg);
    }
}
