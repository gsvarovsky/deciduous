import {defaultFrom, From, FromFlags, Node} from "./node.js";
import {NodeGraph} from "./graph.js";

export type GraphDeclaration = {
    goals?: NodeDeclaration[];
    facts?: NodeDeclaration[];
    attacks?: NodeDeclaration[];
    mitigations?: NodeDeclaration[];
    risk?: "value" | "calc";
};

export type NodeDeclaration = {
    from: FromDeclaration[];
} & { [name: string]: string; }

export interface EffectDeclaration {
    effect?: number;
    implemented?: boolean; // Generally for mitigations
    likelihood?: number; // Generally for attacks
}

export type FromDeclaration = string |
    (Partial<FromFlags> & EffectDeclaration & { [name: string]: string | number | null; });

function firstProperty<T>(obj: { [key: string]: T }): [string, T] {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
        throw new Error("expected at least one key in object");
    }
    return entries[0];
}

function parseFrom(raw: FromDeclaration): From {
    let from: From;
    if (typeof raw == "object") {
        const [fromName, rawLabel] = firstProperty(raw);
        from = {...defaultFrom, name: fromName};
        if (typeof rawLabel === "string" || typeof rawLabel === "number")
            from.label = String(rawLabel);
        if (typeof raw.backwards === "boolean")
            from.backwards = raw.backwards;
        if (typeof raw.ungrouped === "boolean")
            from.ungrouped = raw.ungrouped;
        if (typeof raw.required === "boolean")
            from.required = raw.required;
        if (typeof raw.sufficient === "boolean")
            from.sufficient = raw.sufficient;
        from.effect =
            toEffect('effect', raw.effect) ??
            toEffect('implemented', raw.implemented) ??
            toEffect('likelihood', raw.likelihood) ??
            (from.label === "#yolosec" ? 1 : undefined) ??
            (function () {
                const matchInlineEffect = from.label?.match(/\s*<(1|(0(\.\d+)?))>$/);
                if (matchInlineEffect != null) {
                    from.label = from.label?.substring(0, matchInlineEffect.index);
                    return Number(matchInlineEffect[1]);
                }
            })();
    } else {
        from = {...defaultFrom, name: String(raw)};
    }
    return from;
}

function toEffect(key: string, value?: any): number | undefined {
    const effect = Number(value);
    if (effect < 0 || effect > 1) {
        throw new Error(`Effect in {${key}: ${value}} must be between 0 and 1`);
    }
    return isNaN(effect) ? undefined : effect;
}

function parseNode(node: NodeDeclaration): [string, string, From[]] {
    if (typeof node != "object" || node === null) {
        throw new Error(`nodes must each be an object containing at least one property`);
    }
    const [name, label] = firstProperty<string>(node);
    const from = (node.from ?? []).map(parseFrom);
    return [name, label, from];
}

export function parseInput(parsed: GraphDeclaration): NodeGraph {
    const graph = new NodeGraph();
    (parsed.facts || []).forEach(node => {
        if (!node.from?.length) {
            node.from = ["reality"];
        }
        graph.add(Node.make(...parseNode(node), "fact", graph));
    });
    (parsed.attacks || []).forEach(node =>
        graph.add(Node.make(...parseNode(node), "attack", graph)));
    (parsed.mitigations || []).forEach(node =>
        graph.add(Node.make(...parseNode(node), "mitigation", graph)));
    (parsed.goals || []).forEach(node =>
        graph.add(Node.make(...parseNode(node), "goal", graph)));
    return graph;
}