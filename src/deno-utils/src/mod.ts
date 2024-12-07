import { customAlphabet } from "nanoid";
import { default as printf } from "@stdlib/string-format";
import { assert } from "@std/assert";

export { printf };

export function range(
  start: number,
  stop?: number,
  step?: number,
  inclusive = false
): number[] {
  if (typeof stop == "undefined") {
    // one param defined
    stop = start;
    start = 0;
  }

  if (inclusive) {
    ++stop;
  }

  if (typeof step == "undefined") {
    step = 1;
  }

  if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
    return [];
  }

  const result = [];
  for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
    result.push(i);
  }

  return result;
}

export function rand(min: number, max?: number): number {
  if (max == null) {
    max = min;
    min = 0;
  }
  return Math.floor(Math.random() * (max - min) + min);
}

export function rands(n: number, min: number, max?: number): number[] {
  return range(n).map(() => rand(min, max));
}

export function randUniques(n: number, min: number, max?: number): number[] {
  if (max == null) {
    max = min;
    min = 0;
  }
  if (n > max - min) {
    throw new Error(`\`n\` cannot be bigger than \`max - min\``);
  }
  const set = new Set<number>();
  while (set.size < n) {
    let nextCandidate = rand(min, max);
    while (set.has(nextCandidate)) {
      ++nextCandidate;
      if (nextCandidate >= max - 1) {
        nextCandidate = min;
      }
    }
    set.add(nextCandidate);
  }
  return [...set];
}

export function _<T>(a: readonly T[], i?: number): T {
  if (i === undefined) {
    i = rand(0, a.length - 1);
  }
  return a[i % a.length];
}

export function genCharArray(st: string, ed: string): string[] {
  const res = [];
  const endChar = ed.charCodeAt(0);
  for (let i = st.charCodeAt(0); i <= endChar; ++i) {
    res.push(String.fromCharCode(i));
  }
  return res;
}

const selectableNanoid = customAlphabet(
  [
    ...genCharArray("a", "z"),
    ...genCharArray("A", "Z"),
    ...genCharArray("0", "9"),
  ].join(""),
  5
);
export function generateSelectableNanoid(): string {
  return selectableNanoid();
}

export function crossArray(
  unique: boolean,
  a: readonly unknown[],
  b: readonly unknown[]
): (readonly [unknown, unknown])[] {
  const res = [];
  for (const av of a) {
    for (const bv of b) {
      if (unique && av === bv) {
        continue;
      }
      res.push([av, bv] as const);
    }
  }
  return res.map((v) => v.flat() as unknown as readonly [unknown, unknown]);
}
export function crossArrays(
  unique: boolean,
  ...arrs: (readonly unknown[])[]
): (readonly unknown[])[] {
  if (arrs.length == 2) {
    return crossArray(unique, arrs[0], arrs[1]);
  } else {
    return crossArrays(
      unique,
      crossArray(unique, arrs[0], arrs[1]),
      ...arrs.slice(2)
    );
  }
}

export function* combs(
  n: number,
  unique: boolean,
  a: unknown[],
  ...arrs: unknown[][]
): Generator<readonly unknown[]> {
  const combs =
    arrs.length > 0 ? crossArrays(unique, a, ...arrs) : a.map((v) => [v]);
  debug(n, combs);
  for (const i of randUniques(n, combs.length)) {
    debug(i, combs[i]);
    yield combs[i];
  }
}

export function bitlen(v: number, pf: string): number {
  return printf(`%${pf}`, v).length;
}

export function track<T>(t: T): T {
  debug(t);
  return t;
}

export function debug(...anies: unknown[]): void {
  if (Deno.env.get(`DEBUG`) === "1") console.log(...anies);
}

export function minterms(nums: number[]): string {
  return eq(`\\sum(${nums.join(",")})`);
}

export function maxterms(nums: number[]): string {
  return eq(`\\Pi(${nums.join(",")})`);
}

export function relchar(c: string, i: number): string {
  return String.fromCharCode(c.charCodeAt(0) + i);
}

export function eq(exp: string): string {
  return `\\( ${exp} \\)`;
}

export function swap<T>(a: T[], i: number, j: number) {
  const temp = a[i];
  a[i] = a[j];
  a[j] = temp;
}

export function dedupe<T>(a: T[], key?: (v: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return a.filter((el) => {
    const v = key ? key(el) : el;
    const duplicate = seen.has(v);
    seen.add(v);
    return !duplicate;
  });
}

//? Fisher-Yates Algorithm
export function shuffled<T>(array: T[]): T[] {
  const shuffledArray = [...array]; // Create a copy of the array to avoid mutating the original
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Random index between 0 and i
    // Swap elements
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
}
export function shuffle<T>(array: T[]): T[] {
  const shuffledArray = array;
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Random index between 0 and i
    // Swap elements
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
}

export function buildNumberFromBinaryArray(arr: number[]): number {
  let res = 0;
  for (const b of arr) {
    res <<= 1;
    res += b;
  }
  return res;
}

export function buildBinaryArray(bits: number, x: number): number[] {
  const res: number[] = [];
  for (const i of range(bits)) {
    res[bits - 1 - i] = (x >> i) & 1;
  }
  return res;
}

export function minSigned(bits: number): number {
  const pbits = bits - 1;
  return -(1 << pbits);
}

export function maxSigned(bits: number): number {
  const pbits = bits - 1;
  return (1 << pbits) - 1;
}

export function rangeSigned(bits: number): [number, number] {
  return [minSigned(bits), maxSigned(bits)] as const;
}

export function limitSigned(bits: number): number {
  return 1 << bits;
}

export function sumSigned(bits: number, a: number, b: number): number {
  let r = a + b;
  const [MIN, MAX] = rangeSigned(bits);
  const LIMIT = limitSigned(bits);
  if (r > MAX) {
    r -= LIMIT;
  } else if (r < MIN) {
    r += LIMIT;
  }
  return r;
}

export function binaryString(bits: number, v: number): string {
  assert(bits > 0, `Bits[${bits}] must be a positive non-zero number.`);
  const MAX = maxSigned(bits);
  const MIN = minSigned(bits);
  assert(
    MIN <= v && v <= MAX,
    `Value[${v}] must be between ${MIN} and ${MAX} inclusive.`
  );
  return printf(`%0${bits}b`, v).slice(-bits);
}

export function parseBinary(b: string, bits?: number): number {
  if (!bits) {
    bits = b.length;
  }
  assert(b.length <= bits, `b[${b}] is longer than bits[${bits}]`);
  return sumSigned(bits, parseInt(b, 2), 0);
}

export const arrays = {
  min: <T extends number>(a: T[]): T =>
    a.reduce<T>((prev, curr) => {
      if (prev === null || curr < prev) {
        return curr;
      } else {
        return prev;
      }
    }, null as unknown as T),
  max: <T extends number>(a: T[]): T =>
    a.reduce<T>((prev, curr) => {
      if (prev === null || curr > prev) {
        return curr;
      } else {
        return prev;
      }
    }, null as unknown as T),
  sum: <T extends number>(a: T[]): T =>
    a.reduce<T>((prev, curr) => (prev + curr) as T, 0 as T),
};
