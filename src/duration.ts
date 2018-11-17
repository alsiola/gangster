export enum DurationInterval {
    Milliseconds = "Milliseconds",
    Seconds = "Seconds",
    Minutes = "Minutes"
}

export interface Duration {
    interval: DurationInterval;
    value: number;
}

export const milliseconds = (value: number): Duration => ({
    interval: DurationInterval.Milliseconds,
    value
});

export const seconds = (value: number): Duration => ({
    interval: DurationInterval.Seconds,
    value
});

export const minutes = (value: number): Duration => ({
    interval: DurationInterval.Minutes,
    value
});

export const toMilliseconds = (duration: Duration): number => {
    switch (duration.interval) {
        case DurationInterval.Milliseconds:
            return duration.value;
        case DurationInterval.Minutes:
            return 60 * duration.value * MS_PER_SEC;
        case DurationInterval.Seconds:
            return duration.value * MS_PER_SEC;
    }
};

const MS_PER_SEC = 1000;
