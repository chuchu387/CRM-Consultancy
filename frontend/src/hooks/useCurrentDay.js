import { useEffect, useState } from "react";

const useCurrentDay = () => {
  const [currentDay, setCurrentDay] = useState(() => new Date());

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let intervalId;
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);

    const timeoutId = window.setTimeout(() => {
      setCurrentDay(new Date());
      intervalId = window.setInterval(() => {
        setCurrentDay(new Date());
      }, 24 * 60 * 60 * 1000);
    }, nextMidnight.getTime() - now.getTime());

    return () => {
      window.clearTimeout(timeoutId);

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return currentDay;
};

export default useCurrentDay;
