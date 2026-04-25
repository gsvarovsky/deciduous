// noinspection DuplicatedCode

import {describe, test} from "node:test";
import {defaultFrom, Node} from "../lib/node.js"
import {NodeGraph} from "../lib/graph.js";
import {strict as assert} from "node:assert";

test("Fact risk is one", () => {
    const graph = new NodeGraph();
    const node = graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
    assert.equal(node.getRisk().value, 1);
});

test("Attack risk is zero", () => {
    const graph = new NodeGraph();
    const node = graph.add(Node.make("my-risk", "MyRisk", [], "attack", graph));
    assert.equal(node.getRisk().value, 0);
});

test("Goal risk is zero", () => {
    const graph = new NodeGraph();
    const node = graph.add(Node.make("my-goal", "MyGoal", [], "goal", graph));
    assert.equal(node.getRisk().value, 0);
});

test("Fact risk can be affected from reality", () => {
    const graph = new NodeGraph();
    const node = graph.add(Node.make("my-fact", "MyFact", [{
        name: "reality", ...defaultFrom, effect: 0.5
    }], "fact", graph));
    assert.equal(node.getRisk().value, 0.5);
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
    // Note: not mutually exclusive
    // p(my-fact-1*0.1 AND my-fact-2*0.1) = 0.01
    assert.equal(attack.getRisk().value, 0.19);
});

test("Alternatives can be mitigated", () => {
    const graph = new NodeGraph();
    graph.add(Node.make("my-fact-1", "MyFact1", [], "fact", graph));
    graph.add(Node.make("my-fact-2", "MyFact2", [], "fact", graph));
    const attack = graph.add(Node.make("my-attack", "MyAttack", [{
        name: "my-fact-1", ...defaultFrom, effect: 0.1
    }, {
        name: "my-fact-2", ...defaultFrom, effect: 0.1
    }], "attack", graph));
    graph.add(Node.make("my-mitigation", "MyMitigation", [{
        name: "my-attack", ...defaultFrom, effect: 0.5
    }], "mitigation", graph));
    assert.equal(attack.getRisk().value, 0.095);
});

test("Dependent alternatives add less risk", () => {
    const graph = new NodeGraph();
    graph.add(Node.make("my-risk", "MyRisk", [{
        name: "reality", ...defaultFrom, effect: 0.5
    }], "fact", graph));
    graph.add(Node.make("my-attack-1", "MyAttack1", [{
        name: "my-risk", ...defaultFrom, effect: 1
    }], "attack", graph));
    graph.add(Node.make("my-attack-2", "MyAttack2", [{
        name: "my-risk", ...defaultFrom, effect: 1
    }], "attack", graph));
    const goal = graph.add(Node.make("my-goal", "MyGoal", [{
        name: "my-attack-1", ...defaultFrom, effect: 0.5
    }, {
        name: "my-attack-2", ...defaultFrom, effect: 0.5
    }], "attack", graph));
    // 0.25+0.25-(0.25*0.5)
    assert.equal(goal.getRisk().value, 0.375);
});

test("Requirements reduce risk", () => {
    const graph = new NodeGraph();
    graph.add(Node.make("my-fact-1", "MyFact1", [], "fact", graph));
    graph.add(Node.make("my-fact-2", "MyFact2", [], "fact", graph));
    const attack = graph.add(Node.make("my-attack", "MyAttack", [{
        name: "my-fact-1", ...defaultFrom, effect: 0.5
    }, {
        name: "my-fact-2", ...defaultFrom, effect: 0.5, required: true
    }], "attack", graph));
    assert.equal(attack.getRisk().value, 0.25);
});

test("Dependent requirements reduce risk less", () => {
    const graph = new NodeGraph();
    graph.add(Node.make("my-risk", "MyRisk", [{
        name: "reality", ...defaultFrom, effect: 0.5
    }], "fact", graph));
    graph.add(Node.make("my-attack-1", "MyAttack1", [{
        name: "my-risk", ...defaultFrom, effect: 1
    }], "attack", graph));
    graph.add(Node.make("my-attack-2", "MyAttack2", [{
        name: "my-risk", ...defaultFrom, effect: 1
    }], "attack", graph));
    const goal = graph.add(Node.make("my-goal", "MyGoal", [{
        name: "my-attack-1", ...defaultFrom, effect: 0.5, required: true
    }, {
        name: "my-attack-2", ...defaultFrom, effect: 0.5, required: true
    }], "goal", graph));
    // 0.5^3 = 0.125 (not 0.5^4)
    assert.equal(goal.getRisk().value, 0.125);
});

test("Asymmetric dependent requirements commute", () => {
    function makeAsymmetricGoal(attack1Effect: number, attack2Effect: number) {
        const graph = new NodeGraph();
        graph.add(Node.make("my-risk", "MyRisk", [{
            name: "reality", ...defaultFrom, effect: 0.5
        }], "fact", graph));
        graph.add(Node.make("my-attack-1", "MyAttack1", [{
            name: "my-risk", ...defaultFrom, effect: 1
        }], "attack", graph));
        graph.add(Node.make("my-attack-2", "MyAttack2", [{
            name: "my-risk", ...defaultFrom, effect: 1
        }], "attack", graph));
        return graph.add(Node.make("my-goal", "MyGoal", [{
            name: "my-attack-1", ...defaultFrom, effect: attack1Effect, required: true
        }, {
            name: "my-attack-2", ...defaultFrom, effect: attack2Effect, required: true
        }], "goal", graph));
    }
    let actual1 = makeAsymmetricGoal(0.5, 0.05).getRisk().value;
    let actual2 = makeAsymmetricGoal(0.05, 0.5).getRisk().value;
    assert.equal(actual1, 0.0125);
    assert.equal(actual1, actual2);
});

describe("Node cuts", () => {
    test("Fact cut is self", () => {
       const graph = new NodeGraph();
       const fact = graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
       assert.deepEqual(fact.cuts, [new Set([fact])]);
    });

    test("Cut with one option is one edge", () => {
        const graph = new NodeGraph();
        const fact = graph.add(Node.make("my-fact", "MyFact", [], "fact", graph));
        const attack = graph.add(Node.make("my-attack", "MyAttack", [{
            name: "my-fact", ...defaultFrom
        }], "attack", graph));
        assert.deepEqual(attack.cuts, [new Set([fact, attack])]);
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
        assert.deepEqual(attack.cuts, [new Set([fact1, attack]), new Set([fact2, attack])]);
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
        assert.deepEqual(attack.cuts, [new Set([fact1, fact2, attack])]);
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
        assert.deepEqual(attack.cuts, [new Set([fact1, fact2, attack])]);
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
        assert.deepEqual(attack.cuts, [new Set([fact1, fact3, attack]), new Set([fact2, fact3, attack])]);
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
        assert.deepEqual(goal.cuts, [new Set([fact, attack1, goal]), new Set([fact, attack2, goal])]);
    });
});
