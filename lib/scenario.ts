import type {Node} from "./node.js";
import {Risk, RiskEffect} from "./risk.js";
import {cartesian, depOr, GetDepProbability} from "./stats.js";
import {simplifyUnion, union} from "./sets.js";

export class Scenario {
    private readonly cutNodesNames: string[];

    static none = new Scenario(new Set(), null);

    withOmit(node: Node) {
        return new Scenario(this.cut, node);
    }

    withGiven(cut: Cut) {
        return new Scenario(union([this.cut, cut]), this.omit);
    }

    private constructor(
        readonly cut: Cut,
        readonly omit: Node | null = null
    ) {
        this.cutNodesNames = [...this.cut].map(node => node.name).sort();
    }

    key(withOnly?: Set<string>) {
        return JSON.stringify({
            omit: this.omit?.name,
            cut: this.cutNodesNames.filter(name => withOnly?.has(name) ?? true)
        });
    }

    readonly depRiskProbability: GetDepProbability<RiskGraphEventEffect> = (
        [event, effect], ...given
    ): number => {
        let eventRiskValue: number;
        if (!given.length) {
            eventRiskValue = event.getRisk(this).value;
        } else {
            const pEventCuts: GetDepProbability<Cut> = (...cuts) =>
                event.getRisk(this.withGiven(union(cuts))).value;
            const powerCuts: Cut[] = [];
            for (let powerCut of cartesian(given.map(([event]) => event.cuts))) {
                // OPTIMISATION: Ignore anything not in the event's cuts
                powerCuts.push(union(powerCut, event.cuts));
            }
            // OPTIMISATION: Ignore any cuts that are a subset of another (A ∪ B = A, if B ⊆ A)
            const simplified = simplifyUnion(powerCuts);
            eventRiskValue = depOr(pEventCuts, ...Object.values(simplified));
        }
        return eventRiskValue * (effect ?? 1);
    }
}

export type Cut = ReadonlySet<RiskGraphEvent>;

export interface RiskGraphEvent {
    readonly name: string;
    readonly cuts: Cut[];
    getRisk(scenario?: Scenario): Risk;
    toString(): string;
}

export type RiskGraphEventEffect = RiskEffect<RiskGraphEvent>;

export const REALITY: RiskGraphEvent = {
    name: "reality",
    cuts: [],
    getRisk: () => ({value: 1, calc: "#REALITY"})
}
