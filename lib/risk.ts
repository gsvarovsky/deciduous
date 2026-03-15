import {rounded} from "./util.js";

function opListString(operator: string, operands: string[]) {
    return operands.length ? operands.length > 1 ? `(${operands.join(operator)})` : operands[0] : "";
}

type RiskConditions = (number | undefined)[];

export interface Risk {
    value: number;
    calc: string;
}

function riskAtom(conditions: RiskConditions): Risk | undefined {
    const numbers = conditions.filter(
        (value): value is number => value != null);
    if (numbers.length) {
        return {
            value: numbers.reduce((final, value) => value * final, 1),
            calc: opListString("×", [numbers[0], ...numbers.slice(1).filter(v => v != 1)].map(rounded))
        }
    }
}

export class CalcRisk implements Readonly<Risk> {
    private ors: RiskConditions[] = [];
    private ands: RiskConditions[] = [];
    private final?: Risk;

    constructor(fact: boolean) {
        if (fact) {
            this.ors.push([1]);
        }
    }

    or(...conditions: RiskConditions) {
        if (this.final != null)
            throw new Error("Calculation finalised");
        this.ors.push(conditions);
    }

    and(...conditions: RiskConditions) {
        if (this.final != null)
            throw new Error("Calculation finalised");
        this.ands.push(conditions);
    }

    get value() {
        if (this.final == null)
            throw "#REC!";
        return this.final.value;
    }

    get calc() {
        if (this.final == null)
            throw "#REC!";
        return this.final.calc;
    }

    finalRecursive() {
        this.final = {value: 0, calc: "#REC!"};
        return this;
    }

    finalOk() {
        const orCalc: string[] = [];
        let orValue = 0;
        for (let conditions of this.ors) {
            const risk = riskAtom(conditions);
            if (risk != null) {
                orValue += risk.value;
                orCalc.push(risk.calc);
            }
        }
        const andCalc: string[] = [];
        let andValue = 1;
        for (let conditions of this.ands) {
            const risk = riskAtom(conditions);
            if (risk != null) {
                andValue *= risk.value;
                andCalc.push(risk.calc);
            }
        }
        this.final = {
            value: (orCalc.length ? orValue : 1) * (andCalc.length ? andValue : 1),
            calc: [
                opListString("+", orCalc),
                opListString("×", andCalc)
            ].filter(s => s).join("×")
        };
    }
}