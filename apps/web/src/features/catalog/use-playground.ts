"use client";

import type { ComponentSchema } from "@ai-components/core";
import { useMemo, useState } from "react";
import { getPlaygroundDefaults, type PlaygroundValues, toPreviewProps } from "@/lib/prompt";

/**
 * Conserva los controles del playground y las props que se le pasan al componente.
 *
 * @param schema - Esquema exportado por el paquete.
 * @returns Valores, el setter y las props de preview.
 */
export const usePlayground = (schema: ComponentSchema) => {
  const [values, setValues] = useState<PlaygroundValues>(() => getPlaygroundDefaults(schema));

  const handleChange = (key: string, value: string | number | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const previewProps = useMemo(() => toPreviewProps(schema, values), [schema, values]);

  return { values, handleChange, previewProps };
};
