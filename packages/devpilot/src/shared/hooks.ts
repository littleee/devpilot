import { useEffect, useState } from "react";

export function useScrollTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((value) => value + 1);
    const onResize = () => bump();

    window.addEventListener("resize", onResize);

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
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return tick;
}
