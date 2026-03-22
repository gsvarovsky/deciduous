// noinspection JSUnusedGlobalSymbols

import {DisplayRisk, displayRiskValue, Node} from "./lib/node.js";
import {NodeGraph} from "./lib/graph.js";
import {GraphDeclaration, parseInput} from "./lib/parse.js";

export const themes: { [name: string]: Theme } = {
    "classic": {
        "dark": false,
        "edge": "#2B303A",
        "edge-text": "#DB2955",
        "backwards-edge": "#7692FF",
        "reality-fill": "#2B303A",
        "reality-text": "#FFFFFF",
        "fact-fill": "#C6CCD2",
        "attack-fill": "#ED96AC",
        "mitigation-fill": "#ABD2FA",
        "goal-fill": "#DB2955",
        "goal-text": "#FFFFFF",
    },
    "dark": {
        "dark": true,
        "edge": "#c4c9d4",
        "edge-text": "#c4c9d4",
        "backwards-edge": "#FFFD98",
        "backwards-edge-penwidth": 3,
        "backwards-edge-arrowsize": .5,
        "reality-fill": "#d9d9d9",
        "reality-text": "black",
        "fact-fill": "#707070",
        "fact-text": "white",
        "attack-fill": "#FBCAEF",
        "attack-text": "black",
        "mitigation-fill": "#5BCEFA",
        "mitigation-text": "black",
        "goal-fill": "#ED33B9",
        "goal-text": "white",
        "title": "white",
    },
    "default": {
        "dark": false,
        "edge": "#2B303A",
        "edge-text": "#010065",
        "backwards-edge": "#7692FF",
        "backwards-edge-penwidth": 3,
        "backwards-edge-arrowsize": .5,
        "reality-fill": "#272727",
        "reality-text": "#FFFFFF",
        "fact-fill": "#D2D5DD",
        "attack-fill": "#ff92cc",
        "mitigation-fill": "#B9D6F2",
        "goal-fill": "#5f00c2",
        "goal-text": "#FFFFFF",
    },
    "accessible": {
        "dark": false,
        "edge": "#2B303A",
        "edge-text": "#010065",
        "backwards-edge": "#7692FF",
        "backwards-edge-penwidth": 3,
        "backwards-edge-arrowsize": .5,
        "reality-fill": "#272727",
        "reality-text": "#FFFFFF",
        "fact-fill": "#D2D5DD",
        "attack-fill": "#FF7EC3",
        "mitigation-fill": "#CCCCFF",
        "goal-fill": "#5f00c2",
        "goal-text": "#FFFFFF",
    },
};

function mangleName(name: string) {
    if (/^[A-Za-z]\w*$/.test(name)) {
        return name;
    }
    return JSON.stringify(name);
}

type Theme = {
    "dark"?: boolean;
    "title"?: string;
    "edge": string;
    "edge-text": string;
    "backwards-edge": string;
    "backwards-edge-penwidth"?: number;
    "backwards-edge-arrowsize"?: number;
    "reality-fill": string;
    "reality-text": string;
    "fact-fill": string;
    "fact-text"?: string;
    "attack-fill": string;
    "attack-text"?: string;
    "mitigation-fill": string;
    "mitigation-text"?: string;
    "goal-fill": string;
    "goal-text": string;
};

interface Input extends GraphDeclaration {
    theme?: keyof typeof themes | string;
    dark?: boolean;
    reality?: "#hide" | string;
    title?: string;
    filter?: string[];
    legend?: boolean;
}

function wordwrap(text: string, limit: number): string[] {
    text = String(text);
    if (text.indexOf("\n") != -1) {
        return text.split("\n");
    }
    const split = text.split(" ");
    let all = [];
    let current: string[] = [];
    let currentLength = 0;
    for (let i = 0; i < split.length; i++) {
        const line = split[i];
        if (currentLength == 0 || (currentLength + line.length < limit && line[0] != "(")) {
            current.push(line);
            currentLength += line.length;
        } else {
            all.push(current.join(" "));
            current = [line];
            currentLength = line.length;
        }
    }
    all.push(current.join(" "));
    return all;
}

function defaultLabelForName(name: string): string {
    return name.replace(/_/g, " ").replace(/^[a-z]/, c => c.toUpperCase());
}

export function getNodeLabel(node: Node, risk?: DisplayRisk) {
    const lines = wordwrap(node.label === null ? defaultLabelForName(node.name) : node.label, 18);
    if (risk)
        lines.push(node.getDisplayValue(risk));
    return lines;
}

type GraphvizNodeProperties = { [key: string]: string };

function line(name: string, properties: GraphvizNodeProperties) {
    const entries = Object.entries(properties);
    if (entries.length == 0) {
        return name;
    }
    return name + " [ " + entries.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(" ") + " ]";
}

export type RenderedOutput = {
    dot: string;
    title: string;
    types: { [key: string]: string };
    themeName: string;
};

