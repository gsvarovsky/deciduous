export type GetDepProbability<Event> = (e: Event, ...given: Event[]) => number;

/**
 * AND of a set of dependent events
 * After https://chrispiech.github.io/probabilityForComputerScientists/en/part1/prob_and/
 * @param probabilityOf
 * @param events
 */
export function depAnd<Event>(
    probabilityOf: GetDepProbability<Event>,
    ...events: Event[]
): number {
    let p = 1;
    for (let i = 0; i < events.length; i++) {
        const pDependent = probabilityOf(events[i], ...events.slice(0, i));
        p *= pDependent;
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
    probabilityOf: GetDepProbability<Event>,
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
    function *gen(n: number, src: T[], at = 0, ...soFar: T[]): Generator<T[]> {
        if (n === 0) {
            if (soFar.length > 0)
                yield soFar;
        } else {
            for (let j = at; j < src.length; j++)
                yield *gen(n - 1, src, j + 1, ...soFar, src[j]);
        }
    }
    for (let i = 1; i <= items.length; i++)
        yield *gen(i, items);
}

export function *cartesian<T>(sets: Iterable<T>[], at = 0): Generator<T[]> {
    if (sets.length > at) {
        for (let item of sets[at]) {
            if (sets.length === at + 1) {
                yield [item];
            } else {
                for (let set of cartesian(sets, at + 1))
                    yield [item, ...set];
            }
        }
    }
}