import {CalcRisk, RECURSING, Risk} from "./risk.js";
import type {NodeGraph} from "./graph.js";
import {Cut, REALITY, RiskGraphEvent, RiskGraphEventEffect, Scenario} from "./scenario.js";
import {cartesian} from "./stats.js";
import {union} from "./sets.js";

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

export class Node implements RiskGraphEvent {
    private readonly insufficient: boolean;
    private riskScenarios: { [scenarioKey: string | symbol]: Risk } = {};
    private lazyCuts: undefined | typeof RECURSING | Cut[];
    private lazyAllCutNodeNames: undefined | Set<string>;

    static make(name: string, label: string, from: From[], type: NodeType, graph: NodeGraph): Node {
        switch (type) {
            case "mitigation":
                return new Mitigation(name, label, from, type, graph, 1);
            case "attack":
            case "goal":
                return new Node(name, label, from, type, graph, 0);
            default: // "fact"
                return new Node(name, label, from, type, graph, 1);
        }
    }

    protected constructor(
        readonly name: string,
        readonly label: string,
        readonly from: From[],
        readonly type: NodeType,
        protected readonly graph: NodeGraph,
        protected readonly defaultRisk: 1 | 0
    ) {
        this.insufficient = from.length > 0 && !from.some(f => f.sufficient);
    }

    /**
     * Always yields at least [Set(this)]
     */
    get cuts(): Cut[] {
        if (Array.isArray(this.lazyCuts))
            return this.lazyCuts;
        if (this.lazyCuts === RECURSING)
            return [];
        this.lazyCuts = RECURSING;
        const headCut = new Set([this]);
        const {options, required} = this.riskFroms();
        // (1 OR 2 OR 3 OR 4) AND (a OR b) AND (c OR d)
        // ---E---   ---F---      ---G---      ---H---
        // where 1-4 and a-d are cuts, E,F are option nodes, G,H are required nodes
        const cutUnion = (!options.length ? [] : [options.map(([node]) => node.cuts).flat()])
            .concat(...required.map(([node]) => [node.cuts]));
        // (this AND 1 AND a AND c) OR (this AND 1 AND a AND d) OR ...
        let cuts = [...cartesian(cutUnion)]
            .map(cuts => union([headCut, ...cuts]));
        // There were no from cuts
        if (!cuts.length)
            cuts = [headCut];
        return this.lazyCuts = cuts;
    }

    private get allCutNodeNames(): Set<string> {
        return this.lazyAllCutNodeNames ??
            (this.lazyAllCutNodeNames = new Set([...union(this.cuts)].map(node => node.name)));
    }

    riskFroms(): {options: RiskGraphEventEffect[], required: RiskGraphEventEffect[]} {
        const options: RiskGraphEventEffect[] = [], required: RiskGraphEventEffect[] = [];
        for (let from of this.from) {
            const effect = this.incomingRiskEffect(from);
            if (!from.backwards && (effect == null || effect > 0)) { // backwards has no effect on risk
                const node = this.graph.get(from.name);
                (from.required ? required : options).push([node ?? REALITY, effect]);
            }
        }
        return {options, required};
    }

    getRisk(scenario: Scenario = Scenario.none): Risk {
        if (this.insufficient) {
            return {value: 0, calc: "#INSUF"};
        } else if (scenario.cut.has(this)) {
            return {value: 1, calc: "#GIVEN"};
        } else {
            const key = scenario.key(this.allCutNodeNames);
            if (this.riskScenarios[key] == null) {
                const {options, required} = this.riskFroms();
                if (!options.length && !required.length) {
                    this.setRiskInScenario(key,
                        new Node.CalcRisk(this, scenario, this.defaultRisk === 1 ? "AND" : "OR", options));
                } else {
                    if (options.length == 1)
                        required.push(options.pop()!);
                    if (required.length || !options.length) {
                        const reqsCalc = new Node.CalcRisk(this, scenario, "AND", required);
                        if (options.length) {
                            const optsCalc =
                                new CalcRisk<RiskGraphEvent>("OR", scenario.depRiskProbability, options);
                            // Pseudo required node for options
                            const optsPseudoNode = {
                                get name() {
                                    return optsPseudoNode.getRisk().calc
                                },
                                cuts: options.map(([event]) => event.cuts).flat(),
                                getRisk() {
                                    optsCalc.finalise();
                                    return optsCalc;
                                }
                            };
                            reqsCalc.conditions.unshift([optsPseudoNode, 1]);
                        }
                        this.setRiskInScenario(key, reqsCalc);
                    } else {
                        this.setRiskInScenario(key, new Node.CalcRisk(this, scenario, "OR", options));
                    }
                }
            }
            return this.riskScenarios[key];
        }
    }

    private setRiskInScenario(key: string, calc: CalcRisk<RiskGraphEvent>) {
        (this.riskScenarios[key] = calc).finalise();
    }

    private static CalcRisk = class extends CalcRisk<RiskGraphEvent> {
        constructor(
            private readonly node: Node,
            private readonly scenario: Scenario,
            type: "AND" | "OR",
            cnd: RiskGraphEventEffect[]
        ) {
            super(type, scenario.depRiskProbability, cnd);
        }

        calcFinal(conditions: RiskGraphEventEffect[]): Risk {
            return this.node.applyOutgoingEffects(this.scenario, super.calcFinal(conditions));
        }
    }

    private applyOutgoingEffects(scenario: Scenario, risk: Risk) {
        for (let toNode of this.graph.all) {
            for (let from of toNode.from) {
                if (toNode.name !== scenario.omit?.name && from.name === this.name) {
                    // Outgoing effects only, no inherent risks
                    risk.value *= toNode.outgoingRiskEffect(from) ?? 1;
                }
            }
        }
        return risk;
    }

    getPriority() {
        return this.getRisk().value;
    }

    getDisplayValue(display: "value" | "calc" | "defer"): string {
        // Default is to show risk probability
        let value: string;
        switch (display) {
            case "value":
                if (this.getRisk().value > 1)
                    value = ">1!";
                else
                    value = displayRiskValue(this.getRisk().value);
                break;
            case "calc":
                return this.getRisk().calc;
            case "defer":
                value = "-";
                break;
            default:
                return `#${display}?`;
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

    toString() {
        return this.name;
    }
}

export type DisplayRisk = "value" | "calc" | "defer";

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

    getDisplayValue(display: DisplayRisk) {
        // Mitigations display their value in preventing goals
        return `𝛿:${(display === "defer" ? "…" : displayRiskValue(this.getPriority()))}`;
    }

    protected incomingRiskEffect() {
        return undefined;
    }

    // A mitigation effect is outgoing
    protected outgoingRiskEffect(from: From) {
        return 1 - (from.effect ?? 0); // effect is mitigating
    }
}

export function displayRiskValue(value: number) {
    return `${+value.toFixed(4)}`;
}