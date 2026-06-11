import { useCallback, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { bodies, bodyById } from "./data/bodies.js";
import { BodyPanel } from "./components/BodyPanel.jsx";
import { BrandMark } from "./components/BrandMark.jsx";
import { PlanetSelector } from "./components/PlanetSelector.jsx";
import { SolarSystemScene } from "./components/SolarSystemScene.jsx";
import { TopControls } from "./components/TopControls.jsx";

export function App() {
  const [selectedBodyId, setSelectedBodyId] = useState("earth");
  const [focusLevel, setFocusLevel] = useState(1);
  const [showCelestialGrid, setShowCelestialGrid] = useState(false);

  const selectedBody = useMemo(
    () => (selectedBodyId ? bodyById.get(selectedBodyId) : null),
    [selectedBodyId],
  );

  const selectBody = useCallback((bodyId) => {
    setFocusLevel(selectedBodyId === bodyId ? 2 : 1);
    setSelectedBodyId(bodyId);
  }, [selectedBodyId]);

  const returnOverview = useCallback(() => {
    setSelectedBodyId(null);
    setFocusLevel(0);
  }, []);

  const exitCloseFocus = useCallback(() => {
    setFocusLevel(selectedBodyId ? 1 : 0);
  }, [selectedBodyId]);

  const toggleCelestialGrid = useCallback(() => {
    setShowCelestialGrid((value) => !value);
  }, []);

  return (
    <main className="atlas-app" data-focus-level={focusLevel} data-overview={selectedBody ? "false" : "true"}>
      <SolarSystemScene
        focusLevel={focusLevel}
        onSelectBody={selectBody}
        selectedBodyId={selectedBodyId}
        showCelestialGrid={showCelestialGrid}
      />
      <div className="cosmic-noise" aria-hidden="true" />
      <BrandMark />
      <TopControls
        focusLevel={focusLevel}
        onExitCloseFocus={exitCloseFocus}
        onResetView={returnOverview}
        onToggleCelestialGrid={toggleCelestialGrid}
        showCelestialGrid={showCelestialGrid}
      />

      {selectedBody ? (
        <BodyPanel body={selectedBody} focusLevel={focusLevel} />
      ) : (
        <section className="overview-callout" aria-label="太阳系总览提示">
          <Info size={18} strokeWidth={1.8} />
          <p>点击太阳或任意行星，飞向近景探索更多详情</p>
        </section>
      )}

      <PlanetSelector bodies={bodies} onSelectBody={selectBody} selectedBodyId={selectedBodyId} />
    </main>
  );
}
