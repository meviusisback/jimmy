import React, { useState, useEffect, useCallback } from 'react';
import { Workout, Exercise, ExercisePerformed, AppData, SetCompleted } from '../types';
import { calculateNextWeight } from '../services/workoutLogic';
import PlateDisplay from './PlateDisplay';
import { GoogleGenAI } from "@google/genai";
import { AiIcon } from './icons';

interface ActiveWorkoutScreenProps {
  workout: Workout;
  appData: AppData;
  onFinishWorkout: (performedExercises: ExercisePerformed[]) => void;
}

const ActiveWorkoutScreen: React.FC<ActiveWorkoutScreenProps> = ({ workout, appData, onFinishWorkout }) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Record<string, SetCompleted[]>>({});
  const [repsInput, setRepsInput] = useState<string>('');
  const [targetWeight, setTargetWeight] = useState(0);
  
  const [isResting, setIsResting] = useState(false);
  const [timer, setTimer] = useState(0);

  const [aiPreExerciseMessage, setAiPreExerciseMessage] = useState<string | null>(null);
  const [isGeneratingAiPreExerciseMessage, setIsGeneratingAiPreExerciseMessage] = useState(false);
  const [aiPostSetMessage, setAiPostSetMessage] = useState<string | null>(null);
  const [isGeneratingAiPostSetMessage, setIsGeneratingAiPostSetMessage] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  const currentExercise = workout.exercises[currentExerciseIndex];
  const setsForCurrentExercise = completedSets[currentExercise.name] || [];
  const currentSetNumber = setsForCurrentExercise.length + 1;

  useEffect(() => {
    if (typeof currentExercise.reps === 'number') {
      setRepsInput(currentExercise.reps.toString());
    } else {
      setRepsInput('');
    }
    const newWeight = currentExercise.targetWeight ?? calculateNextWeight(currentExercise.name, appData);
    setTargetWeight(newWeight);
    
    const generatePreExerciseMessage = async (weightForPrompt: number) => {
        setAiPreExerciseMessage(null);
        setAiPostSetMessage(null);
        setAiError(null);
        setIsGeneratingAiPreExerciseMessage(true);
        try {
            if (!process.env.API_KEY) throw new Error("API key not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const lastSessionWithExercise = appData.session_history
                .filter(session => session.exercises_performed.some(e => e.name === currentExercise.name))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            let historyContext = "This is the first time I'm performing this exercise.";
            if (lastSessionWithExercise) {
                const lastPerformance = lastSessionWithExercise.exercises_performed.find(e => e.name === currentExercise.name);
                if (lastPerformance && lastPerformance.sets_completed.length > 0) {
                    const lastWeight = lastPerformance.sets_completed[0].weight;
                    const totalReps = lastPerformance.sets_completed.reduce((sum, set) => sum + set.reps, 0);
                    const weightHistory = currentExercise.isBodyweight ? '' : ` I lifted ${lastWeight}kg.`;
                    historyContext = `Last time on ${new Date(lastSessionWithExercise.date).toLocaleDateString()},${weightHistory} My total volume was ${lastPerformance.sets_completed.length} sets and ${totalReps} reps.`;
                }
            }

            const programContext = `I'm currently on the "${appData.workout_programs[0]?.program_name || 'current'}" program. This exercise, '${currentExercise.name}', is part of today's "${workout.name}" workout.`;
            const targetReps = typeof currentExercise.reps === 'number' ? `${currentExercise.reps} reps` : 'as many reps as possible';
            const weightContext = currentExercise.isBodyweight ? '' : ` at ${weightForPrompt.toFixed(1)} kg`;
            
            const prompt = `
You are Arnold, the best weightlifter ever. You need to be super motivating and get me, ${appData.user_settings.name}, hungry for these results. Provide a personalized pre-lift briefing for my upcoming exercise.

My Details:
- Name: ${appData.user_settings.name}
- Sex: ${appData.user_settings.sex}
- Bodyweight: ${appData.user_settings.bodyweight_kg} kg
- Experience Level: ${appData.user_settings.experience}
- Exercise: ${currentExercise.name}
- Target: ${currentExercise.sets} sets of ${targetReps}${weightContext}.
- Program Context: ${programContext}
- Historical Context: ${historyContext}

Your response MUST have three parts, each on a new line:
1.  **Mindset (1-2 sentences):** A powerful, personalized motivational message. Connect to my past performance or my place in today's workout. Acknowledge my experience level.
2.  **Quote (1 quote):** A famous, relevant quote from a legendary athlete, philosopher, or leader that fits the challenge of this specific lift. Don't Attribute the quote.
3.  **Execution Cues (2-3 bullet points):** Concise, expert-level tips on form and mental focus for this specific lift. Use a "-" prefix for each point.
4.  **Final motivation phrase to push me!

`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-04-17',
                contents: prompt,
            });

            setAiPreExerciseMessage(response.text);

        } catch (e) {
            console.error("Failed to generate pre-exercise message:", e);
            setAiError("Couldn't get a tip from the AI coach. Focus on your form!");
        } finally {
            setIsGeneratingAiPreExerciseMessage(false);
        }
    };
    
    generatePreExerciseMessage(newWeight);

  }, [currentExercise, appData, workout.name]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isResting && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (isResting && timer === 0) {
      setIsResting(false);
      new Audio('https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg').play().catch(e => console.error("Audio playback failed", e));
      
      const setsDone = completedSets[currentExercise.name]?.length || 0;
      if (setsDone >= currentExercise.sets) {
          if (currentExerciseIndex < workout.exercises.length - 1) {
              setCurrentExerciseIndex(prev => prev + 1);
          }
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isResting, timer, completedSets, currentExercise, currentExerciseIndex, workout.exercises.length]);

  const generatePostSetMessage = async (repsCompleted: number) => {
    setAiPostSetMessage(null);
    setIsGeneratingAiPostSetMessage(true);
    setAiError(null);
    try {
        if (!process.env.API_KEY) throw new Error("API key not configured.");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const allSetsForThisExercise = completedSets[currentExercise.name] || [];
        const setIndex = allSetsForThisExercise.length; // 0-based index of the set *before* the one just logged
        const currentSetNumberForPrompt = setIndex + 1;

        let performanceContext = '';
        if (setIndex > 0) {
            const previousSet = allSetsForThisExercise[setIndex - 1];
            performanceContext = `On my previous set, I did ${previousSet.reps} reps.`;
        } else {
            performanceContext = "This was my first set of this exercise today.";
        }

        const setsRemaining = currentExercise.sets - currentSetNumberForPrompt;
        let workoutProgressContext = '';
        if (setsRemaining > 0) {
            workoutProgressContext = `I have ${setsRemaining} set(s) of this exercise left.`;
        } else {
            workoutProgressContext = "This was my last set for this exercise. Time to finish strong.";
        }
        
        const targetReps = currentExercise.reps;
        const weightContext = currentExercise.isBodyweight ? '' : ` at ${targetWeight.toFixed(1)} kg`;

        const prompt = `
You are Arnold, the best weightlifter ever. I just finished a set. Give me, ${appData.user_settings.name}, brief, impactful feedback. My mind is tired, so make it sharp and motivating.

My Profile:
- Name: ${appData.user_settings.name}
- Sex: ${appData.user_settings.sex}
- Bodyweight: ${appData.user_settings.bodyweight_kg} kg
- Experience Level: ${appData.user_settings.experience}

My Performance:
- Exercise: ${currentExercise.name}
- Set Just Completed: I did ${repsCompleted} reps${weightContext}.
- My Target: My goal was ${targetReps} reps.
- Set Number: This was set ${currentSetNumberForPrompt} of ${currentExercise.sets}.
- Context: ${performanceContext} ${workoutProgressContext}

Your response must have two parts, each on a new line:
1.  **Feedback (1 sentence):** Direct, sharp feedback on my performance for that set. Motivate me like you were shouting something inspiring. If I hit my target, be praiseworthy. If I missed, be encouraging but firm about the next set. Compare to my previous set if relevant.
2.  **Quote (1 short quote):** A very short, punchy, motivational quote to carry me into my rest period. Don't attribute it.

Do not use markdown wrapping. Your entire response should be a single block of text with newlines separating the parts.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17',
            contents: prompt,
        });

        setAiPostSetMessage(response.text);

    } catch (e) {
        console.error("Failed to generate post-set message:", e);
        setAiPostSetMessage("Great effort on that set! Let's get ready for the next one.");
    } finally {
        setIsGeneratingAiPostSetMessage(false);
    }
  };

  const handleLogSet = async () => {
    const reps = parseInt(repsInput, 10);
    if (isNaN(reps)) return;

    await generatePostSetMessage(reps);

    const newSet: SetCompleted = { reps, weight: targetWeight };
    const updatedSets = {
      ...completedSets,
      [currentExercise.name]: [...(completedSets[currentExercise.name] || []), newSet],
    };
    setCompletedSets(updatedSets);

    const justCompletedSetNumber = (completedSets[currentExercise.name] || []).length + 1;
    const isLastSetOfExercise = justCompletedSetNumber >= currentExercise.sets;
    const isLastExerciseOfWorkout = currentExerciseIndex >= workout.exercises.length - 1;

    if (!(isLastSetOfExercise && isLastExerciseOfWorkout)) {
        setTimer(appData.user_settings.rest_timer_seconds);
        setIsResting(true);
    }
  };

  const handleFinishWorkout = () => {
    const performedExercises: ExercisePerformed[] = Object.entries(completedSets).map(([name, sets]) => ({
      name,
      sets_completed: sets,
    }));
    onFinishWorkout(performedExercises);
  };
  
  const isWorkoutFinished = currentExerciseIndex >= workout.exercises.length - 1 && currentSetNumber > currentExercise.sets;

  const smallestPlate = [...appData.user_settings.available_plates].sort((a, b) => a.weight - b.weight).find(p => p.weight > 0);
  const weightIncrement = smallestPlate ? smallestPlate.weight * 2 : 1.0;

  const handleIncrementWeight = () => {
    setTargetWeight(w => w + weightIncrement);
  };

  const handleDecrementWeight = () => {
    setTargetWeight(w => Math.max(appData.user_settings.barbell_weight, w - weightIncrement));
  };


  if (isResting) {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return (
        <div className="p-6 flex flex-col items-center justify-center h-full">
            <h2 className="text-3xl font-bold text-text-secondary mb-4">REST</h2>
            <p className="text-8xl font-mono font-bold text-primary mb-8">{`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}</p>
            
            <div className="w-full max-w-sm mb-8 bg-surface p-4 rounded-lg border border-indigo-500/50">
              <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1"><AiIcon className="w-6 h-6 text-indigo-400" /></div>
                  <div className="flex-1">
                      {isGeneratingAiPostSetMessage ? (
                          <p className="text-text-secondary italic">Coach is thinking...</p>
                      ) : aiPostSetMessage ? (
                          <p className="text-text-primary font-semibold whitespace-pre-wrap">{aiPostSetMessage}</p>
                      ) : (
                         <p className="text-text-secondary">Catch your breath, get ready!</p>
                      )}
                  </div>
              </div>
            </div>
            
            <button
                onClick={() => setTimer(0)}
                className="w-full max-w-sm bg-surface hover:bg-border text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
            >
                Skip Rest
            </button>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1">{currentExercise.name}</h1>
      <p className="text-lg text-text-secondary mb-4">Set {currentSetNumber} of {currentExercise.sets}</p>

      <div className="bg-surface p-4 rounded-lg shadow-md border border-indigo-500/50 mb-6">
          <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 pt-1">
                  <AiIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                  <h3 className="text-lg font-bold text-indigo-300">AI Coach says...</h3>
                  {isGeneratingAiPreExerciseMessage ? (
                      <p className="text-text-secondary italic mt-1">Your coach is preparing some tips...</p>
                  ) : aiError ? (
                      <p className="text-red-400 mt-1">{aiError}</p>
                  ) : aiPreExerciseMessage ? (
                      <p className="text-text-primary whitespace-pre-wrap mt-1">{aiPreExerciseMessage}</p>
                  ) : null}
              </div>
          </div>
      </div>

      <div className="bg-surface p-6 rounded-lg shadow-lg border border-border mb-6">
        {currentExercise.isBodyweight ? (
            <div className="text-center py-8">
                <p className="text-5xl font-bold text-primary">{currentExercise.name}</p>
                <p className="text-xl text-text-secondary mt-2">for {currentExercise.reps === 'max' ? 'max' : currentExercise.reps} reps</p>
                <span className="mt-4 inline-block bg-primary/20 text-primary text-xs font-semibold px-2 py-1 rounded-full">
                    Bodyweight
                </span>
            </div>
        ) : (
          <>
            <div className="text-center mb-4">
                <div className="flex items-center justify-center space-x-4">
                  <button onClick={handleDecrementWeight} aria-label="Decrease weight" className="p-2 rounded-full bg-primary/20 hover:bg-primary/40 text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                  </button>
                  <p className="text-5xl font-bold text-primary tabular-nums w-48 text-center">{targetWeight.toFixed(1)} kg</p>
                  <button onClick={handleIncrementWeight} aria-label="Increase weight" className="p-2 rounded-full bg-primary/20 hover:bg-primary/40 text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
                <p className="text-xl text-text-secondary mt-2">for {currentExercise.reps} reps</p>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <PlateDisplay targetWeight={targetWeight} settings={appData.user_settings} />
            </div>
          </>
        )}
      </div>
      
       <div className="mb-6">
         <label htmlFor="reps" className="block text-lg font-medium text-text-secondary mb-2">Reps Completed</label>
         <input
            type="number"
            id="reps"
            value={repsInput}
            onChange={(e) => setRepsInput(e.target.value)}
            className="w-full bg-surface border border-border text-text-primary text-2xl p-4 rounded-lg text-center"
            placeholder="0"
         />
       </div>

      {!isWorkoutFinished ? (
        <button
          onClick={handleLogSet}
          disabled={isGeneratingAiPostSetMessage}
          className="w-full bg-success hover:bg-green-600 text-white font-bold py-4 px-4 rounded-lg text-xl transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isGeneratingAiPostSetMessage ? (
              <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging Set...
              </>
          ) : 'Log Set'}
        </button>
      ) : (
        <div className="text-center p-4 bg-surface rounded-lg border border-success">
          <p className="text-success text-lg font-bold">Last set completed!</p>
          {isGeneratingAiPostSetMessage && <p className="text-text-secondary italic mt-2">Coach is preparing your final words...</p>}
          {aiPostSetMessage && <p className="text-text-primary mt-2 font-semibold whitespace-pre-wrap">{aiPostSetMessage}</p>}
        </div>
      )}

      <button
        onClick={handleFinishWorkout}
        className="w-full mt-4 bg-primary hover:bg-primary-hover text-white font-bold py-4 px-4 rounded-lg text-xl transition-colors"
      >
        Finish Workout
      </button>
    </div>
  );
};

export default ActiveWorkoutScreen;