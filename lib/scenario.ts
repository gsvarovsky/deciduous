import type {Node} from "./node.js";
import {Risk, RiskEffect} from "./risk.js";
import {cartesian, depOr, GetDepProbability} from "./stats.js";

export class Scenario {
    readonly key: string;

    static none = new Scenario(new Set(), null);

    withOmit(node: Node) {
        return new Scenario(this.cut, node);
    }

    withGiven(cut: Cut) {
        return new Scenario(cut, this.omit);
    }

    private constructor(
        readonly cut: Cut,
        readonly omit: Node | null
    ) {
        this.key = JSON.stringify({
            omit: omit?.name,
            cut: [...this.cut].map(node => node.name).sort()
        });
    }

    readonly depRiskProbability: GetDepProbability<RiskEffect<RiskGraphEvent>> = (
        [event, effect], ...given
    ): number => {
        return depOr(
            (...cuts) =>
                event.getRisk(this.withGiven(unionCuts(...cuts.flat()))).value,
            this.cut,
            ...this.powerCuts(given)
        ) * (effect ?? 1);
    }

    private *powerCuts(given: RiskEffect<RiskGraphEvent>[]) {
        for (let powerCut of cartesian(given.map(([event]) => event.cuts())))
            yield unionCuts(...powerCut);
    }
}

export type Cut = Set<RiskGraphEvent>;

export interface RiskGraphEvent {
    readonly name: string;
    cuts(): Cut[];
    getRisk(scenario?: Scenario): Risk;
    toString(): string;
}

export const REALITY: RiskGraphEvent = {
    name: "reality",
    cuts: () => [],
    getRisk: () => ({value: 1, calc: "#REALITY"})
}

export function unionCuts(...cuts: Cut[]) {
    return new Set(cuts.map(cut => [...cut]).flat());
}