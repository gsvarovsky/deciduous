import {describe, test} from "node:test";
import {strict as assert} from "node:assert";
import {combinations, depAnd, depOr, cartesian} from "../lib/stats.js";

describe("combinations", () => {
    test("of no items", () => {
        assert.deepEqual([], [...combinations([])]);
    });

    test("of one item", () => {
        assert.deepEqual([[1]], [...combinations([1])]);
    });

    test("of two items", () => {
        assert.deepEqual([[1], [2], [1, 2]], [...combinations([1, 2])]);
    });

    test("of three items", () => {
        assert.deepEqual([[1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]], [...combinations([1, 2, 3])]);
    });
});

describe("dependent AND", () => {
    test("of one event", () => {
        assert.equal(0.5, depAnd(e => e === "E" ? 0.5 : NaN, "E"));
    });

    test("of independent events", () => {
        assert.equal(0.25, depAnd(e => e === "E" ? 0.5 : e === "F" ? 0.5 : NaN, "E", "F"));
    });

    test("of dependent events", () => {
        assert.equal(0.125, depAnd((e, f) =>
            // p(E) = 0.5, p(F) = 0.5, p(F|E) = 0.25
            e === "E" ? 0.5 : e === "F" ? f === "E" ? 0.25 : 0.5 : NaN, "E", "F"));
    });
});

describe("dependent OR", () => {
    test("of one event", () => {
        assert.equal(0.5, depOr(e => e === "E" ? 0.5 : NaN, "E"));
    });

    test("of independent events", () => {
        assert.equal(0.75, depOr(e => e === "E" ? 0.5 : e === "F" ? 0.5 : NaN, "E", "F"));
    });

    test("of dependent events", () => {
        assert.equal(0.875, depOr((e, f) =>
            // p(E) = 0.5, p(F) = 0.5, p(F|E) = 0.25 => p(F and E) = 0.125
            e === "E" ? 0.5 : e === "F" ? f === "E" ? 0.25 : 0.5 : NaN, "E", "F"));
    });
});

describe("Cartesian", () => {
    test("of no arrays", () => {
       assert.deepEqual([...cartesian([])], []);
    });

    test("of singleton array", () => {
       assert.deepEqual([...cartesian([[1]])], [[1]]);
    });

    test("of two singleton arrays", () => {
       assert.deepEqual([...cartesian([[1], [2]])], [[1, 2]]);
    });

    test("of two arrays", () => {
        assert.deepEqual([...cartesian([[1], [2, 3]])], [[1, 2], [1, 3]]);
    });

    test("of two complex arrays", () => {
        assert.deepEqual([...cartesian([[1, 4], [2, 3]])], [[1, 2], [1, 3], [4, 2], [4, 3]]);
    });
});