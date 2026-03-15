import {describe, test} from "node:test";
import {defaultFrom, Node} from "../lib/node.js"
import {NodeGraph} from "../lib/graph.js";
import {strict as assert} from "node:assert";

test("Fact risk is one", () => {
    const graph = new NodeGraph();
    const node = graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
    assert.equal(node.getRisk().value, 1);
});

test("Attack inherits risk", () => {
    const graph = new NodeGraph();
    graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
    const attack = graph.add(Node.make("my-attack", "MyAttack", [{
        name: "my-fact", ...defaultFrom
    }], "attack", graph));
    assert.equal(attack.getRisk().value, 1);
});

test("Effect affects risk", () => {
    const graph = new NodeGraph();
    graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
    const attack = graph.add(Node.make("my-attack", "MyAttack", [{
        name: "my-fact", ...defaultFrom, effect: 0.5
    }], "attack", graph));
    assert.equal(attack.getRisk().value, 0.5);
});

test("Risk is zero if nothing sufficient", () => {
    const graph = new NodeGraph();
    graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
    const attack = graph.add(Node.make("my-attack", "MyAttack", [{
        name: "my-fact", ...defaultFrom, sufficient: false
    }], "attack", graph));
    assert.equal(attack.getRisk().value, 0);
});

test("Mitigation reduces risk", () => {
    const graph = new NodeGraph();
    const fact = graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
    graph.add(Node.make("my-mitigation", "MyMitigation", [{
        name: "my-fact", ...defaultFrom, effect: 0.5
    }], "mitigation", graph));
    assert.equal(fact.getRisk().value, 0.5);
});

test("Alternatives add risk", () => {
    const graph = new NodeGraph();
    graph.add(Node.make("my-fact-1", "MyFact1", [], "fact", graph));
    graph.add(Node.make("my-fact-2", "MyFact2", [], "fact", graph));
    const attack = graph.add(Node.make("my-attack", "MyAttack", [{
        name: "my-fact-1", ...defaultFrom, effect: 0.1
    }, {
        name: "my-fact-2", ...defaultFrom, effect: 0.1
    }], "attack", graph));
    assert.equal(attack.getRisk().value, 0.2);
});

test("Requirements reduce risk", () => {
    const graph = new NodeGraph();
    graph.add(Node.make("my-fact-1", "MyFact1", [], "fact", graph));
    graph.add(Node.make("my-fact-2", "MyFact2", [], "fact", graph));
    const attack = graph.add(Node.make("my-attack", "MyAttack", [{
        name: "my-fact-1", ...defaultFrom, effect: 0.1
    }, {
        name: "my-fact-2", ...defaultFrom, effect: 0.1, required: true
    }], "attack", graph));
    assert.equal(attack.getRisk().value.toPrecision(5), 0.01.toPrecision(5));
});

describe("Node cuts", () => {
    test("Fact cut is self", () => {
       const graph = new NodeGraph();
       const fact = graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
       assert.deepEqual([...fact.cuts()], [new Set([fact])]);
    });

    test("Cut with one option is one edge", () => {
        const graph = new NodeGraph();
        const fact = graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
        const attack = graph.add(Node.make("my-attack", "MyAttack", [{
            name: "my-fact", ...defaultFrom
        }], "attack", graph));
        assert.deepEqual([...attack.cuts()], [new Set([fact, attack])]);
    });

    test("Cut with two options is both edges", () => {
        const graph = new NodeGraph();
        const fact1 = graph.add(Node.make("my-fact-1", "MyFact1", [], "fact", graph));
        const fact2 = graph.add(Node.make("my-fact-2", "MyFact2", [], "fact", graph));
        const attack = graph.add(Node.make("my-attack", "MyAttack", [{
            name: "my-fact-1", ...defaultFrom
        }, {
            name: "my-fact-2", ...defaultFrom
        }], "attack", graph));
        assert.deepEqual(new Set(attack.cuts()), new Set([new Set([fact1, attack]), new Set([fact2, attack])]));
    });

    test("Cut with option and required is option edge with given", () => {
        const graph = new NodeGraph();
        const fact1 = graph.add(Node.make("my-fact-1", "MyFact1", [], "fact", graph));
        const fact2 = graph.add(Node.make("my-fact-2", "MyFact2", [], "fact", graph));
        const attack = graph.add(Node.make("my-attack", "MyAttack", [{
            name: "my-fact-1", ...defaultFrom
        }, {
            name: "my-fact-2", ...defaultFrom, required: true
        }], "attack", graph));
        assert.deepEqual(new Set(attack.cuts()), new Set([new Set([fact1, fact2, attack])]));
    });

    test("Cut with two required is both given", () => {
        const graph = new NodeGraph();
        const fact1 = graph.add(Node.make("my-fact-1", "MyFact1", [], "fact", graph));
        const fact2 = graph.add(Node.make("my-fact-2", "MyFact2", [], "fact", graph));
        const attack = graph.add(Node.make("my-attack", "MyAttack", [{
            name: "my-fact-1", ...defaultFrom, required: true
        }, {
            name: "my-fact-2", ...defaultFrom, required: true
        }], "attack", graph));
        assert.deepEqual(new Set(attack.cuts()), new Set([new Set([fact1, fact2, attack])]));
    });

    test("Cut with two options and one required is both edges with given", () => {
        const graph = new NodeGraph();
        const fact1 = graph.add(Node.make("my-fact-1", "MyFact1", [], "fact", graph));
        const fact2 = graph.add(Node.make("my-fact-2", "MyFact2", [], "fact", graph));
        const fact3 = graph.add(Node.make("my-fact-3", "MyFact3", [], "fact", graph));
        const attack = graph.add(Node.make("my-attack", "MyAttack", [{
            name: "my-fact-1", ...defaultFrom
        }, {
            name: "my-fact-2", ...defaultFrom
        }, {
            name: "my-fact-3", ...defaultFrom, required: true
        }], "attack", graph));
        assert.deepEqual(new Set(attack.cuts()), new Set([new Set([fact1, fact3, attack]), new Set([fact2, fact3, attack])]));
    });

    test("Cut diamond is both sides", () => {
        const graph = new NodeGraph();
        const fact = graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
        const attack1 = graph.add(Node.make("my-pre-1", "MyPre1", [{
            name: "my-fact", ...defaultFrom
        }], "attack", graph));
        const attack2 = graph.add(Node.make("my-pre-2", "MyPre2", [{
            name: "my-fact", ...defaultFrom
        }], "attack", graph));
        const goal = graph.add(Node.make("my-goal", "MyGoal", [{
            name: "my-pre-1", ...defaultFrom
        }, {
            name: "my-pre-2", ...defaultFrom
        }], "goal", graph));
        assert.deepEqual(new Set(goal.cuts()), new Set([new Set([fact, attack1, goal]), new Set([fact, attack2, goal])]));
    });
});
