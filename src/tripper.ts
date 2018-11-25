import { Duration, toMilliseconds, seconds } from "./duration";
import { TypedEventEmitter, TypedEventEmitterInternal } from "./types";
import { TripperEvents, TripperEventNames } from "./events";
import { EventEmitter } from "events";

export interface CreateDefaultTripperOpts {
    threshold: number;
    within: Duration;
    for: Duration;
    outcomeCleanupInterval?: Duration;
}

export interface CreateMatcherTripperOpts extends CreateDefaultTripperOpts {
    name: string;
}

export interface TripperOpts extends CreateMatcherTripperOpts {
    breakerName: string;
}

interface Outcome {
    success: boolean;
    timestamp: number;
}

export enum TripperState {
    closed = "closed",
    half = "half",
    open = "open"
}

/**
 * Maintains state on call outcomes, and encapsulates logic
 * around opening/closing the call circuit
 */
export class Tripper implements TypedEventEmitter<TripperEvents, Tripper> {
    private outcomes: Outcome[] = [];
    private state: TripperState = TripperState.closed;
    private openToHalfTimeout?: NodeJS.Timer;
    private emitter: TypedEventEmitterInternal<TripperEvents, Tripper>;

    public name: string;

    constructor(private tripperOpts: TripperOpts) {
        this.startOldOutcomeRemoval();
        this.name = tripperOpts.name;
        this.emitter = new EventEmitter() as any;
    }

    public on: TypedEventEmitter<TripperEvents, Tripper>["on"] = (
        event,
        cb
    ) => {
        this.emitter.on(event, cb);
        return this;
    };

    /**
     * When we get a failure, if:
     * half-open - immediately go full open
     * closed - open only if this pushes us over threshold
     */
    public recordFailure = () => {
        this.outcomes.push({
            success: false,
            timestamp: Date.now()
        });

        if (
            this.state === TripperState.half ||
            this.currentFailurePercentage() >= this.tripperOpts.threshold
        ) {
            this.open();
        }
    };

    /**
     * When we get a success
     * If half open, we can now go to closed
     */
    public recordSuccess = () => {
        this.outcomes.push({
            success: true,
            timestamp: Date.now()
        });

        if (this.state === TripperState.half) {
            this.state = TripperState.closed;
        }
    };

    public isTripped = () => this.state === TripperState.open;

    public status = () => ({
        currentFailurePercentage: this.currentFailurePercentage(),
        state: this.state,
        name: this.tripperOpts.name
    });

    /**
     * Open the breaker to prevent calls
     * The openToHalfTimeout is kept in local state so that if simultaneous
     * calls cause opening, we don't create multiple timeouts
     */
    private open() {
        this.state = TripperState.open;

        this.emitter.emit(TripperEventNames.opened, { tripperName: this.name });

        if (this.openToHalfTimeout) {
            clearTimeout(this.openToHalfTimeout);
        }

        this.openToHalfTimeout = setTimeout(() => {
            this.state = TripperState.half;
        }, toMilliseconds(this.tripperOpts.for));
    }

    /**
     * Every outcomeCleanupInterval, look for and remove stored outcomes
     * that are no longer relevant, according to the within measure
     */
    private startOldOutcomeRemoval = () => {
        setTimeout(
            this.startOldOutcomeRemoval.bind(this),
            toMilliseconds(
                this.tripperOpts.outcomeCleanupInterval || seconds(10)
            )
        );
    };

    /**
     * Remove outcomes that are out of the period within which we are interested
     * Returns all outcomes so that other methods can get a snapshot
     */
    private removeOldOutcomes = () => {
        const cutoff = Date.now() - toMilliseconds(this.tripperOpts.within);
        const inScopeOutcomes = this.outcomes.filter(
            ({ timestamp }) => timestamp >= cutoff
        );
        this.outcomes = inScopeOutcomes;
        return inScopeOutcomes;
    };

    /**
     * Calculate the percentage of calls that have failed within the interested
     * period (within)
     */
    private currentFailurePercentage = () => {
        // Get a snapshot of outcomes relevant to now
        const outcomes = this.removeOldOutcomes();

        const [succeeds, fails] = outcomes.reduce(
            ([s, f], { success }) => [
                s + (success ? 1 : 0),
                f + (success ? 0 : 1)
            ],
            [0, 0]
        );

        if (fails === 0) {
            return 0;
        }

        return (100 * fails) / (succeeds + fails);
    };
}
