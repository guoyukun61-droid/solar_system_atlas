import { useCallback, useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { bodies, bodyById } from "./data/bodies.js";
import { BodyPanel } from "./components/BodyPanel.jsx";
import { BrandMark } from "./components/BrandMark.jsx";
import { ExploreHud } from "./components/ExploreHud.jsx";
import { PlanetSelector } from "./components/PlanetSelector.jsx";
import { SolarSystemScene } from "./components/SolarSystemScene.jsx";
import { TopControls } from "./components/TopControls.jsx";

export function App() {
  const [selectedBodyId, setSelectedBodyId] = useState("earth");
  const [focusLevel, setFocusLevel] = useState(1);
  const [showCelestialGrid, setShowCelestialGrid] = useState(false);
  const [viewMode, setViewMode] = useState("orbit");
  const [exploreSpeed, setExploreSpeed] = useState(1);
  const [nearbyBody, setNearbyBody] = useState(null);

  const selectedBody = useMemo(
    () => (selectedBodyId ? bodyById.get(selectedBodyId) : null),
    [selectedBodyId],
  );

  const selectBody = useCallback((bodyId) => {
    if (viewMode === "explore") return;
    setFocusLevel(selectedBodyId === bodyId ? 2 : 1);
    setSelectedBodyId(bodyId);
  }, [selectedBodyId, viewMode]);

  const returnOverview = useCallback(() => {
    setViewMode("orbit");
    setSelectedBodyId(null);
    setFocusLevel(0);
  }, []);

  const exitCloseFocus = useCallback(() => {
    setFocusLevel(selectedBodyId ? 1 : 0);
  }, [selectedBodyId]);

  const toggleCelestialGrid = useCallback(() => {
    setShowCelestialGrid((value) => !value);
  }, []);

  const enterExplore = useCallback(() => {
    setShowCelestialGrid(false);
    setSelectedBodyId(null);
    setFocusLevel(0);
    setExploreSpeed(1);
    setNearbyBody(null);
    setViewMode("explore");
  }, []);

  const exitExplore = useCallback(() => {
    setViewMode("orbit");
    setNearbyBody(null);
    setSelectedBodyId(null);
    setFocusLevel(0);
  }, []);

  const changeExploreSpeed = useCallback((nextSpeed) => {
    setExploreSpeed((current) => {
      const value = typeof nextSpeed === "function" ? nextSpeed(current) : nextSpeed;
      return Math.round(Math.min(3, Math.max(0.3, value)) * 10) / 10;
    });
  }, []);

  useEffect(() => {
    if (viewMode !== "explore") return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        exitExplore();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitExplore, viewMode]);

  const isExploring = viewMode === "explore";

  return (
    <main
      className="atlas-app"
      data-focus-level={focusLevel}
      data-overview={selectedBody ? "false" : "true"}
      data-view-mode={viewMode}
    >
      <SolarSystemScene
        exploreSpeed={exploreSpeed}
        focusLevel={focusLevel}
        onExploreSpeedChange={changeExploreSpeed}
        onNearbyBodyChange={setNearbyBody}
        onSelectBody={selectBody}
        selectedBodyId={selectedBodyId}
        showCelestialGrid={showCelestialGrid}
        viewMode={viewMode}
      />
      <div className="cosmic-noise" aria-hidden="true" />
      <BrandMark compact={isExploring} />

      {isExploring ? (
        <ExploreHud
          nearbyBody={nearbyBody}
          onExit={exitExplore}
          onSpeedChange={changeExploreSpeed}
          speed={exploreSpeed}
        />
      ) : (
        <>
          <TopControls
            focusLevel={focusLevel}
            onEnterExplore={enterExplore}
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
        </>
      )}
    </main>
  );
}
