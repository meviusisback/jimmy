import { AppData } from './types';

export const DEFAULT_APP_DATA: AppData = {
  user_settings: {
    name: 'Lifter',
    barbell_weight: 7.0,
    available_plates: [
      { weight: 10, quantity: 4 },
      { weight: 5, quantity: 4 },
      { weight: 2, quantity: 4 },
      { weight: 1, quantity: 4 },
      { weight: 0.5, quantity: 2 },
    ],
    rest_timer_seconds: 90,
    experience: 'beginner',
    sex: 'male',
    session_duration_minutes: 60,
    bodyweight_kg: 80,
    country: '',
  },
  workout_programs: [],
  session_history: [],
};