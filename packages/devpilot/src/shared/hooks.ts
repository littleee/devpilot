import { useEffect, useState } from "react";

export function useScrollTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let rafId = 0;

    const bump = () => {
      if (rafId) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        setTick((value) => value + 1);
      });
    };

    const onResize = () => bump();
    const onScroll = () => bump();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.visualViewport?.addEventListener("scroll", onScroll);
    window.visualViewport?.addEventListener("resize", onResize);

    // Re-calculate after custom fonts load (FOUT/FOIT shifts element positions).
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(bump);
    }

    // Re-calculate after images and other resources finish loading.
    const onLoad = () => bump();
    if (document.readyState === "complete") {
      bump();
    } else {
      window.addEventListener("load", onLoad);
    }

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.visualViewport?.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return tick;
}
