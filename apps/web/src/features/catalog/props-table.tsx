import type { ComponentSchema } from "@ai-components/core";
import { formatPropType } from "@/lib/prompt";

type PropsTableProps = {
  schema: ComponentSchema;
};

/**
 * Tabla de props generada desde el esquema.
 *
 * @param props - El esquema del componente.
 * @returns La tabla.
 */
export const PropsTable = ({ schema }: PropsTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          <tr>
            <th className="border-b border-zinc-200 py-3 pr-4 font-medium dark:border-zinc-800">
              Prop
            </th>
            <th className="border-b border-zinc-200 py-3 pr-4 font-medium dark:border-zinc-800">
              Tipo
            </th>
            <th className="border-b border-zinc-200 py-3 pr-4 font-medium dark:border-zinc-800">
              Default
            </th>
            <th className="border-b border-zinc-200 py-3 font-medium dark:border-zinc-800">
              Descripción
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(schema.props).map(([name, prop]) => (
            <tr key={name} className="align-top">
              <th className="border-b border-zinc-200 py-3 pr-4 font-mono text-[13px] font-medium dark:border-zinc-800">
                {name}
              </th>
              <td className="border-b border-zinc-200 py-3 pr-4 font-mono text-[13px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                {formatPropType(prop)}
                {prop.min !== undefined && prop.max !== undefined
                  ? ` · ${prop.min}–${prop.max}`
                  : ""}
              </td>
              <td className="border-b border-zinc-200 py-3 pr-4 font-mono text-[13px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                {prop.default === undefined ? "—" : JSON.stringify(prop.default)}
              </td>
              <td className="border-b border-zinc-200 py-3 leading-6 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                {prop.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
