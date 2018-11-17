import { Breaker, BreakerOpts, BreakerInternalOpts } from "./breaker";
import { AsyncFunction } from "./types";

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
