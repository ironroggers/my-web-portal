import { useCallback, useEffect, useRef, useState } from "react";

// Samples navigator.geolocation for up to `seconds` (stops early once a fix is within
// `limit`) and keeps the best fix. `live` is the latest fix while sampling.
export const useGpsSampler = ({ seconds = 10, limit = 1 } = {}) => {
  const [sampling, setSampling] = useState(false);
  const [live, setLive] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const stopRef = useRef(null);

  const stop = useCallback(() => stopRef.current?.(), []);
  useEffect(() => stop, [stop]);

  const sample = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("This browser can't give a GPS location. Type the location instead."));
          return;
        }
        let best = null;
        let done = false;
        let lastError = null;
        const started = Date.now();
        setSampling(true);
        setLive(null);
        setElapsed(0);

        const finish = () => {
          if (done) return;
          done = true;
          navigator.geolocation.clearWatch(watchId);
          clearInterval(tick);
          clearTimeout(timeout);
          stopRef.current = null;
          setSampling(false);
          if (best) resolve(best);
          else
            reject(
              new Error(
                lastError?.code === 1
                  ? "Location permission was denied. Allow location for this site, or type the location."
                  : "Could not get a GPS fix. Check that location is on and try again."
              )
            );
        };
        stopRef.current = finish;

        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const fix = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              capturedAt: new Date().toISOString(),
            };
            setLive(fix);
            if (!best || fix.accuracy < best.accuracy) best = fix;
            if (fix.accuracy <= limit) finish();
          },
          (error) => {
            lastError = error;
            if (error.code === 1) finish();
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: seconds * 1000 }
        );
        const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
        const timeout = setTimeout(finish, seconds * 1000);
      }),
    [seconds, limit]
  );

  return { sample, stop, sampling, live, elapsed };
};
