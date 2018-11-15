export enum BreakerEvents {
    failure = "failure",
    closed = "closed",
    opened = "opened"
}

export type EventCallback<T> = (e: T) => void;
export type VoidEventCallBack = () => void;

export type AsyncFunction<T, U> = (a: T) => Promise<U>;
