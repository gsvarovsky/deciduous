import {CalcRisk, Risk} from "./risk.js";
import {rounded} from "./util.js";
import type {NodeGraph} from "./graph.js";

const noMitigation = Symbol("noMitigation");

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

export class Node {
    private riskScenarios: { [omitMitigation: string | symbol]: Risk } = {};

    constructor(
        readonly name: string,
        readonly label: string,
        readonly from: From[],
        readonly type: NodeType,
        protected readonly graph: NodeGraph
    ) {
    }

    getRisk(omitMitigation: string | symbol = noMitigation): Risk {
        if (this.riskScenarios[omitMitigation] == null) {
            const calc = new CalcRisk(this.from.length === 0);
            this.riskScenarios[omitMitigation] = calc;
            // Incoming attack/fact risks and effects on the risk
            // If nothing is sufficient, risk is nothing
            if (this.from.some(from => from.sufficient)) {
                for (let from of this.from) {
                    if (!from.backwards) {
                        try {
                            const theirRisk = this.graph.get(from.name)?.getRisk(omitMitigation);
                            (from.required ? calc.and : calc.or).call(
                                calc, theirRisk?.value, this.incomingRiskEffect(from));
                        } catch (e) {
                            if (e === "#REC!")
                                return calc.finalRecursive();
                            else
                                throw e;
                        }
                    }
                }
            }
            // Outgoing mitigation effects (no inherent risks)
            for (let toNode of this.graph.all) {
                for (let from of toNode.from) {
                    if (toNode.name !== omitMitigation && from.name === this.name) {
                        calc.and(toNode.outgoingRiskEffect(from));
                    }
                }
            }
            calc.finalOk();
        }
        return this.riskScenarios[omitMitigation];
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
                    value = rounded(this.getRisk().value);
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

export class Mitigation extends Node {
    private priority = -1;

    getPriority() {
        if (this.priority == -1) {
            // Mitigation Priority is the average effect on attacker goals
            let value = 0, count = 0;
            for (let goal of this.graph.goals) {
                value += goal.getRisk(this.name).value - goal.getRisk(noMitigation).value;
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
        return `𝛿:${rounded(this.getPriority())}`;
    }

    protected incomingRiskEffect() {
        return undefined;
    }

    // A mitigation effect is outgoing
    protected outgoingRiskEffect(from: From) {
        return 1 - (from.effect ?? 0); // effect is mitigating
    }
}

