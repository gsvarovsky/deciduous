import type {Node} from "./node.js";

export class Scenario {
    readonly key: string;

    static none = new Scenario(new Set(), null);

    static omit(node: Node) {
        return new Scenario(new Set(), node);
    }

    static given(nodes: Set<Node>) {
        return new Scenario(nodes, null);
    }

    private constructor(
        readonly given: Set<Node>,
        readonly omit: Node | null
    ) {
        this.key = JSON.stringify({
            omit: omit?.name,
            cut: [...this.given].map(node => node.name).sort()
        });
    }
}
