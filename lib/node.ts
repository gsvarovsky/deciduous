import {AndRisk, OrRisk, Risk} from "./risk.js";
import type {NodeGraph} from "./graph.js";
import {Scenario} from "./scenario.js";
import {cartesian} from "./stats.js";

export type NodeType = "attack" | "mitigation" | "fact" | "goal";

export interface EffectFlags {
    required: boolean; // Default false
    sufficient: boolean; // Default true
}

export interface FromFlags extends EffectFlags {
    backwards: boolean; // Default false
    ungrouped: boolean; // Default false
}

export type From = FromFlags & {
    name: string;
    effect: number | undefined;
    label?: "#yolosec" | string;
};

export const defaultFrom: Omit<From, "name"> = {
    label: undefined,
    backwards: false,
    ungrouped: false,
    required: false,
    sufficient: true,
    effect: undefined
};

type Cut = Set<Node>;

export class Node {
    private riskScenarios: { [scenarioKey: string | symbol]: Risk } = {};
    private cutCalcs: {[token: symbol]: true} = {};

    static make(
       name: string,
       label: string,
       from: From[],
       type: NodeType,
       graph: NodeGraph
    ): Node {
       switch (type) {
           case "mitigation": return new Mitigation(name, label, from, type, graph);
           default: return new Node(name, label, from, type, graph);
       }
    }

    protected constructor(
        readonly name: string,
        readonly label: string,
        readonly from: From[],
        readonly type: NodeType,
        protected readonly graph: NodeGraph
    ) {}

    /**
     * Always yields at least [Set(this)]
     */
    *cuts(token = Symbol()): Generator<Cut> {
        if (this.cutCalcs.hasOwnProperty(token))
            return;
        this.cutCalcs[token] = true;
        // (1 AND a AND c) OR (1 AND a AND d) OR ...
        const cutIntersection = [...cartesian(this.cutUnion(token))];
        let yielded = false;
        for (let cuts of cutIntersection) {
            yield new Set(Array<Node>(this).concat(...cuts.map(cut => [...cut])));
            yielded = true;
        }
        // There were no from cuts
        if (!yielded)
            yield new Set([this]);
        delete this.cutCalcs[token];
    }

    /**
     * [opt1 OR opt2] AND [req1] AND [req2]
     */
    private fromUnion(): Node[][] {
        const options: Node[] = [];
        const union: Node[][] = [options];
        for (let from of this.riskFroms()) {
            const fromNode = this.graph.get(from.name);
            if (fromNode != null) {
                if (from.required) {
                    union.push([fromNode]);
                } else {
                    options.push(fromNode);
                }
            }
        }
        // If there were no options we still want the required
        if (!options.length)
            union.shift();
        return union;
    }

    /**
     * ((1 OR 2) OR (3 OR 4)) AND (a OR b) AND (c OR d)
     * where 1-4 are cuts of options and a-d are cuts of required
     */
    private cutUnion(token: symbol) {
        // Translate every from node to a set of cuts
        return this.fromUnion().map(nodes => {
            const cuts: Cut[] = [];
            for (let node of nodes)
                cuts.push(...node.cuts(token));
            return cuts;
        });
    }

    *riskFroms() {
        if (this.from.some(from => from.sufficient)) {
            for (let from of this.from) {
                if (!from.backwards) { // TODO: effect of backwards on risk
                    yield from;
                }
            }
        }
    }

    getRisk(scenario: Scenario = Scenario.none): Risk {
        if (this.riskScenarios[scenario.key] == null) {
            const andCalc = new AndRisk();
            this.riskScenarios[scenario.key] = andCalc;
            try {
                const orCalc = new OrRisk(this.from.length === 0);
                andCalc.add(orCalc);
                // Incoming attack/fact risks and effects on the risk
                for (let from of this.riskFroms()) {
                    const theirRisk = this.graph.get(from.name)?.getRisk(scenario);
                    const incomingEffect = this.incomingRiskEffect(from);
                    if (from.required) {
                        andCalc.add([theirRisk?.value, incomingEffect]);
                    } else {
                        orCalc.add([theirRisk?.value, incomingEffect]);
                    }
                }
                // Outgoing mitigation effects (no inherent risks)
                for (let toNode of this.graph.all) {
                    for (let from of toNode.from) {
                        if (toNode.name !== scenario.omit?.name && from.name === this.name) {
                            andCalc.add([toNode.outgoingRiskEffect(from)]);
                        }
                    }
                }
                andCalc.finalOk();
            } catch (e) {
                if (e === "#REC!")
                    return andCalc.finalRecursive();
                throw e;
            }
        }
        return this.riskScenarios[scenario.key];
    }

    getPriority() {
        return this.getRisk().value;
    }

    getDisplayValue(display: "value" | "calc"): string {
        // Default is to show risk probability
        let value: string;
        switch (display) {
            case "value":
                if (this.getRisk().value > 1)
                    value = ">1!";
                else
                    value = this.getRisk().value.toPrecision(4);
                break;
            case "calc":
                value = this.getRisk().calc;
                break;
            default:
                value = `#${display}?`;
        }
        return `ℙ:${value}`;
    }

    // Most node types have incoming effects
    protected incomingRiskEffect(from: From): number | undefined {
        return from.effect ?? 1;
    }

    protected outgoingRiskEffect(_from: From): number | undefined {
        return undefined;
    }
}

class Mitigation extends Node {
    private priority = -1;

    getPriority() {
        if (this.priority == -1) {
            // Mitigation Priority is the average effect on attacker goals
            let value = 0, count = 0;
            for (let goal of this.graph.goals) {
                value += goal.getRisk(Scenario.none.withOmit(this)).value - goal.getRisk(Scenario.none).value;
                count++;
            }
            this.priority = value / count;
            // Inherit the priority of dependent  mitigations
            for (let toNode of this.graph.all) {
                for (let from of toNode.from) {
                    if (toNode.type === "mitigation" && from.name === this.name) {
                        this.priority += toNode.getPriority();
                    }
                }
            }
        }
        return this.priority;
    }

    getDisplayValue() {
        // Mitigations display their value in preventing goals
        return `𝛿:${(this.getPriority().toPrecision(4))}`;
    }

    protected incomingRiskEffect() {
        return undefined;
    }

    // A mitigation effect is outgoing
    protected outgoingRiskEffect(from: From) {
        return 1 - (from.effect ?? 0); // effect is mitigating
    }
}

