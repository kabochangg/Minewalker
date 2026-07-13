import seedrandom from "seedrandom";

export interface RandomSource {
  readonly next: () => number;
  readonly int: (minInclusive: number, maxInclusive: number) => number;
}

export function createRandom(seed: string): RandomSource {
  const rng = seedrandom(seed);
  return {
    next: () => rng(),
    int: (minInclusive: number, maxInclusive: number) => {
      if (maxInclusive < minInclusive) {
        throw new Error(
          "maxInclusive must be greater than or equal to minInclusive",
        );
      }
      return (
        Math.floor(rng() * (maxInclusive - minInclusive + 1)) + minInclusive
      );
    },
  };
}
