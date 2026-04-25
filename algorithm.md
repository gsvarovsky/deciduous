with: E is an Event
- almost maps to a attack tree graph node, but has only optional (OR) or required (AND) froms

with: AND(E1..En) means p(E1 and E2 and ... En)
after https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_and/

with: OR(E1..En) means p(E1 or E2 or ... En)
after https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_or/

define: node(options, requires) = E<and>(E<or>(options), ...requires)

where: p(E\<and\>) = AND(E.froms)

and: p(E\<or\>) = OR(E.froms)

define: cuts(E1..En) := Set of Graphs having all p(Ex)=1
- Intuition: a "cut" is a path through the graph, from reality, that makes a node have a probability of one

then: E\<and\>.cuts = cuts(froms)

and: E\<or\>.cuts = { ...f:froms => f.cuts }

for two Events E, F: AND(E, F) = p(E|F) * p(F)

p(E|F) = E|or(...cuts(F))

In general: E|F,G = E|or(...cartesian(cuts(F), cuts(G)))

> NOTE the probability of event E given events F or G is not the same as the probability of E given F or E given G

For overlapping cuts:
e.g. E|((F ∩ H ∩ A) ∪ (F ∩ D ∩ A))
= E|(F ∩ A ∩ (H ∪ D))

> probability of event E given events F or G

p(E|F ∪ G) = p(E ∩ (F ∪ G)) / OR(F, G)
= p((E ∩ F) ∪ (E ∩ G)) / OR(F, G)
= (p(E ∩ F) + p(E ∩ G) - p(E ∩ F ∩ G)) / OR(F, G)


### Aside:
> In probability, simplify P((E|A,B)|(E|B)) where P means "probability of", and E, A and B are events

p(E|A,B) = AND(E, A|B) / p(A|B)

Also,
OR((E|A,B), (E|B)) = p(E|A,B) + p(E|B) - p(E|A,B ∩ E|B)
= p(E|A,B) + p(E|B) - p((E|A,B)|(E|B)).p(E|B) [dependent-and]
= p(E|A,B) + p(E|B) - p(E|A,B,E,B).p(E|B) [intuition]
= p(E|A,B) + p(E|B) - 1.p(E|B) [event given event is one]
= p(E|A,B)