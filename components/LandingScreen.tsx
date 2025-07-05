import React, { useState, useEffect } from 'react';
import { AppData, Screen } from '../types';
import { getNextWorkout } from '../services/workoutLogic';
import { UploadIcon, ArrowRightIcon, AiIcon, DocumentTextIcon, ChartIcon, SettingsIcon, UtensilsIcon } from './icons';
import { GoogleGenAI } from "@google/genai";
import ExerciseTooltipContent from './ExerciseTooltipContent';
import DietSuggestionCard from './DietSuggestionCard';

interface LandingScreenProps {
  appData: AppData;
  onNavigate: (screen: Screen) => void;
  onTriggerImport: () => void;
  onExport: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ appData, onNavigate, onTriggerImport, onExport }) => {
  const hasProgram = appData.workout_programs && appData.workout_programs.length > 0;

  if (!hasProgram) {
    return <NewUserView onNavigate={onNavigate} onTriggerImport={onTriggerImport} onExport={onExport} />;
  } else {
    return <ReturningUserView appData={appData} onNavigate={onNavigate} onTriggerImport={onTriggerImport} onExport={onExport} />;
  }
};

const NewUserView: React.FC<Pick<LandingScreenProps, 'onNavigate' | 'onTriggerImport' | 'onExport'>> = ({ onNavigate, onTriggerImport, onExport }) => (
    <div className="p-4 md:p-6 space-y-8">
        <div>
            <h1 className="text-3xl font-bold">Welcome!</h1>
            <p className="text-text-secondary mt-1">Get started by creating a personalized workout plan or managing your data.</p>
        </div>

        <div className="space-y-4">
             <h2 className="text-xl font-semibold">Quick Access</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuickAccessCard
                    icon={<SettingsIcon className="w-6 h-6 text-secondary"/>}
                    title="Settings"
                    description="Adjust equipment and preferences."
                    onClick={() => onNavigate('settings')}
                />
                <QuickAccessCard
                    icon={<AiIcon className="w-6 h-6 text-indigo-400"/>}
                    title="AI Planner"
                    description="Generate a new workout plan."
                    onClick={() => onNavigate('aiPlanner')}
                />
                <QuickAccessCard
                    icon={<UploadIcon className="w-6 h-6 text-green-400"/>}
                    title="Import Data"
                    description="Load workout data from a file."
                    onClick={onTriggerImport}
                />
                <QuickAccessCard
                    icon={<DocumentTextIcon className="w-6 h-6 text-blue-400"/>}
                    title="Export Data"
                    description="Save workout data to a file."
                    onClick={onExport}
                />
             </div>
        </div>
    </div>
);

