import { Breaker, BreakerOpts } from "./breaker";
import { AsyncFunction } from "./types";

/**
 * Provides a factory function for breakers, and allows interrogation
 * of status of the entire collection.
 */
export class Circuits {
    private breakers: Breaker<any, any>[] = [];
    constructor(private breakerOpts: BreakerOpts<any, any>) {}

    public createBreaker = <T, U>(f: AsyncFunction<T, U>): Breaker<T, U> => {
        const breaker = new Breaker(f, this.breakerOpts);
        this.breakers.push(breaker);
        return breaker;
    };

    public status = () => {
        return this.breakers.map(breaker => breaker.status());
    };
}
