import { antennaOf, HAT_INSET, orbitOf, talkPath, tongueOf } from "./engine";
import type { BotPose } from "./motion";
import type { BotAccessory, BotState } from "./schema";
import type { BotGeometry } from "./shapes";

type EyeProps = {
  side: -1 | 1;
};

/**
 * Un ojo con todas sus variantes. El CSS muestra la que pide la expresión.
 *
 * @param props - Lado, para reflejar el gesto de esfuerzo.
 * @returns El grupo del ojo.
 */
export const Eye = ({ side }: EyeProps) => {
  return (
    <>
      <g className="bot-avatar__eyeball">
        <ellipse className="bot-avatar__ink" rx="3.5" ry="4.7" />
        <circle className="bot-avatar__catch" cx="1.1" cy="-1.7" r="1.25" />
        <circle className="bot-avatar__catch" cx="-1" cy="1.7" r="0.55" />
      </g>
      <path className="bot-avatar__line bot-avatar__eye--happy" d="M-3.8 1.4Q0 -3.6 3.8 1.4" />
      <path className="bot-avatar__line bot-avatar__eye--closed" d="M-3.8 -0.4Q0 3.4 3.8 -0.4" />
      <path
        className="bot-avatar__line bot-avatar__eye--squeeze"
        d={side < 0 ? "M-3 -3.2L2.8 0L-3 3.2" : "M3 -3.2L-2.8 0L3 3.2"}
      />
    </>
  );
};

type MouthProps = {
  clipId: string;
  talkId: string;
  open: number;
};

/**
 * Todas las bocas. El CSS muestra la que pide `data-mouth`.
 *
 * @param props - Ids para el recorte de la lengua y la apertura inicial.
 * @returns El grupo de la boca.
 */
export const Mouth = ({ clipId, talkId, open }: MouthProps) => {
  const tongue = tongueOf(open);

  return (
    <g className="bot-avatar__mouth" transform="translate(0 8.5)">
      <path className="bot-avatar__line bot-avatar__mouth--smile" d="M-3.4 -0.6Q0 2.6 3.4 -0.6" />
      <g className="bot-avatar__mouth--talk">
        <clipPath id={clipId}>
          <use href={`#${talkId}`} />
        </clipPath>
        <path className="bot-avatar__ink" d={talkPath(open)} data-part="talk" id={talkId} />
        <ellipse
          className="bot-avatar__tongue"
          clipPath={`url(#${clipId})`}
          cx="0"
          cy={tongue.cy}
          data-part="tongue"
          rx={tongue.rx}
          ry={tongue.ry}
        />
      </g>
      <g className="bot-avatar__mouth--grin">
        <path
          className="bot-avatar__ink"
          d="M-4.6 -1.2Q0 -0.2 4.6 -1.2Q4 4.6 0 4.8Q-4 4.6 -4.6 -1.2Z"
        />
        <ellipse className="bot-avatar__tongue" cx="0" cy="3.6" rx="2.3" ry="1.2" />
      </g>
      <ellipse className="bot-avatar__ink bot-avatar__mouth--o" cy="0.6" rx="1.5" ry="1.9" />
      <path
        className="bot-avatar__line bot-avatar__mouth--wavy"
        d="M-4.4 0.6q1.1 -1.6 2.2 0t2.2 0t2.2 0t2.2 0"
      />
      <path className="bot-avatar__line bot-avatar__mouth--flat" d="M-2.6 0.4h5.2" />
    </g>
  );
};

/**
 * Lentes. Van dentro de la cara para seguir la mirada.
 *
 * @returns El grupo de los lentes.
 */
export const Glasses = () => {
  return (
    <g className="bot-avatar__glasses">
      <circle className="bot-avatar__lens" cx="-9.5" r="6.4" />
      <circle className="bot-avatar__lens" cx="9.5" r="6.4" />
      <path
        className="bot-avatar__frame"
        d="M-3.1 -0.8Q0 -2.6 3.1 -0.8M-15.9 -1.2L-19.6 -2.8M15.9 -1.2L19.6 -2.8"
      />
    </g>
  );
};

