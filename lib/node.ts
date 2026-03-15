import {AndRisk, OrRisk, Risk} from "./risk.js";
import type {NodeGraph} from "./graph.js";
import {Scenario} from "./scenario.js";

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

export class Node {
    private riskScenarios: { [scenarioKey: string | symbol]: Risk } = {};

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

    getRisk(scenario: Scenario = Scenario.none): Risk {
        if (this.riskScenarios[scenario.key] == null) {
            const calc = new AndRisk();
            const orCalc = new OrRisk(this.from.length === 0);
            const andCalc = new AndRisk();
            this.riskScenarios[scenario.key] = calc;
            // Incoming attack/fact risks and effects on the risk
            // If nothing is sufficient, risk is nothing
            if (this.from.some(from => from.sufficient)) {
                for (let from of this.from) {
                    if (!from.backwards) { // TODO: effect of backwards on risk
                        try {
                            const theirRisk = this.graph.get(from.name)?.getRisk(scenario);
                            let incomingEffect = this.incomingRiskEffect(from);
                            if (from.required) {
                                andCalc.add([theirRisk?.value, incomingEffect]);
                            } else {
                                orCalc.add([theirRisk?.value, incomingEffect]);
                            }
                        } catch (e) {
                            if (e === "#REC!")
                                return calc.finalRecursive();
                            throw e;
                        }
                    }
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
            calc.add(orCalc.finalOk());
            calc.add(andCalc.finalOk());
            calc.finalOk();
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
                value += goal.getRisk(Scenario.omit(this)).value - goal.getRisk(Scenario.none).value;
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

