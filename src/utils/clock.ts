/**
 * Date-free clock helpers for deterministic timing and IDs.
 */
export interface IClock {
  /**
   * Returns a monotonic timestamp in milliseconds.
   * @returns The current monotonic time in milliseconds.
   */
  nowMonotonicMs(): number;

  /**
   * Returns a monotonic token suitable for collision-resistant identifiers.
   * @returns A string token derived from the current high-resolution monotonic clock.
   */
  nowMonotonicToken(): string;
}

export const Clock: IClock = {
  /**
   * Returns a monotonic timestamp in milliseconds.
   * @returns The current monotonic time in milliseconds.
   */
  nowMonotonicMs(): number {
    return performance.now();
  },

  /**
   * Returns a monotonic token suitable for collision-resistant identifiers.
   * @returns A string token derived from the current high-resolution monotonic clock.
   */
  nowMonotonicToken(): string {
    return `${process.hrtime.bigint()}`;
  }
};
