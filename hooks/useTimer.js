import { useState, useRef } from "react";

export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = () => {
    if (running) return;
    setRunning(true);

    intervalRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  };

  const pause = () => {
    if (!running) return;
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  const reset = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    setSeconds(0);
  };

  return {
    seconds,
    running,
    start,
    pause,
    reset
  };
}
