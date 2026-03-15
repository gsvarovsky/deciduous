export function rounded(effect: number) {
    const pow = Math.pow(10, 4);
    return String(Math.round(effect * pow) / pow);
}