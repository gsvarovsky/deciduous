/**
 * AND of a set of dependent events
 * After https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_and/
 * @param probabilityOf
 * @param events
 */
export function depAnd<Event>(
    probabilityOf: (e: Event, ...given: Event[]) => number,
    ...events: Event[]
): number {
    let p = 1;
    for (let i = 0; i < events.length; i++) {
        p *= probabilityOf(events[i], ...events.slice(0, i));
    }
    return p;
}

/**
 * Or of a set of dependent (& not mutually exclusive) events
 * After https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_or/
 * @param probabilityOf
 * @param events
 */
export function depOr<Event>(
    probabilityOf: (e: Event, ...given: Event[]) => number,
    ...events: Event[]
): number {
    let p = 0, i = 0;
    for (let combination of combinations(events)) {
        const pCombined = depAnd(probabilityOf, ...combination);
        combination.length % 2 ? p += pCombined : p -= pCombined;
        i++;
    }
    return p;
}

export function *combinations<T>(items: T[]): Generator<T[]> {
    function *gen(n: number, src: T[], soFar: T[]): Generator<T[]> {
        if (n === 0) {
            if (soFar.length > 0)
                yield soFar;
        } else {
            for (let j = 0; j < src.length; j++)
                yield *gen(n - 1, src.slice(j + 1), soFar.concat([src[j]]));
        }
    }
    for (let i = 1; i <= items.length; i++)
        yield *gen(i, items, []);
}