export function convertToDot(parsed: Input): RenderedOutput {
    const font = 'Arial'
    const themeName = typeof parsed.theme === "string" && Object.hasOwnProperty.call(themes, parsed.theme) ? parsed.theme : "default";
    const theme = themes[themeName] as Theme;
    const dark = !!theme.dark;

    const propertiesOfReality = (parsed.reality === "#hide" ? { style: "invis" } :
        { fillcolor: theme["reality-fill"], fontcolor: theme["reality-text"] }) as GraphvizNodeProperties;
    const header = `// Generated from https://www.deciduous.app/
digraph {
    // base graph styling
    rankdir="TB";
    splines=true;
    overlap=false;
    nodesep="0.2";
    ranksep="0.4";
    label=${JSON.stringify(typeof parsed.title === "string" ? parsed.title : "")};
    labelloc="t";
    bgcolor=${JSON.stringify(dark ? "black" : "white")}
    fontcolor=${JSON.stringify(theme["title"] || "black")}
    fontname=${JSON.stringify(font)};
    node [ shape="plaintext" style="filled, rounded" fontname=${JSON.stringify(font)} margin=0.2 ]
    edge [ fontname=${JSON.stringify(font)} fontsize=12 color="${theme["edge"]}" ]

    // is reality a hologram?
    ${line("reality", { label: parsed.reality || "Reality", ...propertiesOfReality })}

`;
    const filter = parsed.filter || [];
    const subgraphs = [];
    const graph: NodeGraph = parseInput(parsed);

    function anyDominates(forwards: { [name: string]: string[] }, d: string[], n: string) {
        // search to see if any nodes in d dominate n
        // nodes dominate themselves
        const search = [];
        const added: { [key: string]: true } = {};
        for (const other of d) {
            added[other] = true;
            search.push(other);
        }
        let cur: string | undefined;
        while ((cur = search.shift()) !== undefined) {
            if (cur === n) {
                return true;
            }
            const others: string[] | undefined = forwards[cur];
            if (others !== undefined) {
                for (let other of others) {
                    if (!Object.hasOwnProperty.call(added, other)) {
                        added[other] = true;
                        search.push(other);
                    }
                }
            }
        }
        return false;
    }

    function shouldShow(n: string) {
        if (filter.length == 0 || anyDominates(graph.forwardsAll, filter, n)) {
            return true;
        }
        const arrayN = [n];
        return filter.find(other => anyDominates(graph.forwardsAll, arrayN, other));
    }

    const allNodeLines = graph.all
        .filter(node => shouldShow(node.name))
        .map(node => line(mangleName(node.name), {
            label: getNodeLabel(node, parsed.risk).join("\n"),
            ...node.name === "reality" ? propertiesOfReality : {
                fillcolor: theme[`${node.type}-fill`],
                fontcolor: theme[`${node.type}-text`] || "black",
            },
        }));

    const allEdgeLines = graph.all
        .filter(node => shouldShow(node.name))
        .reduce<string[]>((edges, node) => {
            node.from.forEach((from) => {
                const { name: fromName, label, backwards, effect } = from;
                const props: GraphvizNodeProperties = {};
                if (typeof label === "string") {
                    props.xlabel = wordwrap(label, 20).join("\n");
                    props.fontcolor = theme["edge-text"];
                }
                if (parsed.risk && effect != null) {
                    if (props.xlabel) {
                        props.xlabel += "\n";
                    } else {
                        props.xlabel = "";
                    }
                    props.xlabel += `<${(displayRiskValue(effect))}>`;
                }
                if (effect === 0) {
                    props.style = "dotted";
                }
                if (backwards) {
                    props.style = "dotted";
                    props.color = theme["backwards-edge"];
                    if (typeof theme["backwards-edge-penwidth"] === "string") {
                        props.penwidth = theme["backwards-edge-penwidth"];
                    }
                    if (typeof theme["backwards-edge-arrowsize"] === "string") {
                        props.arrowsize = theme["backwards-edge-arrowsize"];
                    }
                    props.weight = "0";
                }
                if (fromName === "reality" && parsed.reality === "#hide") {
                    props.style = "invis";
                }
                edges.push(line(`${mangleName(fromName)} -> ${mangleName(node.name)}`, props));
            });
            return edges;
        }, []);

    const goalNames = graph.goals.map(goal => goal.name);

    for (const [fromName, toNames] of Object.entries(graph.forwards)) {
        if (!shouldShow(fromName)) {
            continue;
        }
        const copy = toNames.concat();
        const filteredToNames = [];
        for (let i = 0; i < toNames.length; i++) {
            copy.splice(i, 1);
            if (!anyDominates(graph.forwards, copy, toNames[i]) && goalNames.indexOf(toNames[i]) == -1 && shouldShow(toNames[i])) {
                filteredToNames.push(toNames[i]);
            }
            copy.splice(i, 0, toNames[i]);
        }
        if (filteredToNames.length > 1) {
            subgraphs.push(`    subgraph ${mangleName(fromName)}_order {
        rank=same;
        ${filteredToNames.map(toName => mangleName(toName) + ";").join("\n        ")}
    }
    ${line(filteredToNames.map(mangleName).join(" -> "), { style: "invis" })}`);
        }
    }

    const shownGoals = goalNames.filter(shouldShow);
    if (shownGoals.length > 1) {

        subgraphs.push(`    subgraph goal_order {
        rank=same;
        ${shownGoals.concat(parsed.legend ? ["legend_invis"] : []).map(goalName => mangleName(goalName) + ";").join("\n        ")}
    }`);
        subgraphs.push("    " + line(shownGoals.join(" -> "), { style: "invis" }));
    }
    subgraphs.push(`    // top-to-bottom layout directives`);
    subgraphs.push(`    { rank=min; reality; }`);

    for (const {name} of graph.all) {
        if (shouldShow(name) && !graph.forwards[name] && shownGoals.indexOf(name) === -1) {
            for (const goalName of shownGoals) {
                subgraphs.push("    " + line(mangleName(name) + " -> " + mangleName(goalName), { style: "invis", weight: "0" }));
            }
        }
    }
    subgraphs.push(`
    // legend pseudo-nodes
    { rank=max; ${shownGoals.concat(parsed.legend ? ["legend_invis"] : []).map(goalName => mangleName(goalName) + "; ").join("")}}`);
    let footer = "\n\n}\n";
    if (!["undefined", "boolean"].includes(typeof parsed.legend)) {
        throw new Error(`legend attribute must be a boolean, instead was ${typeof parsed.legend}`);
    }
    if (parsed.legend) {
        footer = `    ${line("legend_reality", {
        label: parsed.reality || "Reality",
        ...propertiesOfReality,
    })}
    ${line("legend_fact", {
        label: "Fact",
        fillcolor: theme["fact-fill"],
        fontcolor: theme["fact-text"] || "black",
    })}
    ${line("legend_attack", {
        label: "Attack",
        fillcolor: theme["attack-fill"],
        fontcolor: theme["attack-text"] || "black",
    })}
    ${line("legend_mitigation", {
        label: "Mitigation",
        fillcolor: theme["mitigation-fill"],
        fontcolor: theme["mitigation-text"] || "black",
    })}
    ${line("legend_goal", {
        label: "Goal",
        fillcolor: theme["goal-fill"],
        fontcolor: theme["goal-text"],
    })}
    legend_invis [ label=""; style=invis; ]
    subgraph legend {
        cluster=true;
        margin=10;
        color=${JSON.stringify(theme["edge"])};
        label="Legend";
        legend_reality;
        legend_fact;
        legend_attack;
        legend_mitigation;
        legend_goal;
    }
    legend_reality -> legend_fact -> legend_attack -> legend_mitigation -> legend_goal -> legend_invis [ style=invis; weight=50; ];

    ${shownGoals.map((goalName) => `${line("legend_invis -> " + mangleName(goalName), { style: "invis", weight: "0" })};`).join("\n\t")}

${footer}`;
    }

    return {
        dot: header +
            "    " +
            allNodeLines.join("\n    ") +
            "\n\n    // edges\n    " +
            allEdgeLines.join("\n    ") +
            "\n\n    // left-to-right layout directives\n" +
            subgraphs.join("\n\n") +
            footer,
        title: typeof parsed.title === "string" ? parsed.title : "",
        types: Object.fromEntries(graph.all.map(node => [node.name, node.type])),
        themeName
    };
}

