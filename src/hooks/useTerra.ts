import { useCallback, useEffect, useState } from "react";

export interface ActivityData {
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number;
  sedentaryMinutes: number;
  lightlyActiveMinutes: number;
  fairlyActiveMinutes: number;
  veryActiveMinutes: number;
}

export interface SleepData {
  totalSleepRecords: number;
  totalMinutesAsleep: number;
  totalTimeInBed: number;
  efficiency: number;
}

export interface HeartRateData {
  restingHeartRate?: number;
  heartRateZones: Array<{
    name: string;
    min: number;
    max: number;
    minutes: number;
    caloriesOut: number;
  }>;
}

export interface HealthData {
  activity?: ActivityData;
  sleep?: SleepData;
  heartRate?: HeartRateData;
  lastSync?: string;
}

export interface TerraState {
  isLinked: boolean;
  terraUserId: string | null;
  data: HealthData;
  isLoading: boolean;
  error: string | null;
}

const TERRA_API_BASE = "http://localhost:3001/api/terra";
const STORAGE_USER_ID = "terra_user_id";

export function useTerra() {
  const [state, setState] = useState<TerraState>({
    isLinked: false,
    terraUserId: null,
    data: {},
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const uid = localStorage.getItem(STORAGE_USER_ID);
    if (uid) {
      setState((prev) => ({ ...prev, isLinked: true, terraUserId: uid }));
      fetchData(uid);
    }
  }, []);

  const authenticate = useCallback(async () => {
    try {
      setState((p) => ({ ...p, isLoading: true, error: null }));
      const response = await fetch(`${TERRA_API_BASE}/connect-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers: ["APPLE", "FITBIT", "GARMIN", "OURA", "WHOOP"] }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const url: string = data.url;
      if (!url) throw new Error("No session URL from Terra");
      // Open Terra Connect URL. For desktop, Terra shows a QR; for mobile Safari it deep-links.
      window.open(url, "_blank");
      // The Terra user_id is established after the user completes linking.
      // For a simple dev flow without webhooks, we ask the user to paste their Terra user ID
      // or you can fetch linked users from your backend if you store mapping by auth user.
      // For now, leave as manual until webhooks are added.
    } catch (e) {
      setState((p) => ({ ...p, error: e instanceof Error ? e.message : "Failed to start Terra session", isLoading: false }));
    }
  }, []);

  const setTerraUser = useCallback((terraUserId: string) => {
    localStorage.setItem(STORAGE_USER_ID, terraUserId);
    setState((p) => ({ ...p, isLinked: true, terraUserId }));
    fetchData(terraUserId);
  }, []);

  const fetchData = useCallback(async (terraUserId?: string) => {
    const uid = terraUserId || state.terraUserId;
    if (!uid) {
      setState((p) => ({ ...p, error: "No Terra user linked" }));
      return;
    }
    try {
      setState((p) => ({ ...p, isLoading: true, error: null }));
      const today = new Date().toISOString().split("T")[0];

      const [dailyRes, sleepRes, heartRes] = await Promise.all([
        fetch(`${TERRA_API_BASE}/daily/${today}?user_id=${encodeURIComponent(uid)}`),
        fetch(`${TERRA_API_BASE}/sleep/${today}?user_id=${encodeURIComponent(uid)}`),
        fetch(`${TERRA_API_BASE}/heart/${today}?user_id=${encodeURIComponent(uid)}`),
      ]);

      const daily = dailyRes.ok ? await dailyRes.json() : null;
      const sleep = sleepRes.ok ? await sleepRes.json() : null;
      const heart = heartRes.ok ? await heartRes.json() : null;

      // Map Terra responses to our common shape
      const parsed: HealthData = {};
      // Daily summary mapping (simplified: take first entry)
      const dailyEntry = daily?.data?.[0] || daily?.daily?.[0] || null;
      if (dailyEntry) {
        const steps = dailyEntry?.steps ?? dailyEntry?.summary?.steps ?? 0;
        const distance = dailyEntry?.distance ?? dailyEntry?.summary?.distance ?? 0;
        const calories = dailyEntry?.calories ?? dailyEntry?.summary?.calories ?? 0;
        const activeMinutes = dailyEntry?.active_minutes ?? dailyEntry?.summary?.active_minutes ?? 0;
        parsed.activity = {
          steps: Number(steps) || 0,
          distance: Number(distance) || 0,
          calories: Number(calories) || 0,
          activeMinutes: Number(activeMinutes) || 0,
          sedentaryMinutes: dailyEntry?.sedentary_minutes ?? 0,
          lightlyActiveMinutes: dailyEntry?.lightly_active_minutes ?? 0,
          fairlyActiveMinutes: dailyEntry?.fairly_active_minutes ?? 0,
          veryActiveMinutes: dailyEntry?.very_active_minutes ?? 0,
        };
      }

      const sleepEntry = sleep?.data?.[0] || sleep?.sleep?.[0] || null;
      if (sleepEntry) {
        const totalMinutesAsleep = sleepEntry?.asleep_duration_minutes ?? sleepEntry?.summary?.asleep_duration_minutes ?? 0;
        const totalTimeInBed = sleepEntry?.time_in_bed_minutes ?? sleepEntry?.summary?.time_in_bed_minutes ?? 0;
        const efficiency = sleepEntry?.efficiency ?? sleepEntry?.summary?.efficiency ?? 0;
        parsed.sleep = {
          totalSleepRecords: 1,
          totalMinutesAsleep: Number(totalMinutesAsleep) || 0,
          totalTimeInBed: Number(totalTimeInBed) || 0,
          efficiency: Number(efficiency) || 0,
        };
      }

      // Heart rate mapping
      const hrEntry = heart?.data?.[0] || heart?.heart_rate?.[0] || null;
      if (hrEntry) {
        const resting = hrEntry?.resting_heart_rate ?? hrEntry?.summary?.resting_heart_rate;
        const zones = hrEntry?.heart_rate_zones || hrEntry?.summary?.heart_rate_zones || [];
        const mappedZones = Array.isArray(zones)
          ? zones.map((z: any) => ({
              name: z?.zone_name || z?.name || "zone",
              min: z?.min || 0,
              max: z?.max || 0,
              minutes: z?.minutes || 0,
              caloriesOut: z?.calories || z?.calories_out || 0,
            }))
          : [];
        parsed.heartRate = {
          restingHeartRate: resting ? Number(resting) : undefined,
          heartRateZones: mappedZones,
        };
      }

      parsed.lastSync = new Date().toISOString();

      setState((p) => ({ ...p, data: parsed, isLoading: false }));
    } catch (e) {
      console.error("Terra fetch error", e);
      setState((p) => ({ ...p, error: e instanceof Error ? e.message : "Failed to fetch Terra data", isLoading: false }));
    }
  }, [state.terraUserId]);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_USER_ID);
    setState({ isLinked: false, terraUserId: null, data: {}, isLoading: false, error: null });
  }, []);

  const refreshData = useCallback(() => {
    if (state.terraUserId) fetchData(state.terraUserId);
  }, [state.terraUserId, fetchData]);

  return {
    ...state,
    authenticate,
    setTerraUser,
    fetchData,
    refreshData,
    signOut,
  };
}
