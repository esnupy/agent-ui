/**
 * Captura el puntero sin romper el manejador. El navegador lanza una excepción
 * si el puntero ya no está activo (por ejemplo, uno sintético o ya liberado).
 *
 * @param element - Elemento que captura.
 * @param pointerId - Puntero.
 * @param capture - `true` para capturar, `false` para soltar.
 */
export const setCapture = (element: Element, pointerId: number, capture: boolean) => {
  try {
    if (capture) element.setPointerCapture?.(pointerId);
    else if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
  } catch {
    // Sin captura el arrastre sigue funcionando mientras el puntero esté encima.
  }
};
