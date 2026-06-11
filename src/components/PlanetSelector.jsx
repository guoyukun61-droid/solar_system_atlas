export function PlanetSelector({ bodies, selectedBodyId, onSelectBody }) {
  return (
    <nav className="planet-selector" aria-label="选择太阳或行星">
      <div className="selector-track">
        {bodies.map((body) => {
          const isSelected = selectedBodyId === body.id;

          return (
            <button
              className="planet-chip"
              data-selected={isSelected ? "true" : "false"}
              key={body.id}
              onClick={() => onSelectBody(body.id)}
              style={{ "--accent": body.accentColor, "--texture": `url(${body.texture})` }}
              type="button"
            >
              <span className="chip-orbit-node" aria-hidden="true" />
              <span className="chip-planet" aria-hidden="true" />
              <span className="chip-name">{body.nameZh}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

