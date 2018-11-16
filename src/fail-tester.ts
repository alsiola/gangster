export interface FailureConditions<U> {
    testError?: (a: any) => boolean;
    testResult?: (a: U) => boolean;
}

export class FailTester<U> {
    constructor(private failureConditions: FailureConditions<U> = {}) {}

    /**
     * Is a result a failure case?
     */
    public isFailureResult = (a: U): boolean => {
        return this.failureConditions.testResult
            ? this.failureConditions.testResult(a)
            : false;
    };

    /**
     * Is an error a failure case?
     * If no specific test, then it is.
     */
    public isFailureError = (a: any): boolean => {
        return this.failureConditions.testError
            ? this.failureConditions.testError(a)
            : true;
    };
}
