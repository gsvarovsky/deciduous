function opListString(operator: string, operands: string[]) {
    return operands.length ? operands.length > 1 ? `(${operands.join(operator)})` : operands[0] : "";
}

type RiskEffect = [inherent?: number, effect?: number];
type RiskCondition = RiskEffect | CalcRisk;

export interface Risk {
    value: number;
    calc: string;
}

function riskAtom(condition: RiskEffect | Risk): Risk | undefined {
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
    private final?: Risk;

    constructor(
        private conditions: RiskCondition[] = []
    ) {}

    add(condition: RiskCondition) {
        if (this.final != null)
            throw new Error("Calculation finalised");
        this.conditions.push(condition);
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
        this.final = this.calcFinal(this.conditions.map(risk =>
            risk instanceof CalcRisk ? risk.finalOk() : risk));
        return this;
    }

    protected abstract calcFinal(conditions: (RiskEffect | Risk)[]): Risk;
}

export class OrRisk extends CalcRisk {
    constructor(fact: boolean) {
        super(fact ? [[1]] : []);
    }

    calcFinal(conditions: (RiskEffect | Risk)[]): Risk {
        const orCalc: string[] = [];
        let orValue = 0;
        for (let condition of conditions) {
            const risk = riskAtom(condition);
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
    calcFinal(conditions: (RiskEffect | Risk)[]): Risk {
        const andCalc: string[] = [];
        let andValue = 1;
        for (let condition of conditions) {
            const risk = riskAtom(condition);
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
