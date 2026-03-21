
node(options, requires) = E<and>(E<or>(options), ...requires)

p(E<and>) = DEPAND(E.froms)

p(E<or>) = DEPOR(E.froms)

cuts(E1..En) = Set of Graphs having all p(Ex)=1

E<and>.cuts = cuts(froms)

E<or>.cuts = { ...f:froms => f.cuts }

E|F = DEPOR(...E|(c <- cuts(F)))
e.g. E|c(F,H,A) + E|c(F,D,A) - E|c(F,D,H,A) = 0.5 + 1 - 1 = 0.5
E|F,G = DEPOR(...E|(c <- cartesian(cuts(F), cuts(G))))
e.g. E|c(F,H,A) + E|c(F,D,A) + E|c(F,B) - E|c(F,D,H,A)

E depand F = p(E|F) * p(F)

DEPAND(E1..En) per https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_and/

DEPOR(E1..En) per https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_or/