type HatProps = {
  accessory: BotAccessory;
  geometry: BotGeometry;
  pose: BotPose;
};

/**
 * Lo que va sobre la cabeza. El origen es la coronilla, un poco hundido.
 *
 * @param props - Accesorio, geometría para los audífonos y pose inicial.
 * @returns El accesorio, o null.
 */
export const Hat = ({ accessory, geometry, pose }: HatProps) => {
  switch (accessory) {
    case "antenna": {
      const antenna = antennaOf(pose);
      return (
        <g className="bot-avatar__antenna">
          <path className="bot-avatar__stem" d={antenna.stem} data-part="antenna-stem" />
          <g data-part="antenna-tip" transform={antenna.tip}>
            <circle className="bot-avatar__glow" r="6.2" />
            <circle className="bot-avatar__accent" r="3.7" />
            <circle className="bot-avatar__catch" cx="-1.2" cy="-1.3" r="1.1" />
          </g>
        </g>
      );
    }
    case "sprout":
      return (
        <g data-part="sprout" transform="rotate(0)">
          <path className="bot-avatar__sprout-stem" d="M0 2C0 -2 0.6 -5 0 -8.5" />
          <path
            className="bot-avatar__leaf"
            d="M0 -8C-2.6 -12.4 -8.4 -12.6 -10.4 -8.6C-6.6 -6 -2.6 -6.2 0 -8Z"
          />
          <path
            className="bot-avatar__leaf"
            d="M0 -8.6C2 -14.4 8.6 -16 11.8 -11.6C8.4 -7.6 3.4 -7 0 -8.6Z"
          />
        </g>
      );
    case "halo":
      return (
        <g data-part="halo" transform="translate(0 0)">
          <ellipse className="bot-avatar__halo-glow" cy="-10" rx="14.5" ry="4.4" />
          <ellipse className="bot-avatar__halo" cy="-10" rx="13" ry="3.6" />
        </g>
      );
    case "crown":
      return (
        <g transform="translate(0 1) rotate(-6)">
          <path
            className="bot-avatar__gold"
            d="M-11 3L-12.4 -8.2L-5.6 -2.8L0 -11.4L5.6 -2.8L12.4 -8.2L11 3Q0 5 -11 3Z"
          />
          <path className="bot-avatar__shine" d="M-9.4 0.2Q0 2 9.4 0.2" />
          <circle className="bot-avatar__gold" cx="-12.4" cy="-8.2" r="1.5" />
          <circle className="bot-avatar__gold" cy="-11.4" r="1.6" />
          <circle className="bot-avatar__gold" cx="12.4" cy="-8.2" r="1.5" />
          <circle className="bot-avatar__gem" cy="-0.8" r="1.7" />
          <circle className="bot-avatar__gem bot-avatar__gem--cool" cx="-6.4" cy="-0.3" r="1.15" />
          <circle className="bot-avatar__gem bot-avatar__gem--cool" cx="6.4" cy="-0.3" r="1.15" />
        </g>
      );
    case "party":
      return (
        <g transform="translate(2 1) rotate(14)">
          <path className="bot-avatar__accent" d="M-8.6 2L0.6 -20L8.6 2Q0 4.6 -8.6 2Z" />
          <path className="bot-avatar__stripe" d="M-6.2 -4Q0.4 -2 5.8 -4.6" />
          <path className="bot-avatar__stripe" d="M-3.2 -11.6Q0.6 -10.4 3.2 -12" />
          <circle className="bot-avatar__pom" cx="0.6" cy="-20.6" r="2.8" />
        </g>
      );
    case "headphones": {
      const ex = geometry.earX + 1;
      const ey = geometry.earY - geometry.top - HAT_INSET;
      const control = (-4.5 - 0.25 * ey) / 0.75;
      return (
        <g data-part="headphones" transform="scale(1 1)">
          <path
            className="bot-avatar__band"
            d={`M${-ex} ${ey}C${-ex} ${control} ${ex} ${control} ${ex} ${ey}`}
          />
          <rect
            className="bot-avatar__cup"
            height="15"
            rx="4.5"
            width="9"
            x={-ex - 4.5}
            y={ey - 7.5}
          />
          <rect
            className="bot-avatar__cup"
            height="15"
            rx="4.5"
            width="9"
            x={ex - 4.5}
            y={ey - 7.5}
          />
          <rect
            className="bot-avatar__accent"
            height="9"
            rx="1.6"
            width="3.2"
            x={-ex - 4.6}
            y={ey - 4.5}
          />
          <rect
            className="bot-avatar__accent"
            height="9"
            rx="1.6"
            width="3.2"
            x={ex + 1.4}
            y={ey - 4.5}
          />
        </g>
      );
    }
    default:
      return null;
  }
};

