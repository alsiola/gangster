import { Breaker, BreakerOpts, BreakerInternalOpts } from "./breaker";
import { AsyncFunction } from "./types";

export class Circuits<TResult> {
    private breakers: Breaker<any, TResult>[] = [];
    constructor(private breakerOpts: BreakerOpts<any, TResult>) {}

    public createBreaker = <T>(
        f: AsyncFunction<T, TResult>
    ): Breaker<T, TResult> => {
        const breaker = new Breaker(f, this.breakerOpts);
        this.breakers.push(breaker);
        return breaker;
    };

    public status = () => {
        return this.breakers.map(breaker => breaker.status());
    };
}
