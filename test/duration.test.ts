import { minutes, seconds } from "../src";
import { milliseconds, toMilliseconds } from "../src/duration";

describe("duration", () => {
    it("converts minutes to milliseconds", () => {
        const input = minutes(5);
        const actual = toMilliseconds(input);

        expect(actual).toBe(5 * 60 * 1000);
    });

    it("converts seconds to milliseconds", () => {
        const input = seconds(5);
        const actual = toMilliseconds(input);

        expect(actual).toBe(5 * 1000);
    });

    it("converts milliseconds to milliseconds", () => {
        const input = milliseconds(5);
        const actual = toMilliseconds(input);

        expect(actual).toBe(5);
    });
});
