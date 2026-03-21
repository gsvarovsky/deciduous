import type {Node} from "./node.js";
import {Risk, RiskEffect} from "./risk.js";
import {cartesian, depOr, GetDepProbability} from "./stats.js";

export class Scenario {
    private readonly cutNodesNames: string[];

    static none = new Scenario(new Set(), null);

    withOmit(node: Node) {
        return new Scenario(this.cut, node);
    }

    withGiven(cut: Cut) {
        return new Scenario(unionCuts([this.cut, cut]), this.omit);
    }

    private constructor(
        readonly cut: Cut,
        readonly omit: Node | null
    ) {
        this.cutNodesNames = [...this.cut].map(node => node.name).sort();
    }

    key(withOnly: Set<string>) {
        return JSON.stringify({
            omit: this.omit?.name,
            cut: this.cutNodesNames.filter(name => withOnly.has(name))
        });
    }

    readonly depRiskProbability: GetDepProbability<RiskEffect<RiskGraphEvent>> = (
        [event, effect], ...given
    ): number => {
        return (!given.length ? event.getRisk(this).value : depOr(
            (...cuts) =>
                event.getRisk(this.withGiven(unionCuts(cuts.flat()))).value,
            ...this.powerCuts(given)
        )) * (effect ?? 1);
    }

    private *powerCuts(given: RiskEffect<RiskGraphEvent>[]) {
        for (let powerCut of cartesian(given.map(([event]) => event.cuts)))
            yield unionCuts(powerCut);
    }
}

export type Cut = ReadonlySet<RiskGraphEvent>;

export interface RiskGraphEvent {
    readonly name: string;
    readonly cuts: Cut[];
    getRisk(scenario?: Scenario): Risk;
    toString(): string;
}

export const REALITY: RiskGraphEvent = {
    name: "reality",
    cuts: [],
    getRisk: () => ({value: 1, calc: "#REALITY"})
}

export function unionCuts(cuts: Cut[]) {
    const union = new Set<RiskGraphEvent>;
    for (let cut of cuts) {
        for (let node of cut)
            union.add(node);
    }
    return union;
}