import { Breaker } from "./breaker";

export enum BreakerEvents {
    failure = "failure",
    closed = "closed",
    opened = "opened"
}

export type EventCallback<T> = (e: T) => void;
export type VoidEventCallBack = () => void;

export type AsyncFunction<T, U> = (a: T) => Promise<U>;

/**
 * This magic converts a union type to an intersection type
 * See: https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 */
type UnionToIntersection<U> = (U extends any
    ? (k: U) => void
    : never) extends ((k: infer I) => void)
    ? I
    : never;

export type TypedEventEmitter<Events, T, U> = UnionToIntersection<
    {
        [K in keyof Events]: {
            on: (a: K, cb: (a: Events[K]) => void) => ThisType<Breaker<T, U>>;
        }
    }[keyof Events]
>;

export type TypedEventEmitterInternal<Events, T, U> = UnionToIntersection<
    {
        [K in keyof Events]: {
            emit: (a: K, data: Events[K]) => void;
        }
    }[keyof Events]
> &
    TypedEventEmitter<Events, T, U>;
