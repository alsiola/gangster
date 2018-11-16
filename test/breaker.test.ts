import { Breaker } from "../src/breaker";
import { FailTester, seconds } from "../src";
import { delay } from "./helpers";

type TestFunction = (a: TestArgs) => Promise<TestResults>;

enum TestResults {
    good = "good",
    bad = "bad"
}

enum TestArgs {
    good = "good",
    bad = "bad",
    goodVar = "goodVar",
    badVar = "badVar"
}

describe("breaker", () => {
    let testFunction: TestFunction;

    beforeEach(() => {
        testFunction = jest.fn(a => {
            if (a === TestArgs.good || a === TestArgs.goodVar) {
                return Promise.resolve(TestResults.good);
            } else {
                throw TestResults.bad;
            }
        });
    });

    it("allows calls when the default tripper is closed", async () => {
        const breaker = new Breaker(testFunction, {
            name: "test",
            failTester: new FailTester(),
            defaultTripper: {
                for: seconds(1),
                within: seconds(10),
                threshold: 50
            },
            matchTrippers: []
        });

        const result = await breaker.call(TestArgs.good);

        expect(result).toBe(TestResults.good);
    });

    it("prevents calls when the default tripper is open", async () => {
        const breaker = new Breaker(testFunction, {
            name: "test",
            failTester: new FailTester(),
            defaultTripper: {
                for: seconds(1),
                within: seconds(10),
                threshold: -1
            },
            matchTrippers: []
        });

        expect(() => breaker.call(TestArgs.bad)).toThrowError();

        expect(testFunction).toHaveBeenCalledTimes(1);

        expect(() => breaker.call(TestArgs.good)).toThrowError();

        expect(testFunction).toHaveBeenCalledTimes(1);
    });

    it("prevents calls matching arguments when the match tripper is open", async () => {
        const breaker = new Breaker(testFunction, {
            name: "test",
            failTester: new FailTester<TestResults>(),
            defaultTripper: {
                for: seconds(1),
                within: seconds(10),
                threshold: -1
            },
            matchTrippers: [
                {
                    name: "test-match",
                    match: a => a === TestArgs.goodVar || a === TestArgs.badVar,
                    for: seconds(1),
                    within: seconds(10),
                    threshold: -1
                }
            ]
        });

        expect(() => breaker.call(TestArgs.badVar)).toThrowError();

        expect(testFunction).toHaveBeenCalledTimes(1);

        expect(() => breaker.call(TestArgs.goodVar)).toThrowError();

        expect(testFunction).toHaveBeenCalledTimes(1);
    });

    it("allows calls not matching arguments when the match tripper is open", async () => {
        const breaker = new Breaker(testFunction, {
            name: "test",
            failTester: new FailTester<TestResults>(),
            defaultTripper: {
                for: seconds(0.01),
                within: seconds(10),
                threshold: 51
            },
            matchTrippers: [
                {
                    name: "test-match",
                    match: a => a === TestArgs.goodVar || a === TestArgs.badVar,
                    for: seconds(1),
                    within: seconds(10),
                    threshold: -1
                }
            ]
        });

        breaker.call(TestArgs.good);

        expect(() => breaker.call(TestArgs.badVar)).toThrowError();

        await delay(seconds(0.1));

        const result = await breaker.call(TestArgs.good);

        expect(result).toBe(TestResults.good);
    });
});
