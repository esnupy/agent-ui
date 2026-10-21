/**
 * Une clases condicionales en una sola cadena.
 *
 * @param parts - Clases o valores falsy, que se omiten.
 * @returns La cadena de clases, separada por espacios.
 */
export const cn = (...parts: Array<string | false | null | undefined>): string => {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
};
