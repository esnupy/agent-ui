/**
 * Formatea segundos como `12s` o `1m 4s`.
 *
 * @param seconds - Duración en segundos. Los negativos se tratan como cero.
 * @returns La duración lista para el encabezado.
 */
export const formatDuration = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;

  if (minutes === 0) return `${rest}s`;
  if (rest === 0) return `${minutes}m`;

  return `${minutes}m ${rest}s`;
};

/**
 * Dice si el scroll sigue pegado al final, con un margen para no soltarse por un pixel.
 *
 * @param scrollTop - Desplazamiento actual.
 * @param clientHeight - Alto visible.
 * @param scrollHeight - Alto total del contenido.
 * @param threshold - Margen en pixeles.
 * @returns `true` si el usuario no se fue hacia arriba.
 */
export const isPinnedToBottom = (
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  threshold = 8,
): boolean => {
  return scrollHeight - (scrollTop + clientHeight) <= threshold;
};
