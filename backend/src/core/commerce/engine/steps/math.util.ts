export const toInt = (value: unknown, min = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(Math.trunc(parsed), min);
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const roundHalfUpDivide = (
  numerator: number,
  denominator: number,
): number => {
  if (denominator <= 0) return 0;
  return Math.floor((numerator + denominator / 2) / denominator);
};

export const distributeProportionally = (
  totalAmountCents: number,
  weights: number[],
): number[] => {
  const total = toInt(totalAmountCents, 0);
  if (weights.length === 0 || total <= 0) {
    return weights.map(() => 0);
  }

  const normalizedWeights = weights.map((weight) => toInt(weight, 0));
  const weightSum = normalizedWeights.reduce((acc, weight) => acc + weight, 0);
  if (weightSum <= 0) {
    return normalizedWeights.map((_, index) =>
      index === normalizedWeights.length - 1 ? total : 0,
    );
  }

  let distributed = 0;
  return normalizedWeights.map((weight, index) => {
    const isLast = index === normalizedWeights.length - 1;
    if (isLast) {
      return total - distributed;
    }

    const share = Math.floor((total * weight) / weightSum);
    distributed += share;
    return share;
  });
};
