with: E is an Event
- almost maps to a attack tree graph node, but has only optional (OR) or required (AND) froms

with: DEPAND(E1..En) after https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_and/

with: DEPOR(E1..En) after https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_or/

define: node(options, requires) = E<and>(E<or>(options), ...requires)

where: p(E\<and\>) = DEPAND(E.froms)

and: p(E\<or\>) = DEPOR(E.froms)

define: cuts(E1..En) := Set of Graphs having all p(Ex)=1
- Intuition: a "cut" is a path through the graph, from reality, that makes a node have a probability of one

then: E\<and\>.cuts = cuts(froms)

and: E\<or\>.cuts = { ...f:froms => f.cuts }

for two Events E, F: E depand F = p(E|F) * p(F)

E|F = DEPOR(...E|(c <- cuts(F)))
- e.g. E|c(F,H,A) + E|c(F,D,A) - E|c(F,D,H,A) = 0.5 + 1 - 1 = 0.5

In general: E|F,G = DEPOR(...E|(c <- cartesian(cuts(F), cuts(G))))
- e.g. E|c(F,H,A) + E|c(F,D,A) + E|c(F,B) - E|c(F,D,H,A) ...
