import {Node} from "./node.js";

export class NodeGraph {
    private readonly allNodes: { [name: string]: Node } = {};
    readonly forwards: { [name: string]: string[] } = {};
    readonly forwardsAll: { [name: string]: string[] } = {};
    readonly backwards: { [name: string]: string[] } = {};

    get(name: string): Node | undefined {
        return this.allNodes[name];
    }

    get all() {
        return Object.values(this.allNodes);
    }

    get goals() {
        return this.all.filter(goal => goal.type === "goal");
    }

    addNode(node: Node) {
        if (Object.hasOwnProperty.call(this.allNodes, node.name)) {
            throw new Error(`${node.name} cannot be declared twice. It was previously declared as ${node.type}`);
        }
        this.allNodes[node.name] = node;
        const fromNames = this.backwards[node.name] ??= [];
        for (const from of node.from) {
            if (!from.backwards && !from.ungrouped) {
                (this.forwards[from.name] ??= []).push(node.name);
                fromNames.push(from.name);
            }
            (this.forwardsAll[from.name] ??= []).push(node.name);
        }
        return node;
    }
}