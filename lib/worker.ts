import {GraphDeclaration, parseInput} from "./parse.js";

export type CalcGraphRiskMessage = MessageEvent<GraphDeclaration>;

export interface NodeRiskDisplay {
    name: string;
    display: string;
}

self.onmessage = function (event: CalcGraphRiskMessage) {
    const graph = parseInput(event.data);
    // Mitigations re-calculate the whole graph, so do those last
    for (let type of ["fact", "attack", "goal", "mitigation"]) {
        for (let node of graph.all) {
            if (node.type === type) {
                const nodeRiskDisplay: NodeRiskDisplay = {
                    name: node.name,
                    display: node.getDisplayValue(event.data.risk ?? "value")
                };
                self.postMessage(nodeRiskDisplay);
            }
        }
    }
}