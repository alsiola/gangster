import { Duration, toMilliseconds, seconds } from "./duration";

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

export class Tripper {
    private outcomes: Outcome[] = [];
    private state: TripperState = TripperState.closed;
    private openToHalfTimeout?: NodeJS.Timer;

    constructor(private tripperOpts: TripperOpts) {
        this.startOldOutcomeRemoval();
    }

    public recordFailure = () => {
        this.outcomes.push({
            success: false,
            timestamp: Date.now()
        });

        if (
            this.state === TripperState.half ||
            this.currentFailurePercentage() >= this.tripperOpts.threshold
        ) {
            this.state = TripperState.open;

            if (this.openToHalfTimeout) {
                clearTimeout(this.openToHalfTimeout);
            }

            this.openToHalfTimeout = setTimeout(() => {
                this.state = TripperState.half;
            }, toMilliseconds(this.tripperOpts.for));
        }
    };

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
        state: this.state
    });

    private startOldOutcomeRemoval = () => {
        setTimeout(
            this.startOldOutcomeRemoval.bind(this),
            toMilliseconds(
                this.tripperOpts.outcomeCleanupInterval || seconds(10)
            )
        );
    };

    private removeOldOutcomes = () => {
        const cutoff = Date.now() - toMilliseconds(this.tripperOpts.within);
        this.outcomes = this.outcomes.filter(
            ({ timestamp }) => timestamp >= cutoff
        );
    };

    private currentFailurePercentage = () => {
        this.removeOldOutcomes();

        const [succeeds, fails] = this.outcomes.reduce(
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
