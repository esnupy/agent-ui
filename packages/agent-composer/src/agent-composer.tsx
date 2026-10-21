"use client";

import { cn } from "@ai-components/core";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

export type AgentComposerProps = {
  /** Texto controlado. Sin esta prop, el campo guarda su propio borrador. */
  value?: string;
  /** Texto cuando el campo está vacío. */
  placeholder?: string;
  /** Etiqueta del modelo en la barra. */
  model?: string;
  /** Muestra el botón de adjuntar. */
  showAttach?: boolean;
  /** Muestra el selector de modelo. */
  showModel?: boolean;
  /** Muestra el botón de voz. */
  showVoice?: boolean;
  /** Muestra el botón de enviar. */
  showSend?: boolean;
  /** Desactiva el campo y las acciones. */
  disabled?: boolean;
  className?: string;
  /** Recibe el texto en cada cambio. */
  onValueChange?: (value: string) => void;
  /** Adjuntar un archivo o contexto. */
  onAttach?: () => void;
  /** Abrir el selector de modelo. */
  onModel?: () => void;
  /** Empezar el dictado. */
  onVoice?: () => void;
  /** Enviar el mensaje, ya recortado. */
  onSubmit?: (value: string) => void;
};

/**
 * Más, para adjuntar contexto.
 *
 * @returns El ícono.
 */
const PlusIcon = () => {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="M8 3.15v9.7M3.15 8h9.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.35"
      />
    </svg>
  );
};

/**
 * Chevrón del modelo, pequeño para no competir con el nombre.
 *
 * @returns El ícono.
 */
const ChevronIcon = () => {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12">
      <path
        d="M2.75 4.35 6 7.65 9.25 4.35"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  );
};

/**
 * Micrófono de trazo fino.
 *
 * @returns El ícono.
 */
const MicIcon = () => {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <rect
        fill="none"
        height="7.2"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
        width="4"
        x="6"
        y="1.8"
      />
      <path
        d="M4.2 7.4a3.8 3.8 0 0 0 7.6 0M8 11.2v2.15M5.7 13.35h4.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
    </svg>
  );
};

/**
 * Flecha hacia arriba del envío.
 *
 * @returns El ícono.
 */
const ArrowUpIcon = () => {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="M8 12.6V3.4M4.15 7.2 8 3.4l3.85 3.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
};

/**
 * Compositor de un mensaje: texto arriba y, abajo, adjuntar, modelo, voz y enviar.
 *
 * Enter envía. Shift+Enter inserta un salto. El botón de enviar espera a que haya texto.
 *
 * @param props - Texto, modelo, visibilidad de cada acción y callbacks.
 * @returns El formulario.
 */
export const AgentComposer = ({
  value,
  placeholder = "Escribe un mensaje",
  model = "Modelo rápido",
  showAttach = true,
  showModel = true,
  showVoice = true,
  showSend = true,
  disabled = false,
  className,
  onValueChange,
  onAttach,
  onModel,
  onVoice,
  onSubmit,
}: AgentComposerProps) => {
  const fieldId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value ?? "");
  const text = value ?? draft;
  const canSend = text.trim().length > 0 && !disabled;

  useEffect(() => {
    if (value !== undefined) setDraft(value);
  }, [value]);

  // El alto sale de scrollHeight; `text` solo dispara el recálculo tras cada cambio.
  // biome-ignore lint/correctness/useExhaustiveDependencies: el texto no se lee, pero cambia el alto
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    field.style.height = "0px";
    field.style.height = `${Math.min(field.scrollHeight, 168)}px`;
  }, [text]);

  const update = (next: string) => {
    if (value === undefined) setDraft(next);
    onValueChange?.(next);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = text.trim();
    if (!next || disabled) return;

    onSubmit?.(next);
    if (value === undefined) setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <form className={cn("agent-composer", className)} onSubmit={handleSubmit}>
      <label className="ac-sr-only" htmlFor={fieldId}>
        Mensaje
      </label>
      <textarea
        className="agent-composer__field"
        disabled={disabled}
        id={fieldId}
        onChange={(event) => {
          update(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={fieldRef}
        rows={1}
        value={text}
      />
      <div className="agent-composer__bar">
        {showAttach ? (
          <button
            aria-label="Adjuntar"
            className="agent-composer__icon"
            disabled={disabled}
            onClick={onAttach}
            type="button"
          >
            <PlusIcon />
          </button>
        ) : (
          <span />
        )}
        <div className="agent-composer__actions">
          {showModel ? (
            <button
              className="agent-composer__model"
              disabled={disabled}
              onClick={onModel}
              title={model}
              type="button"
            >
              <span className="agent-composer__model-label">{model}</span>
              <ChevronIcon />
            </button>
          ) : null}
          {showVoice ? (
            <button
              aria-label="Dictar"
              className="agent-composer__voice"
              disabled={disabled}
              onClick={onVoice}
              type="button"
            >
              <MicIcon />
            </button>
          ) : null}
          {showSend ? (
            <button
              aria-label="Enviar"
              className="agent-composer__send"
              disabled={!canSend}
              type="submit"
            >
              <ArrowUpIcon />
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
};
