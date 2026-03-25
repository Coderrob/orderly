interface IChalkLike {
  blue(value: string): string;
  gray(value: string): string;
  green(value: string): string;
  red(value: string): string;
  yellow(value: string): string;
}

/**
 * Returns the provided string unchanged.
 * @param value - String value.
 * @returns Unchanged value.
 */
function passthrough(value: string): string {
  return value;
}

const chalk: IChalkLike = {
  blue: passthrough,
  gray: passthrough,
  green: passthrough,
  red: passthrough,
  yellow: passthrough
};

export default chalk;
