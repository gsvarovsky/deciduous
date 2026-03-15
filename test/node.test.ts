import {test} from "node:test";
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