const ReturningUserView: React.FC<{ appData: AppData; onNavigate: (screen: Screen) => void; onTriggerImport: () => void; onExport: () => void; }> = ({ appData, onNavigate, onTriggerImport, onExport }) => {
    const nextWorkout = getNextWorkout(appData);
    const lastThreeSessions = appData.session_history.slice(-3).reverse();
    const [aiSuggestion, setAiSuggestion] = useState<{ date: string; reason: string } | null>(null);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const [aiDietSuggestion, setAiDietSuggestion] = useState<string | null>(null);
    const [isLoadingDiet, setIsLoadingDiet] = useState(false);
    const [dietError, setDietError] = useState<string | null>(null);
    const [isDietSuggestionOpen, setIsDietSuggestionOpen] = useState(false);

    useEffect(() => {
        const getWorkoutSuggestion = async () => {
            if (!appData || appData.session_history.length === 0 || !appData.workout_programs[0]) {
                return;
            }

            setIsLoadingSuggestion(true);
            try {
                /* if (!process.env.API_KEY) {
                    console.warn("AI suggestion requires an API_KEY environment variable.");
                    return; // Silently fail if no API key
                }

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); */

                const lastSession = appData.session_history[appData.session_history.length - 1];
                const program = appData.workout_programs[0];
                
                const today = new Date().toDateString();

                const prompt = `
As a fitness coach, suggest the next workout date for me. Be encouraging and use my name.

My Profile:
- Name: ${appData.user_settings.name}
- Sex: ${appData.user_settings.sex}
- Bodyweight: ${appData.user_settings.bodyweight_kg} kg
- Experience Level: ${appData.user_settings.experience}

My Current Program:
- Name: "${program.program_name}"
- Frequency: ${program.frequency}-days per week.
- Goal: ${program.ai_description ? `Its description is: "${program.ai_description}"` : "It's a general fitness program."}

Context:
- Today's date is ${today}.
- My last workout was on ${new Date(lastSession.date).toDateString()}.

Based on my profile, program's goal, and frequency, what's the optimal next workout date?
**Crucial Rule:** The suggested date MUST be today or in the future. It cannot be in the past. Even if my last workout was a long time ago, suggest the next logical session starting from today.

Respond in one line: a date string, a pipe "|", then a brief justification.
Example: Friday, July 26|This provides optimal recovery for your ${appData.user_settings.experience} level and your program's intensity, keeping you on track for your ${program.frequency}-day schedule.
`;

                
                async function ai_prompt_maker(prompt: string) {
                    const response = await fetch('http://localhost:3001/api/ai/prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt }),
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Backend error: ${response.status} ${errorText}`);
                    }
                    return response;
                }

                const aiResponseData = await ai_prompt_maker(prompt);
                const data = await aiResponseData.json();
                const text = data.choices?.[0]?.message?.content?.trim?.() ?? data.text?.trim?.() ?? '';
                const [date, reason] = text.split('|').map(s => s.trim());

                if (date && reason) {
                    setAiSuggestion({ date, reason });
                }

            } catch (error) {
                console.error("Failed to get AI workout suggestion:", error);
                // Fail silently without showing an error to the user
            } finally {
                setIsLoadingSuggestion(false);
            }
        };

        getWorkoutSuggestion();
    }, [appData]);

    useEffect(() => {
        const getDietSuggestion = async () => {
            if (!appData || !appData.workout_programs[0] || !nextWorkout) {
                return;
            }

            if (!appData.user_settings.country) {
                setDietError("Set your country to get personalized diet suggestions.");
                return;
            }

            setIsLoadingDiet(true);
            setDietError(null);
            try {
                const lastSession = appData.session_history.length > 0 ? appData.session_history[appData.session_history.length - 1] : null;

                const prompt = `
You are an expert nutritionist AI. Based on my profile, create a simple, actionable diet suggestion for one meal today.

My Profile:
- Name: ${appData.user_settings.name}
- Sex: ${appData.user_settings.sex}
- Bodyweight: ${appData.user_settings.bodyweight_kg} kg
- Experience: ${appData.user_settings.experience}
- Location (for local ingredients): ${appData.user_settings.country}

My Workout Plan:
- Program Goal: ${appData.workout_programs[0].ai_description || 'General fitness.'}
- Next Workout: Today I have "${nextWorkout.name}", which includes exercises like ${nextWorkout.exercises.slice(0, 3).map(e => e.name).join(', ')}.
${lastSession ? `- Last Session Summary (from ${new Date(lastSession.date).toLocaleDateString()}): I performed exercises like ${lastSession.exercises_performed.map(e => e.name).join(', ')}.` : ''}

Your Task:
1. Suggest one meal (e.g., Breakfast, Lunch, Dinner, or Post-Workout).
2. The meal should support my fitness goals (e.g., recovery, energy).
3. Recommend ingredients likely to be fresh and available in my country, considering the current season.
4. Keep the response concise, friendly, and formatted as a single block of text. The first line should be the meal title. Subsequent lines should be bullet points for ingredients/notes, each starting with "- ".
5. Add a final sentence explaining the reasoning. Do not use markdown like ** or *.
`;

                async function ai_prompt_maker(prompt: string) {
                    const response = await fetch('http://localhost:3001/api/ai/prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt }),
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Backend error: ${response.status} ${errorText}`);
                    }
                    return response;
                }

                const aiResponseData = await ai_prompt_maker(prompt);
                const data = await aiResponseData.json();
                const text = data.choices?.[0]?.message?.content?.trim?.() ?? data.text?.trim?.() ?? '';
                if (text) {
                    setAiDietSuggestion(text);
                }

            } catch (error) {
                console.error("Failed to get AI diet suggestion:", error);
                setDietError("Could not fetch a diet tip from the AI coach right now.");
            } finally {
                setIsLoadingDiet(false);
            }
        };

        getDietSuggestion();
    }, [appData, nextWorkout]);


    return (
        <div className="p-4 md:p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Welcome Back, {appData.user_settings.name}!</h1>
                <p className="text-text-secondary">Ready to crush another session?</p>
            </div>

            {nextWorkout && (
                <div className="bg-surface p-4 rounded-lg shadow-md border border-primary/50">
                    <h2 className="text-xl font-semibold mb-3">Your Next Workout</h2>
                    
                    {isLoadingSuggestion && (
                        <div className="text-sm text-text-secondary italic p-3 bg-background rounded-md mb-3">AI Coach is figuring out the best day for you...</div>
                    )}
                    {aiSuggestion && !isLoadingSuggestion && (
                        <div className="text-sm p-3 bg-indigo-900/30 border border-indigo-500/50 rounded-md mb-3">
                            <p className="font-bold text-indigo-300">
                                AI Coach suggests: <span className="text-white">{aiSuggestion.date}</span>
                            </p>
                            <p className="text-indigo-400 italic mt-1">{aiSuggestion.reason}</p>
                        </div>
                    )}

                    <div className="bg-background p-4 rounded-md">
                        <h3 className="text-lg font-bold text-primary">{nextWorkout.name}</h3>
                        <ul className="list-disc list-inside pl-2 mt-2 text-text-secondary">
                            {nextWorkout.exercises.map(ex => (
                                <li key={ex.name} className="group relative w-fit">
                                    {ex.name}
                                    <div className="absolute z-20 bottom-full mb-2 left-0 hidden group-hover:block w-max max-w-xs">
                                        <ExerciseTooltipContent exercise={ex} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="mt-4 w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        <span>Go to Workout</span>
                        <ArrowRightIcon className="w-5 h-5"/>
                    </button>
                </div>
            )}
            
            <div className="bg-surface p-4 rounded-lg shadow-md border border-secondary/50">
                <button
                    onClick={() => setIsDietSuggestionOpen(prev => !prev)}
                    className="w-full text-left flex justify-between items-center"
                    aria-expanded={isDietSuggestionOpen}
                    aria-controls="diet-suggestion-content"
                >
                    <h2 className="text-xl font-semibold flex items-center">
                        <UtensilsIcon className="w-5 h-5 mr-2 text-secondary" />
                        <span>AI Diet Suggestion</span>
                    </h2>
                    <span className={`transform transition-transform duration-200 ${isDietSuggestionOpen ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>
                
                {isDietSuggestionOpen && (
                    <div id="diet-suggestion-content" className="mt-4 pt-4 border-t border-border">
                        {isLoadingDiet && (
                            <div className="text-sm text-text-secondary italic p-3 bg-background rounded-md">AI Chef is cooking up a suggestion...</div>
                        )}
                        {dietError && !isLoadingDiet && (
                            <div className="text-sm p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-md">
                                <p className="font-bold text-yellow-300">Tip</p>
                                <p className="text-yellow-400 italic mt-1">{dietError}</p>
                                {dietError.includes("country") && (
                                    <button onClick={() => onNavigate('settings')} className="mt-2 text-sm text-primary hover:underline">
                                        Go to Settings to add it.
                                    </button>
                                )}
                            </div>
                        )}
                        {aiDietSuggestion && !isLoadingDiet && !dietError && (
                            <DietSuggestionCard suggestion={aiDietSuggestion} />
                        )}
                    </div>
                )}
            </div>

            {lastThreeSessions.length > 0 && (
                 <div className="space-y-4">
                     <h2 className="text-xl font-semibold">Recent Activity</h2>
                     {lastThreeSessions.map(session => {
                        const workout = appData.workout_programs[0]?.workouts.find(w => w.id === session.workout_id);
                        return (
                            <div key={session.session_id} className="bg-surface p-3 rounded-lg border border-border flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{workout?.name || 'Logged Workout'}</p>
                                    <p className="text-sm text-text-secondary">{new Date(session.date).toLocaleDateString()}</p>
                                </div>
                                <DocumentTextIcon className="w-5 h-5 text-text-secondary"/>
                            </div>
                        )
                    })}
                    <button onClick={() => onNavigate('history')} className="text-sm text-primary hover:underline flex items-center space-x-1">
                        <ChartIcon className="w-4 h-4" />
                        <span>View Full History</span>
                    </button>
                </div>
            )}

            <div className="space-y-4">
                 <h2 className="text-xl font-semibold">Quick Access</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <QuickAccessCard
                        icon={<SettingsIcon className="w-6 h-6 text-secondary"/>}
                        title="Settings"
                        description="Adjust equipment and preferences."
                        onClick={() => onNavigate('settings')}
                    />
                    <QuickAccessCard
                        icon={<AiIcon className="w-6 h-6 text-indigo-400"/>}
                        title="AI Planner"
                        description="Generate a new workout plan."
                        onClick={() => onNavigate('aiPlanner')}
                    />
                    <QuickAccessCard
                        icon={<UploadIcon className="w-6 h-6 text-green-400"/>}
                        title="Import Data"
                        description="Load workout data from a file."
                        onClick={onTriggerImport}
                    />
                    <QuickAccessCard
                        icon={<DocumentTextIcon className="w-6 h-6 text-blue-400"/>}
                        title="Export Data"
                        description="Save workout data to a file."
                        onClick={onExport}
                    />
                 </div>
            </div>
        </div>
    );
}

const QuickAccessCard: React.FC<{icon: React.ReactNode, title: string, description: string, onClick: () => void}> = ({icon, title, description, onClick}) => (
    <button onClick={onClick} className="bg-surface hover:bg-border/60 p-4 rounded-lg border border-border text-left w-full transition-colors flex items-start space-x-4">
        <div className="flex-shrink-0 pt-1">{icon}</div>
        <div>
            <p className="font-bold text-text-primary">{title}</p>
            <p className="text-sm text-text-secondary">{description}</p>
        </div>
    </button>
);

export default LandingScreen;
