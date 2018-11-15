export class BreakerError extends Error {
    constructor(msg: string, public internalError?: any) {
        super(msg);
    }
}