declare function btoa(text: string): string;

function base64Encode(text: string): string {
    return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, function(_match, p1) {
        return String.fromCharCode(parseInt(p1, 16))
    }));
}

declare function atob(text: string): string;

function base64Decode(text: string): string {
    return decodeURIComponent(Array.prototype.map.call(atob(text), function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
}

export function embedDotComment(dot: string, input: string): string {
    return dot + "// deciduous:" + base64Encode(input);
}

export function embedSvgComment(svg: string, input: string): string {
    return svg + "<!-- deciduous:" + base64Encode(input) + " -->";
}

export function trailingPngComment(input: string): string {
    return "\n// deciduous:" + base64Encode(input);
}

export function parseEmbeddedComment(text: string): string | undefined {
    // extract hidden embedded comment
    const match = text.match(/\n(\/\/|<!--) deciduous:([a-zA-Z0-9]+=*)( -->)?$/);
    if (match) {
        return base64Decode(match[2]);
    }
    return undefined;
}

export function convertToTable(parsed: Input) {
    const header = ["type", "name", "label"];
    if (parsed.risk != null) {
        header.push(`risk.${parsed.risk}`, "priority");
    }
    const table = [header];
    for (let node of parseInput(parsed).all) {
        const row = [node.type, node.name, node.label];
        if (parsed.risk != null) {
            const risk = node.getRisk();
            row.push(
                parsed.risk === "value" ? displayRiskValue(risk.value) : risk[parsed.risk],
                displayRiskValue(node.getPriority())
            );
        }
        table.push(row);
    }
    return table;
}
