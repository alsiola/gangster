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

    public call = (a: T): Promise<U> => {
        if (
            this.trippers.some(
                ({ tripper, match }) => match(a) && tripper.isTripped()
            )
        ) {
            throw new BreakerError("Circuit breaker is open");
        }

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
