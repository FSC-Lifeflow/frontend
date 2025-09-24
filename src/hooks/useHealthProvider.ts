import { useEffect, useState, useCallback } from "react";

export type HealthProvider = "fitbit" | "apple_health";

const STORAGE_KEY = "health_provider";

export function useHealthProvider() {
  const [provider, setProviderState] = useState<HealthProvider>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as HealthProvider | null;
    return saved || "fitbit";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, provider);
  }, [provider]);

  const setProvider = useCallback((p: HealthProvider) => {
    setProviderState(p);
  }, []);

  return { provider, setProvider };
}
