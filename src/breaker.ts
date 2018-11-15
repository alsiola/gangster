import { AsyncFunction } from "./types";
import { BreakerError } from "./breaker-error";
import { Tripper, TripperOpts } from "./tripper";
import { FailTester } from "./fail-tester";

export interface BreakerOpts<U> {
    name: string;
    tripperOpts: TripperOpts;
    failTester: FailTester<U>;
}

export class Breaker<T, U> {
    private tripper: Tripper;
    private failTester: FailTester<U>;

    constructor(
        private name: string,
        private f: AsyncFunction<T, U>,
        { tripperOpts, failTester }: BreakerOpts<U>
    ) {
        this.tripper = new Tripper(tripperOpts);
        this.failTester = failTester;
    }

    public status = () => ({
        name: this.name,
        status: this.tripper.status()
    });

    public call = (a: T): Promise<U> => {
        if (this.tripper.isTripped()) {
            throw new BreakerError("Circuit breaker is open");
        }

        try {
            return this.f(a).then(result => {
                if (this.failTester.isFailureResult(result)) {
                    this.tripper.recordFailure();
                    throw new BreakerError("Invalid function result");
                }
                this.tripper.recordSuccess();
                return result;
            });
        } catch (err) {
            if (this.failTester.isFailureError(err)) {
                this.tripper.recordFailure();
            }
            throw new BreakerError("Function call failed", err);
        }
    };
}
