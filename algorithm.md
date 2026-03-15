
node(options, requires) = E<and>(E<or>(options), E<and>(requires))

p(E<and>) = NXAND(E.froms)

p(E<or>) = NXOR(E.froms)

cuts(E1..En) = Set of Graphs having all p(Ex)=1

E<and>.cuts = cuts(froms)

E<or>.cuts = { ...f:froms => f.cuts }

E|F = NXOR(E|cF1..E|cFn) where cF is chosen from cuts(F)
e.g. E|F,H,A + E|F,D,A - E|F,D,H,A = 0.5 + 1 - 1 = 0.5

E nxand F = p(E|F) * p(F)

NXAND(E1..En) per https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_and/

NXOR(E1..En) per https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_or/
