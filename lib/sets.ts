export function union<E>(sets: ReadonlySet<E>[], mustBeIn?: ReadonlySet<E>[]) {
    const union = new Set<E>;
    for (let set of sets) {
        for (let elem of set) {
            if (mustBeIn == null || mustBeIn.some(s => s.has(elem)))
                union.add(elem);
        }
    }
    return union;
}

export function simplifyUnion<S>(intersections: ReadonlySet<S>[]): ReadonlySet<S>[] {
    // 1. Remove empty intersections (Identity Law: A ∪ ∅ = A)
    const nonNullable = intersections.filter(s => s.size > 0);
    // If everything was empty, return one empty set to represent the result
    if (nonNullable.length === 0 && intersections.length > 0) {
        return [new Set()];
    }
    // 2. Apply Absorption Law to the remaining non-empty sets    // Filter the union: keep a Set only if no other Set in the array is a subset of it.
    return nonNullable.filter((currentSet, i) => {
        return !nonNullable.some((otherSet, j) => {
            if (i === j) {
                return false;
            } else if (otherSet.size > currentSet.size) {
                // In a union, the set with FEWER constraints (smaller size)
                // absorbs the set with MORE constraints (larger size).
                return false;
            } else {
                for (let item of otherSet) {
                    if (!currentSet.has(item))
                        return false;
                }
                // If they are the same size (identical sets),
                // only remove 'currentSet' if it appears earlier in the array (i < j).
                // This ensures exactly one of the duplicates is preserved.
                if (otherSet.size === currentSet.size)
                    return i < j;
                // If otherSet is strictly smaller, it absorbs currentSet.
                return true;
            }
        });
    });
}