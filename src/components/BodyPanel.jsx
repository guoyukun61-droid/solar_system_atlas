import { Compass, Gauge, Orbit, Ruler, Sparkles } from "lucide-react";
import { formatDistance, formatKilometers, formatMoons } from "../utils/format.js";

export function BodyPanel({ body, focusLevel = 1 }) {
  const stats = [
    {
      icon: Ruler,
      label: "直径",
      value: formatKilometers(body.diameterKm),
    },
    {
      icon: Orbit,
      label: "轨道周期",
      value: body.orbitalPeriod,
    },
    {
      icon: Compass,
      label: "平均距离",
      value: formatDistance(body.avgDistanceKm),
    },
    {
      icon: Gauge,
      label: "卫星",
      value: formatMoons(body.moons),
    },
  ];

  return (
    <aside
      className="body-panel"
      data-focus-level={focusLevel}
      style={{ "--accent": body.accentColor, "--texture": `url(${body.texture})` }}
      aria-label={`${body.nameZh}详情`}
    >
      <div className="panel-heading">
        <div>
          <p>{body.nameEn}</p>
          <h2>{body.nameZh}</h2>
        </div>
        <span className="body-kind">
          <Sparkles size={14} strokeWidth={1.8} />
          {body.kind}
        </span>
      </div>

      <div className="panel-planet" aria-hidden="true">
        <div className="panel-planet-image" />
      </div>

      <p className="panel-summary">{body.summaryZh}</p>

      {body.detailZh?.length ? (
        <ul className="detail-list">
          {body.detailZh.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <dl className="stat-list">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="stat-row" key={stat.label}>
              <dt>
                <Icon size={19} strokeWidth={1.7} />
                {stat.label}
              </dt>
              <dd>{stat.value}</dd>
            </div>
          );
        })}
      </dl>

    </aside>
  );
}
