/**
 * Extends the default Error class to allow a library-specific
 * message without losing detail on the underlying error
 *
 * Probably needs codes as well as a message
 */
export class BreakerError extends Error {
    constructor(msg: string, public internalError?: any) {
        super(msg);
    }
}
