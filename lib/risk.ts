import {depAnd, depOr, GetDepProbability} from "./stats.js";

export interface Risk {
    value: number;
    calc: string;
}

export type RiskEffect<Event> = [event: Event, effect?: number];

export const RECURSING = "#REC!";

abstract class CalcRisk<Event> implements Readonly<Risk> {
    private final?: Risk;

    constructor(
        protected probabilityOf: GetDepProbability<RiskEffect<Event>>,
        private cnd: RiskEffect<Event>[] = []
    ) {}

    get conditions() {
        if (this.final != null)
            throw new Error("Calculation finalised");
        return this.cnd;
    }

    get value() {
        return this.assertFinal().value;
    }

    get calc() {
        return this.assertFinal().calc;
    }

    private assertFinal() {
        if (this.final == null)
            throw RECURSING;
        return this.final;
    }

    finalise() {
        if (this.final == null) {
            try {
                this.final = this.calcFinal(this.cnd);
            } catch (e) {
                if (e === RECURSING) {
                    this.final = {value: 0, calc: RECURSING};
                } else {
                    throw e;
                }
            }
        }
        return this;
    }

    protected abstract calcFinal(conditions: RiskEffect<Event>[]): Risk;
}

export class OrRisk<Event> extends CalcRisk<Event> {
    calcFinal(conditions: RiskEffect<Event>[]): Risk {
        return {
            value: depOr(this.probabilityOf, ...conditions),
            calc: operatorString("OR", conditions)
        };
    }
}

export class AndRisk<Event> extends CalcRisk<Event> {
    calcFinal(conditions: RiskEffect<Event>[]): Risk {
        return {
            value: depAnd(this.probabilityOf, ...conditions),
            calc: operatorString("AND", conditions)
        };
    }
}

function operatorString<Event>(operator: string, conditions: RiskEffect<Event>[]) {
    return conditions.length ? conditions.length > 1 ? `${operator}(${conditions.map(effectString)})` : effectString(conditions[0]) : "";
}

function effectString([event, effect]: RiskEffect<any>) {
    return ((typeof event === "object" && event.name) || event) + (effect ? "×" + effect : "");
}

////////////////////////////////////////////////////////////////////////////////
// function opListString(operator: string, operands: string[]) {
//     return operands.length ? operands.length > 1 ? `(${operands.join(operator)})` : operands[0] : "";
// }
//
// function riskAtom(condition: RiskEffect | Risk): Risk | undefined {
//     if (Array.isArray(condition)) {
//         const numbers = condition.filter(
//             (value): value is number => value != null);
//         if (numbers.length) {
//             return {
//                 value: numbers.reduce((final, value) => value * final, 1),
//                 calc: opListString("×", [numbers[0], ...numbers.slice(1).filter(v => v != 1)].map(function (effect: number) {
//                     return effect.toPrecision(4);
//                 }))
//             }
//         }
//     } else {
//         return condition;
//     }
// }
