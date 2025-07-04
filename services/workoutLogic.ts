import { AppData, Exercise, Session, UserSettings, Workout } from '../types';

const getSensibleStartWeight = (exerciseName: string, barbellWeight: number): number => {
    const name = exerciseName.toLowerCase();
    if (name.includes('squat') || name.includes('deadlift')) {
      return barbellWeight + 20.0;
    }
    if (name.includes('bench') || name.includes('row')) {
      return barbellWeight + 10.0;
    }
    if (name.includes('press')) { 
      return barbellWeight + 5.0; 
    }
    if (name.includes('lunge')) {
        return barbellWeight + 5.0;
    }
    return barbellWeight + 5.0; // A safe default for other exercises
};

export const calculateNextWeight = (exerciseName: string, appData: AppData): number => {
  const { session_history, workout_programs, user_settings } = appData;

  const program = workout_programs[0];
  const exerciseSpecFromProgram = program?.workouts.flatMap(w => w.exercises).find(e => e.name === exerciseName);
  if (exerciseSpecFromProgram?.isBodyweight) {
    return 0;
  }

  const recentSessions = session_history
    .filter(session => session.exercises_performed.some(e => e.name === exerciseName))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (recentSessions.length === 0) {
    return getSensibleStartWeight(exerciseName, user_settings.barbell_weight);
  }

  const lastSession = recentSessions[0];
  const lastPerformance = lastSession.exercises_performed.find(e => e.name === exerciseName);
  if (!lastPerformance || lastPerformance.sets_completed.length === 0) {
     return getSensibleStartWeight(exerciseName, user_settings.barbell_weight);
  }

  const lastWeight = lastPerformance.sets_completed[0].weight;

  const workout = program.workouts.find(w => w.id === lastSession.workout_id);
  const exerciseSpec = workout?.exercises.find(e => e.name === exerciseName);

  if (!exerciseSpec) {
    return lastWeight;
  }
  
  if (typeof exerciseSpec.reps !== 'number') {
    return lastWeight; // Can't progress weight for 'max' reps exercises
  }

  const targetSets = exerciseSpec.sets;
  const targetReps = exerciseSpec.reps;

  const wasSuccessful = lastPerformance.sets_completed.length >= targetSets &&
    lastPerformance.sets_completed.every(set => set.reps >= targetReps);

  if (wasSuccessful) {
    const smallestPlate = [...user_settings.available_plates].sort((a, b) => a.weight - b.weight)[0];
    const increment = smallestPlate ? smallestPlate.weight * 2 : 1.0;
    return lastWeight + increment;
  } else {
    // Check for deload
    if (recentSessions.length > 1) {
      const secondLastSession = recentSessions[1];
      const secondLastPerformance = secondLastSession.exercises_performed.find(e => e.name === exerciseName);
      if (secondLastPerformance && secondLastPerformance.sets_completed.length > 0) {
        const secondLastWeight = secondLastPerformance.sets_completed[0].weight;
        const secondLastWorkout = program.workouts.find(w => w.id === secondLastSession.workout_id);
        const secondLastExerciseSpec = secondLastWorkout?.exercises.find(e => e.name === exerciseName);
        if (secondLastExerciseSpec) {
          if (typeof secondLastExerciseSpec.reps === 'number') {
             const targetReps = secondLastExerciseSpec.reps;
             const secondLastWasSuccessful = secondLastPerformance.sets_completed.length >= secondLastExerciseSpec.sets &&
               secondLastPerformance.sets_completed.every(set => set.reps >= targetReps);

             if (lastWeight === secondLastWeight && !secondLastWasSuccessful) {
                // Two consecutive failures at the same weight
                return Math.round((lastWeight * 0.9) / 0.5) * 0.5; // Deload by 10% and round to nearest 0.5
             }
          }
        }
      }
    }
    return lastWeight; // Repeat the same weight
  }
};

export const calculatePlates = (targetWeight: number, settings: UserSettings): { weight: number; count: number }[] => {
  let weightPerSide = (targetWeight - settings.barbell_weight) / 2;
  if (weightPerSide <= 0) return [];

  const availablePlates = [...settings.available_plates]
    .sort((a, b) => b.weight - a.weight)
    .flatMap(p => Array(p.quantity).fill(p.weight));

  const platesForSide: number[] = [];
  for (const plateWeight of availablePlates) {
    if (weightPerSide >= plateWeight) {
      platesForSide.push(plateWeight);
      weightPerSide -= plateWeight;
    }
  }
  
  // Summarize the result
  const summary: { [key: number]: number } = {};
  for(const plate of platesForSide) {
    summary[plate] = (summary[plate] || 0) + 1;
  }
  
  return Object.entries(summary)
    .map(([weight, count]) => ({ weight: parseFloat(weight), count }))
    .sort((a,b) => b.weight - a.weight);
};

export const getNextWorkout = (appData: AppData): Workout | undefined => {
    const { session_history, workout_programs } = appData;
    const program = workout_programs[0];
    if (!program) return undefined;

    if (session_history.length === 0) {
        return program.workouts.find(w => w.id === program.schedule[0]);
    }

    const lastSession = session_history[session_history.length - 1];
    const lastWorkoutId = lastSession.workout_id;
    const lastWorkoutIndex = program.schedule.indexOf(lastWorkoutId);
    const nextWorkoutIndex = (lastWorkoutIndex + 1) % program.schedule.length;
    const nextWorkoutId = program.schedule[nextWorkoutIndex];

    return program.workouts.find(w => w.id === nextWorkoutId);
}