import {
    AsyncFunction,
    TypedEventEmitter,
    TypedEventEmitterInternal
} from "./types";
import { BreakerError, ErrorCode } from "./breaker-error";
import {
    Tripper,
    CreateDefaultTripperOpts,
    CreateMatcherTripperOpts
} from "./tripper";
import { FailTester } from "./fail-tester";
import { BreakerEvents, BreakerEventNames, TripperEventNames } from "./events";
import { EventEmitter } from "events";

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

export class Breaker<T, U>
    implements TypedEventEmitter<BreakerEvents<T, U>, Breaker<T, U>> {
    private trippers: Array<{ tripper: Tripper } & MatchTripper<T>>;
    private failTester: FailTester<U>;
    private name: string;
    private emitter: TypedEventEmitterInternal<
        BreakerEvents<T, U>,
        Breaker<T, U>
    >;

    constructor(
        private wrappedFunction: AsyncFunction<T, U>,
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
        this.emitter = new EventEmitter() as any;
    }

    public on: TypedEventEmitter<BreakerEvents<T, U>, Breaker<T, U>>["on"] = (
        event: any,
        cb: any
    ) => {
        // Tripper events are delegated to the tripper event emitters
        if (event === BreakerEventNames.tripperOpened) {
            this.trippers.forEach(({ tripper }) =>
                tripper.on(TripperEventNames.opened, cb)
            );
            return this;
        }
        this.emitter.on(event, cb);
        return this;
    };

    public status = () => ({
        name: this.name,
        status: this.trippers.map(({ tripper }) => tripper.status())
    });

    /**
     * Attempt to call the wrapped function
     */
    public call = (args: T): Promise<U> => {
        this.emitter.emit(BreakerEventNames.called, { args: args });
        /**
         * Find any trippers that match the arguments, including the default
         * If any are open, this call cannot be allowed to continue
         */
        const openTripper = this.trippers.find(
            ({ tripper, match }) => match(args) && tripper.isTripped()
        );
        if (openTripper) {
            this.emitter.emit(BreakerEventNames.callBlocked, {
                args,
                tripperName: openTripper.tripper.name
            });
            throw new BreakerError(
                "Circuit breaker is open",
                ErrorCode.BreakerOpen
            );
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
        this.emitter.emit(BreakerEventNames.callAllowed, {
            args
        });
        try {
            return this.wrappedFunction(args).then(result => {
                if (this.failTester.isFailureResult(result)) {
                    this.emitter.emit(BreakerEventNames.invalidResult, {
                        args,
                        result
                    });
                    this.getMatchingTrippers(args).forEach(({ tripper }) =>
                        tripper.recordFailure()
                    );
                    throw new BreakerError(
                        "Invalid function result",
                        ErrorCode.InvalidResult
                    );
                }
                this.emitter.emit(BreakerEventNames.validResult, {
                    args,
                    result
                });
                this.getMatchingTrippers(args).forEach(({ tripper }) =>
                    tripper.recordSuccess()
                );
                return result;
            });
        } catch (error) {
            if (this.failTester.isFailureError(error)) {
                this.emitter.emit(BreakerEventNames.invalidError, {
                    args,
                    error
                });
                this.getMatchingTrippers(args).forEach(({ tripper }) =>
                    tripper.recordFailure()
                );
            } else {
                this.emitter.emit(BreakerEventNames.validError, {
                    args,
                    error
                });
                this.getMatchingTrippers(args).forEach(({ tripper }) =>
                    tripper.recordSuccess()
                );
            }
            throw new BreakerError(
                "Function call failed",
                ErrorCode.FunctionThrew,
                error
            );
        }
    };

    private getMatchingTrippers = (arg: T) => {
        return this.trippers.filter(({ match }) => match(arg));
    };
}
