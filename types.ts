export type ExperienceLevel = 'complete_beginner' | 'beginner' | 'intermediate' | 'expert';
export type Sex = 'male' | 'female';

export interface Plate {
  weight: number;
  quantity: number;
}

export interface UserSettings {
  name: string;
  barbell_weight: number;
  available_plates: Plate[];
  rest_timer_seconds: number;
  experience: ExperienceLevel;
  sex: Sex;
  session_duration_minutes: number;
  bodyweight_kg: number;
  country: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number | 'max';
  targetWeight?: number;
  isBodyweight?: boolean;
  description?: string;
  recommendations?: string;
  equipment?: string[];
}

export interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface WorkoutProgram {
  program_name: string;
  schedule: string[];
  frequency: number;
  workouts: Workout[];
  ai_description?: string;
}

export interface SetCompleted {
  reps: number;
  weight: number;
}

export interface ExercisePerformed {
  name: string;
  sets_completed: SetCompleted[];
}

export interface Session {
  session_id: string;
  date: string;
  workout_id: string;
  exercises_performed: ExercisePerformed[];
}

export interface AppData {
  user_settings: UserSettings;
  workout_programs: WorkoutProgram[];
  session_history: Session[];
}

export type Screen = 'landing' | 'dashboard' | 'workout' | 'history' | 'settings' | 'aiPlanner';