import {describe, test} from "node:test";
import {strict as assert} from "node:assert";

import {simplifyUnion, union} from "../lib/sets.js";

describe("Union of cuts", () => {
    test("Union of nothing", () => {
        assert.deepEqual(union([new Set()]), new Set());
    });

    test("Union of one thing", () => {
        assert.deepEqual(union([new Set(["A"])]), new Set(["A"]));
    });

    test("Union of two disjoint", () => {
        assert.deepEqual(union([new Set(["A"]), new Set(["B"])]), new Set(["A", "B"]));
    });

    test("Union of two intersecting", () => {
        assert.deepEqual(union([new Set(["A", "B"]), new Set(["B", "C"])]), new Set(["A", "B", "C"]));
    });

    test("Union of two intersecting", () => {
        assert.deepEqual(union([new Set(["A", "B"]), new Set(["B", "C"])]), new Set(["A", "B", "C"]));
    });

    test("Union with bound", () => {
        assert.deepEqual(union([new Set(["A", "B"]), new Set(["B", "C"])], [new Set(["A", "C"])]), new Set(["A", "C"]));
    });
});

describe("Optimisation of union of intersections", () => {
   test("Single union no-op", () => {
      assert.deepEqual(simplifyUnion([new Set(["A"])]), [new Set(["A"])]);
   });

   test("Union of same singleton", () => {
      assert.deepEqual(simplifyUnion([new Set(["A"]), new Set(["A"])]), [new Set(["A"])]);
   });

   test("Union of same non-singleton", () => {
      assert.deepEqual(simplifyUnion([new Set(["A", "B"]), new Set(["A", "B"])]), [new Set(["A", "B"])]);
   });

   test("Union with same", () => {
      assert.deepEqual(simplifyUnion([new Set(["A"]), new Set(["A"]), new Set(["B"])]), [new Set(["A"]), new Set(["B"])]);
   });

   test("Disjoint no-op", () => {
      assert.deepEqual(simplifyUnion([new Set(["A"]), new Set(["B"])]), [new Set(["A"]), new Set(["B"])]);
   });

    test("Removes empty intersection", () => {
        assert.deepEqual(simplifyUnion([new Set(["A"]), new Set()]), [new Set(["A"])]);
    });

    test("Removes single element diff", () => {
      assert.deepEqual(simplifyUnion([new Set(["A", "B"]), new Set(["B"])]), [new Set(["B"])]);
   });

   test("Removes multiple element diff", () => {
      assert.deepEqual(simplifyUnion([
          new Set(["F", "A"]),
          new Set(["F", "D", "A"]),
          new Set(["B", "C"])
      ]), [
          new Set(["F", "A"]),
          new Set(["B", "C"])
      ]);
   });

   test("Not order sensitive", () => {
       function compareFn(s1: ReadonlySet<String>, s2: ReadonlySet<String>) {
           return String([...s1].sort()).localeCompare(String([...s2].sort()));
       }
       assert.deepEqual(simplifyUnion([
          new Set(["F", "A"]),
          new Set(["F", "D", "A"]),
          new Set(["B", "C"])
      ]).sort(compareFn), simplifyUnion([
          new Set(["F", "D", "A"]),
          new Set(["B", "C"]),
          new Set(["F", "A"])
      ]).sort(compareFn));
   });

   test("No remove not subset", () => {
      assert.deepEqual(simplifyUnion([
          new Set(["F", "A"]),
          new Set(["F", "D", "A", "B"]),
          new Set(["B", "C"]) // B not removed from here
      ]), [
          new Set(["F", "A"]),
          new Set(["B", "C"])
      ]);
   });
});