import { LogOut, Minus, Plus } from "lucide-react";

export function ExploreHud({ nearbyBody, onExit, onSpeedChange, speed }) {
  return (
    <section className="explore-hud" aria-label="自由漫游控制">
      <button className="explore-exit" type="button" onClick={onExit}>
        <LogOut size={16} strokeWidth={1.9} />
        <span>退出漫游</span>
      </button>

      <div className="hud-corner hud-corner-nw" aria-hidden="true" />
      <div className="hud-corner hud-corner-ne" aria-hidden="true" />
      <div className="hud-corner hud-corner-sw" aria-hidden="true" />
      <div className="hud-corner hud-corner-se" aria-hidden="true" />

      <div className="heading-tape" aria-hidden="true">
        <span>315</span>
        <i />
        <span>000</span>
        <i />
        <span>045</span>
      </div>

      <div className="flight-reticle" aria-hidden="true">
        <span />
        <b>+</b>
      </div>

      {nearbyBody ? (
        <div
          className="target-lock"
          data-side={nearbyBody.screenX > 66 ? "left" : "right"}
          style={{ "--target-x": `${nearbyBody.screenX}%`, "--target-y": `${nearbyBody.screenY}%` }}
          aria-live="polite"
        >
          <div className="target-rings" aria-hidden="true">
            <i />
            <b>{nearbyBody.code}</b>
          </div>
          <div className="nearby-readout">
            <small>OBJ-{nearbyBody.code}</small>
            <span>{nearbyBody.nameZh}</span>
            <em>{nearbyBody.nameEn}</em>
            <strong>DST {nearbyBody.distance.toFixed(1)} DU</strong>
          </div>
        </div>
      ) : null}

      <div className="flight-axis flight-axis-left" aria-hidden="true">
        <span>+20</span><i /><i /><span>00</span><i /><i /><span>-20</span>
      </div>
      <div className="flight-axis flight-axis-right" aria-hidden="true">
        <span>R</span><i /><i /><span>C</span><i /><i /><span>L</span>
      </div>

      <div className="flight-hint">
        <span className="desktop-flight-hint">移动鼠标改变方向 · 滚轮调速</span>
        <span className="mobile-flight-hint">拖动改变方向 · 点击按钮调速</span>
      </div>

      <div className="speed-console">
        <button type="button" onClick={() => onSpeedChange((value) => value - 0.2)} aria-label="降低推进速度">
          <Minus size={17} strokeWidth={2} />
        </button>
        <strong className="speed-number">{speed.toFixed(1)}</strong>
        <button type="button" onClick={() => onSpeedChange((value) => value + 0.2)} aria-label="提高推进速度">
          <Plus size={17} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}
