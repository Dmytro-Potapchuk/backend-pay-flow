export function roundMoney(amount: number): number {
    if (!Number.isFinite(amount)) {
        return Number.NaN
    }

    return Math.round((amount + Number.EPSILON) * 100) / 100
}
