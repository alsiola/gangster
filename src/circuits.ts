import { Breaker, BreakerOpts } from "./breaker";
import { AsyncFunction } from "./types";

export class Circuits<TResult> {
    private breakers: Breaker<any, TResult>[] = [];
    constructor(private breakerOpts: BreakerOpts<TResult>) {}

    public createBreaker = <T>(
        name: string,
        f: AsyncFunction<T, TResult>
    ): Breaker<T, TResult> => {
        const breaker = new Breaker(
            this.getBreakerName(name),
            f,
            this.breakerOpts
        );
        this.breakers.push(breaker);
        return breaker;
    };

    public status = () => {
        return this.breakers.map(breaker => breaker.status());
    };

    private getBreakerName = (name: string) => {
        return `${this.breakerOpts.name}.${name}`;
    };
}
