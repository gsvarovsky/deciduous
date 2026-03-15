function opListString(operator: string, operands: string[]) {
    return operands.length ? operands.length > 1 ? `(${operands.join(operator)})` : operands[0] : "";
}

type RiskEffect = [inherent?: number, effect?: number];
type RiskCondition = RiskEffect | Risk;

export interface Risk {
    value: number;
    calc: string;
}

function riskAtom(condition: RiskCondition): Risk | undefined {
    if (Array.isArray(condition)) {
        const numbers = condition.filter(
            (value): value is number => value != null);
        if (numbers.length) {
            return {
                value: numbers.reduce((final, value) => value * final, 1),
                calc: opListString("×", [numbers[0], ...numbers.slice(1).filter(v => v != 1)].map(function (effect: number) {
                    return effect.toPrecision(4);
                }))
            }
        }
    } else {
        return condition;
    }
}

abstract class CalcRisk implements Readonly<Risk> {
    protected risks: RiskCondition[] = [];
    private final?: Risk;

    add(conditions: RiskCondition) {
        if (this.final != null)
            throw new Error("Calculation finalised");
        this.risks.push(conditions);
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
        this.final = this.calcFinal();
        return this;
    }

    protected abstract calcFinal(): Risk;
}

export class OrRisk extends CalcRisk {
    constructor(fact: boolean) {
        super();
        if (fact) {
            this.risks.push([1]);
        }
    }

    calcFinal(): Risk {
        const orCalc: string[] = [];
        let orValue = 0;
        for (let conditions of this.risks) {
            const risk = riskAtom(conditions);
            if (risk != null) {
                orValue += risk.value;
                orCalc.push(risk.calc);
            }
        }
        return {
            value: orValue,
            calc: opListString("+", orCalc)
        };
    }
}

export class AndRisk extends CalcRisk {
    calcFinal(): Risk {
        const andCalc: string[] = [];
        let andValue = 1;
        for (let conditions of this.risks) {
            const risk = riskAtom(conditions);
            if (risk != null) {
                andValue *= risk.value;
                andCalc.push(risk.calc);
            }
        }
        return {
            value: andValue,
            calc: opListString("×", andCalc)
        };
    }
}
