export interface BattleScoringStrategy {
  calculatePoints(giftCoinCost: number, quantity: number, multiplier?: number): number;
}

export class DefaultCoinScoringStrategy implements BattleScoringStrategy {
  calculatePoints(giftCoinCost: number, quantity: number, multiplier = 1): number {
    if (giftCoinCost < 0 || quantity < 1) return 0;
    return Math.floor(giftCoinCost * quantity * multiplier);
  }
}
