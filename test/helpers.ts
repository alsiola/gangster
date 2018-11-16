import { Duration } from "../src";
import { toMilliseconds } from "../src/duration";

export const delay = (duration: Duration): Promise<void> =>
    new Promise(r => setTimeout(r, toMilliseconds(duration)));
