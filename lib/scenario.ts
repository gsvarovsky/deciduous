import type {Node} from "./node.js";

export class Scenario {
    readonly key: string;

    static none = new Scenario(new Set(), null);

    withOmit(node: Node) {
        return new Scenario(this.given, node);
    }

    withGiven(nodes: Set<Node>) {
        return new Scenario(nodes, this.omit);
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
