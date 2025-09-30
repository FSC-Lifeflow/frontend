import { supabase } from "@/lib/supabase";

// SQL (run in Supabase) for reference:
// create table if not exists workouts (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid not null references auth.users(id) on delete cascade,
//   started_at timestamptz not null,
//   type text not null,
//   duration_minutes int not null check (duration_minutes > 0),
//   satisfaction int check (satisfaction between 1 and 5),
//   notes text,
//   created_at timestamptz not null default now()
// );
// create index if not exists idx_workouts_user_started_at on workouts(user_id, started_at desc);

export type WorkoutInsert = {
  user_id: string;
  started_at: string; // ISO string
  type: string;
  duration_minutes: number;
  satisfaction?: number | null;
  notes?: string | null;
};

export type Workout = WorkoutInsert & {
  id: string;
  created_at: string;
};

const LOCAL_KEY_PREFIX = "lifeflow_workouts_";

function useLocalFallback() {
  // If Supabase is configured, we use it. This helper returns false if env present.
  try {
    // Basic sanity check – if these throw, we fallback.
    if (!supabase) return true;
    return false;
  } catch {
    return true;
  }
}

function saveLocal(userId: string, workout: Workout) {
  const key = `${LOCAL_KEY_PREFIX}${userId}`;
  const existing = localStorage.getItem(key);
  const list: Workout[] = existing ? JSON.parse(existing) : [];
  localStorage.setItem(key, JSON.stringify([workout, ...list]));
}

function listLocal(userId: string, limit = 10): Workout[] {
  const key = `${LOCAL_KEY_PREFIX}${userId}`;
  const existing = localStorage.getItem(key);
  const list: Workout[] = existing ? JSON.parse(existing) : [];
  return list.slice(0, limit);
}

export const workoutService = {
  async addWorkout(input: WorkoutInsert): Promise<Workout> {
    const fallback = useLocalFallback();

    if (fallback) {
      const workout: Workout = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...input,
      };
      saveLocal(input.user_id, workout);
      return workout;
    }

    const { data, error } = await supabase
      .from("workouts")
      .insert({
        user_id: input.user_id,
        started_at: input.started_at,
        type: input.type,
        duration_minutes: input.duration_minutes,
        satisfaction: input.satisfaction ?? null,
        notes: input.notes ?? null,
      })
      .select("*")
      .single();

    if (error) {
      // Fallback to local on failure
      const workout: Workout = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...input,
      };
      saveLocal(input.user_id, workout);
      return workout;
    }

    return data as Workout;
  },

  async listRecent(userId: string, limit = 10): Promise<Workout[]> {
    const fallback = useLocalFallback();
    if (fallback) {
      return listLocal(userId, limit);
    }

    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      return listLocal(userId, limit);
    }

    return (data as Workout[]) ?? [];
  },
};
