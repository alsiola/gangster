import { Tripper, TripperState } from "../src/tripper";
import { seconds, Duration } from "../src";
import { toMilliseconds } from "../src/duration";
import { delay } from "./helpers";

describe("Tripper", () => {
    it("tracks failure rate", () => {
        const tripper = new Tripper({
            threshold: 20,
            for: seconds(30),
            within: seconds(100),
            breakerName: "test",
            name: "tripper"
        });

        expect(tripper.status().currentFailurePercentage).toBe(0);

        tripper.recordSuccess();
        expect(tripper.status().currentFailurePercentage).toBe(0);

        tripper.recordFailure();
        expect(tripper.status().currentFailurePercentage).toBe(50);
    });

    it("opens when failure rate exceeds threshold", () => {
        const tripper = new Tripper({
            threshold: 51,
            for: seconds(30),
            within: seconds(100),
            breakerName: "test",
            name: "tripper"
        });

        tripper.recordSuccess();
        expect(tripper.isTripped()).toBe(false);

        tripper.recordFailure();
        expect(tripper.isTripped()).toBe(false);

        tripper.recordFailure();
        expect(tripper.isTripped()).toBe(true);
    });

    it("enters half-open state after for interval expires", async () => {
        const tripper = new Tripper({
            threshold: 51,
            for: seconds(0.1),
            within: seconds(100),
            breakerName: "test",
            name: "tripper"
        });

        tripper.recordSuccess();
        tripper.recordFailure();
        tripper.recordFailure();

        expect(tripper.status().state).toBe(TripperState.open);

        await delay(seconds(0.05));

        expect(tripper.status().state).toBe(TripperState.open);

        await delay(seconds(0.05));

        expect(tripper.status().state).toBe(TripperState.half);
    });

    it("opens immediately after failed call in half-open state", async () => {
        const tripper = new Tripper({
            threshold: 51,
            for: seconds(0.1),
            within: seconds(100),
            breakerName: "test",
            name: "tripper"
        });

        tripper.recordSuccess();
        tripper.recordFailure();
        tripper.recordFailure();

        expect(tripper.status().state).toBe(TripperState.open);

        await delay(seconds(0.1));

        expect(tripper.status().state).toBe(TripperState.half);

        tripper.recordFailure();

        expect(tripper.status().state).toBe(TripperState.open);
    });

    it("closes immediately after success call in half-open state", async () => {
        const tripper = new Tripper({
            threshold: 51,
            for: seconds(0.1),
            within: seconds(100),
            breakerName: "test",
            name: "tripper"
        });

        tripper.recordSuccess();
        tripper.recordFailure();
        tripper.recordFailure();

        expect(tripper.status().state).toBe(TripperState.open);

        await delay(seconds(0.1));

        expect(tripper.status().state).toBe(TripperState.half);

        tripper.recordSuccess();

        expect(tripper.status().state).toBe(TripperState.closed);
    });

    it("only uses outcomes within specified interval", async () => {
        const tripper = new Tripper({
            threshold: 51,
            for: seconds(10),
            within: seconds(0.1),
            breakerName: "test",
            name: "tripper"
        });

        tripper.recordSuccess();
        tripper.recordFailure();
        tripper.recordFailure();
        tripper.recordFailure();
        tripper.recordFailure();

        expect(tripper.status().currentFailurePercentage).toBe(80);

        await delay(seconds(0.15));

        tripper.recordSuccess();
        tripper.recordFailure();

        expect(tripper.status().currentFailurePercentage).toBe(50);
    });
});
