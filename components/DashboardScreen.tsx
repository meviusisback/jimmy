import React, { useState, useEffect } from 'react';
import { AppData, Workout } from '../types';
import { calculateNextWeight, getNextWorkout } from '../services/workoutLogic';
import PlateDisplay from './PlateDisplay';
import ExerciseTooltipContent from './ExerciseTooltipContent';

interface DashboardScreenProps {
  appData: AppData;
  onStartWorkout: (workout: Workout) => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ appData, onStartWorkout }) => {
  const nextWorkout = getNextWorkout(appData);
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (nextWorkout) {
      const initialWeights = nextWorkout.exercises.reduce((acc, exercise) => {
        acc[exercise.name] = calculateNextWeight(exercise.name, appData);
        return acc;
      }, {} as Record<string, number>);
      setExerciseWeights(initialWeights);
    }
  }, [nextWorkout, appData]);

  if (!nextWorkout) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">No Workout Program Found</h2>
        <p className="text-text-secondary">Go to settings to create a workout program.</p>
      </div>
    );
  }

  const smallestPlate = [...appData.user_settings.available_plates].sort((a, b) => a.weight - b.weight).find(p => p.weight > 0);
  const weightIncrement = smallestPlate ? smallestPlate.weight * 2 : 1.0;

  const handleWeightChange = (exerciseName: string, change: number) => {
    setExerciseWeights(prev => {
      const currentWeight = prev[exerciseName] || 0;
      const newWeight = Math.max(appData.user_settings.barbell_weight, currentWeight + change);
      const roundedWeight = Math.round(newWeight * 10) / 10;
      return { ...prev, [exerciseName]: roundedWeight };
    });
  };

  const handleStartWorkoutClick = () => {
    if (!nextWorkout) return;
    const workoutWithWeights: Workout = {
      ...nextWorkout,
      exercises: nextWorkout.exercises.map(ex => ({
        ...ex,
        targetWeight: exerciseWeights[ex.name] ?? calculateNextWeight(ex.name, appData),
      })),
    };
    onStartWorkout(workoutWithWeights);
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-2">Next Workout</h1>
      <h2 className="text-xl text-primary mb-6">{nextWorkout.name}</h2>
      
      <div className="space-y-4 mb-8">
        {nextWorkout.exercises.map((exercise) => {
          if (exercise.isBodyweight) {
            return (
              <div key={exercise.name} className="group relative bg-surface p-4 rounded-lg shadow-md border border-border">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{exercise.name}</h3>
                    <p className="text-text-secondary">{exercise.sets} x {exercise.reps} reps</p>
                  </div>
                  <div className="text-right">
                      <span className="inline-block bg-primary/20 text-primary text-xs font-semibold px-2 py-1 rounded-full">
                          Bodyweight
                      </span>
                  </div>
                </div>
                <div className="absolute z-10 bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-xs sm:left-auto sm:right-0 sm:translate-x-0">
                  <ExerciseTooltipContent exercise={exercise} />
                </div>
              </div>
            );
          }
          
          const targetWeight = exerciseWeights[exercise.name] || 0;
          return (
            <div key={exercise.name} className="group relative bg-surface p-4 rounded-lg shadow-md border border-border">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{exercise.name}</h3>
                  <p className="text-text-secondary">{exercise.sets} x {exercise.reps} reps</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleWeightChange(exercise.name, -weightIncrement)} aria-label="Decrease weight" className="p-1.5 rounded-full bg-primary/20 hover:bg-primary/40 text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                  </button>
                  <p className="text-xl font-bold text-primary w-24 text-center tabular-nums">{targetWeight.toFixed(1)} kg</p>
                  <button onClick={() => handleWeightChange(exercise.name, weightIncrement)} aria-label="Increase weight" className="p-1.5 rounded-full bg-primary/20 hover:bg-primary/40 text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <PlateDisplay targetWeight={targetWeight} settings={appData.user_settings} />
              </div>
              <div className="absolute z-10 bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-max max-w-xs sm:left-auto sm:right-0 sm:translate-x-0">
                  <ExerciseTooltipContent exercise={exercise} />
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleStartWorkoutClick}
        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 px-4 rounded-lg text-xl transition-colors"
      >
        Start Workout
      </button>
    </div>
  );
};

export default DashboardScreen;