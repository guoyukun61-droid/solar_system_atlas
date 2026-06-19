import { Globe2, Maximize2, Minimize2, Rocket, RotateCcw } from "lucide-react";

export function TopControls({
  focusLevel,
  onEnterExplore,
  onExitCloseFocus,
  onResetView,
  onToggleCelestialGrid,
  showCelestialGrid,
}) {
  function requestFullscreen() {
    const root = document.documentElement;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }

    root.requestFullscreen?.();
  }

  return (
    <div className="top-controls" aria-label="视图控制">
      {focusLevel >= 2 ? (
        <button className="focus-exit-button" type="button" onClick={onExitCloseFocus} title="退出近景" aria-label="退出近景">
          <Minimize2 size={16} strokeWidth={1.9} />
          <span>退出近景</span>
        </button>
      ) : null}
      <button className="explore-button" type="button" onClick={onEnterExplore} title="从太阳系外围开始自由漫游" aria-label="自由漫游">
        <Rocket size={16} strokeWidth={1.9} />
        <span>自由漫游</span>
      </button>
      <button
        aria-label={showCelestialGrid ? "关闭天球坐标系" : "打开天球坐标系"}
        data-active={showCelestialGrid ? "true" : "false"}
        onClick={onToggleCelestialGrid}
        title={showCelestialGrid ? "关闭天球坐标系" : "打开天球坐标系"}
        type="button"
      >
        <Globe2 size={18} strokeWidth={1.8} />
      </button>
      <button className="overview-button" type="button" onClick={onResetView} title="回到全局视野" aria-label="回到全局视野">
        <RotateCcw size={16} strokeWidth={1.9} />
        <span>全局视野</span>
      </button>
      <button type="button" onClick={requestFullscreen} title="全屏" aria-label="全屏">
        <Maximize2 size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}
