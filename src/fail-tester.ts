export interface FailureConditions<U> {
    testError?: (a: any) => boolean;
    testResult?: (a: U) => boolean;
}

export class FailTester<U> {
    constructor(private failureConditions: FailureConditions<U>) {}

    public isFailureResult = (a: U): boolean => {
        return this.failureConditions.testResult
            ? this.failureConditions.testResult(a)
            : false;
    };

    public isFailureError = (a: any): boolean => {
        return this.failureConditions.testError
            ? this.failureConditions.testError(a)
            : false;
    };
}