type OrbitProps = {
  layer: "back" | "front";
  angle: number;
};

/**
 * Puntos que orbitan mientras piensa. Se dibuja dos veces: detrás y delante del cuerpo.
 *
 * @param props - Capa y ángulo inicial.
 * @returns Los tres puntos de esa capa.
 */
export const Orbit = ({ layer, angle }: OrbitProps) => {
  return (
    <g className="bot-avatar__orbit">
      {[0, 1, 2].map((index) => {
        const dot = orbitOf(angle, index);
        const shown = layer === "front" ? dot.depth > 0 : dot.depth <= 0;

        return (
          <circle
            cx={dot.cx}
            cy={dot.cy}
            data-part={`orbit-${layer}`}
            key={index}
            opacity={shown ? (layer === "front" ? 1 : 0.7) : 0}
            r={dot.r}
          />
        );
      })}
    </g>
  );
};

const SPARKLES = [
  [16, 30, 1],
  [86, 26, 1.2],
  [10, 64, 0.8],
  [90, 66, 0.9],
  [50, 8, 1.1],
] as const;

type EffectsProps = {
  state: BotState;
  center: { x: number; y: number };
};

/**
 * Efectos de estado que no se aplastan con el cuerpo: ondas, Z, destellos y sudor.
 * Son animaciones CSS, así que se pausan y se quitan solo con CSS.
 *
 * @param props - Estado y centro del cuerpo.
 * @returns Los efectos del estado, o null.
 */
export const Effects = ({ state, center }: EffectsProps) => {
  switch (state) {
    case "listening":
      return (
        <g className="bot-avatar__ripples" transform={`translate(${center.x} ${center.y})`}>
          <circle className="bot-avatar__ripple bot-avatar__fx" r="31" />
          <circle
            className="bot-avatar__ripple bot-avatar__fx"
            r="31"
            style={{ animationDelay: "-1.1s" }}
          />
        </g>
      );
    case "sleeping":
      return (
        <g className="bot-avatar__zzz">
          <text className="bot-avatar__fx" style={{ fontSize: 7 }} x="70" y="31">
            z
          </text>
          <text
            className="bot-avatar__fx"
            style={{ fontSize: 9, animationDelay: "-1.1s" }}
            x="77"
            y="22"
          >
            z
          </text>
          <text
            className="bot-avatar__fx"
            style={{ fontSize: 11, animationDelay: "-2.2s" }}
            x="85"
            y="12"
          >
            z
          </text>
        </g>
      );
    case "success":
      return (
        <g className="bot-avatar__sparkles">
          {SPARKLES.map(([x, y, scale], index) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${scale})`}>
              <path
                className="bot-avatar__sparkle bot-avatar__fx"
                d="M0 -4.4L1.1 -1.1L4.4 0L1.1 1.1L0 4.4L-1.1 1.1L-4.4 0L-1.1 -1.1Z"
                style={{ animationDelay: `${-index * 0.27}s` }}
              />
            </g>
          ))}
        </g>
      );
    case "error":
      return (
        <path
          className="bot-avatar__sweat bot-avatar__fx"
          d="M75 29C77 32 78 33.6 78 34.8A3 3 0 0 1 72 34.8C72 33.6 73 32 75 29Z"
        />
      );
    default:
      return null;
  }
};
