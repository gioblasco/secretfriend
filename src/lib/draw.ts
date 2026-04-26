import { fnv1a32, makeXorshift32 } from "./random";

export type Pair = {
  giver: string;
  receiver: string;
};

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Returns a single-cycle assignment (no repeats, no self) for n >= 3.
 * Deterministic given the same drawId + participants list.
 */
export function makeSecretFriendPairs(drawId: string, participants: string[]): Pair[] {
  if (participants.length < 3) {
    throw new Error("Mínimo de 3 participantes.");
  }

  const shuffled = participants.slice();
  const rand = makeXorshift32(fnv1a32(drawId));
  shuffleInPlace(shuffled, rand);

  const pairs: Pair[] = [];
  for (let i = 0; i < shuffled.length; i++) {
    const giver = shuffled[i];
    const receiver = shuffled[(i + 1) % shuffled.length];
    if (giver === receiver) {
      // Defensive; a single-cycle construction should never hit this.
      throw new Error("Sorteio inválido. Tente novamente.");
    }
    pairs.push({ giver, receiver });
  }

  return pairs;
}

