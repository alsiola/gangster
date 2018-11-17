import { AsyncFunction } from "./types";
import { BreakerError } from "./breaker-error";
import {
    Tripper,
    CreateDefaultTripperOpts,
    CreateMatcherTripperOpts
} from "./tripper";
import { FailTester } from "./fail-tester";

interface MatchTripper<T> {
    match: (a: T) => boolean;
}

type MatchTripperCreationOpts<T> = CreateMatcherTripperOpts & MatchTripper<T>;

export interface BreakerInternalOpts<T, U> {
    failTester: FailTester<U>;
    matchTrippers: Array<MatchTripperCreationOpts<T>>;
    defaultTripper: CreateDefaultTripperOpts;
}

export interface BreakerOpts<T, U> extends BreakerInternalOpts<T, U> {
    name: string;
}

export class Breaker<T, U> {
    private trippers: Array<{ tripper: Tripper } & MatchTripper<T>>;
    private failTester: FailTester<U>;
    private name: string;

    constructor(
        private f: AsyncFunction<T, U>,
        { failTester, matchTrippers, defaultTripper, name }: BreakerOpts<T, U>
    ) {
        this.name = name;
        this.trippers = [
            {
                match: () => true,
                tripper: new Tripper({
                    ...defaultTripper,
                    breakerName: name,
                    name: "default"
                })
            },
            ...matchTrippers.map(({ match, ...opts }) => ({
                match,
                tripper: new Tripper({
                    ...opts,
                    breakerName: name
                })
            }))
        ];
        this.failTester = failTester;
    }

    public status = () => ({
        name: this.name,
        status: this.trippers.map(({ tripper }) => tripper.status())
    });

    /**
     * Attempt to call the wrapped function
     */
    public call = (a: T): Promise<U> => {
        /**
         * Find any trippers that match the arguments, including the default
         * If any are open, this call cannot be allowed to continue
         */
        if (
            this.trippers.some(
                ({ tripper, match }) => match(a) && tripper.isTripped()
            )
        ) {
            throw new BreakerError("Circuit breaker is open");
        }

        /**
         * No trippers are open, so we can make the call
         *
         * If it succeeds (i.e. resolves), then we further check that it
         * isn't a failure case with the fail tester - this allows checking
         * e.g. specific HTTP codes, where it may resolve to a 204, but only
         * a 200 would be considered acceptable.
         *
         * If it rejects, then we test the error - in case certain error codes
         * should not be considered failures, e.g. a 404.
         *
         * In both cases, record the success/failure with all trippers that are
         * a match for the arguments
         */
        try {
            return this.f(a).then(result => {
                if (this.failTester.isFailureResult(result)) {
                    this.getMatchingTrippers(a).forEach(({ tripper }) =>
                        tripper.recordFailure()
                    );
                    throw new BreakerError("Invalid function result");
                }
                this.getMatchingTrippers(a).forEach(({ tripper }) =>
                    tripper.recordSuccess()
                );
                return result;
            });
        } catch (err) {
            if (this.failTester.isFailureError(err)) {
                this.getMatchingTrippers(a).forEach(({ tripper }) =>
                    tripper.recordFailure()
                );
            }
            throw new BreakerError("Function call failed", err);
        }
    };

    private getMatchingTrippers = (arg: T) => {
        return this.trippers.filter(({ match }) => match(arg));
    };
}
