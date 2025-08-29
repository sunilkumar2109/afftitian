import { useEffect, useState } from "react";

export function useCountdown(expiryTime?: string | null) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!expiryTime) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiryTime).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) setTimeLeft(`${hours}h ${minutes}m left`);
      else if (minutes > 0) setTimeLeft(`${minutes}m ${seconds}s left`);
      else setTimeLeft(`${seconds}s left`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiryTime]);

  return timeLeft;
}
