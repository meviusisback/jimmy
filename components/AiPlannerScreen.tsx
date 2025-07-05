import React, { useState } from 'react';
import { AppData, WorkoutProgram, ExperienceLevel, Sex, UserSettings } from '../types';
import { GoogleGenAI } from "@google/genai";
import { UserIcon } from './icons';

interface AiPlannerScreenProps {
    appData: AppData;
    onFinishPlanning: (program: WorkoutProgram, settings: UserSettings) => void;
}

const AiPlannerScreen: React.FC<AiPlannerScreenProps> = ({ appData, onFinishPlanning }) => {
    const [goal, setGoal] = useState('hypertrophy');
    const hasHistory = appData.session_history && appData.session_history.length > 0;
    const [useHistory, setUseHistory] = useState(hasHistory);
    const [frequency, setFrequency] = useState(appData.workout_programs[0]?.frequency ?? 3);
    const [equipment, setEquipment] = useState<string[]>(['barbell', 'bench']);
    const [name, setName] = useState<string>(appData.user_settings.name || '');
    const [experience, setExperience] = useState<ExperienceLevel>(appData.user_settings.experience);
    const [sex, setSex] = useState<Sex>(appData.user_settings.sex);
    const [duration, setDuration] = useState<number>(appData.user_settings.session_duration_minutes);
    const [bodyweight, setBodyweight] = useState<number>(appData.user_settings.bodyweight_kg);
    const [country, setCountry] = useState<string>(appData.user_settings.country || '');
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableEquipment = ['barbell', 'dumbbells', 'pullup bar', 'bench', 'kettlebells', 'resistance bands', 'bodyweight'];

    const handleEquipmentChange = (item: string) => {
        setEquipment(prev =>
            prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
        );
    };

    const buildPrompt = (): string => {
        const historyData = useHistory ? JSON.stringify({
            user_settings: {
                barbell_weight: appData.user_settings.barbell_weight,
                available_plates: appData.user_settings.available_plates,
            },
            past_programs: appData.workout_programs,
            session_history: appData.session_history
        }, null, 2) : 'Not provided.';

        const additionalInstructionsText = additionalInstructions.trim() || 'None provided.';

        return `
You are an expert fitness coach AI. Your task is to create a personalized workout program. Leverage your deep knowledge of strength training principles to create a safe and effective plan. Acknowledge that users can lift significantly more weight on exercises like squats compared to overhead presses, and that progression rates differ accordingly.

Your response MUST be a single, valid JSON object and nothing else. Do not wrap it in markdown fences (e.g., \`\`\`json) or add any explanatory text.

The JSON object must conform to this structure:
{
  "program_name": "string",
  "ai_description": "string",
  "frequency": "number",
  "schedule": ["string", "string", ...],
  "workouts": [
    {
      "id": "string",
      "name": "string",
      "exercises": [
        {
          "name": "string",
          "sets": "number",
          "reps": "number | 'max'",
          "isBodyweight": "boolean",
          "targetWeight": "number",
          "description": "string (1-2 sentence description of the exercise and primary muscles targeted)",
          "recommendations": "string (2-3 key tips or common mistakes to avoid. Use markdown list format, e.g., '- Tip 1\\n- Tip 2')",
          "equipment": ["string"]
        }
      ]
    }
  ]
}

Here are the rules for generation:
1. "program_name": Create a descriptive name for the program.
2. "ai_description": Provide a short (2-3 sentences) description of the program's philosophy. Explain the split (e.g., Push/Pull/Legs), why certain exercises were chosen, or how it aligns with the user's goal. If the user provided additional instructions, acknowledge them here.
3. "frequency": The number of workouts per week. This MUST match the "Weekly Frequency" from user requirements.
4. "schedule": An array of workout IDs (e.g., ["A", "B", "C"]). The length of this array MUST match the "frequency" field and the "Weekly Frequency" provided by the user.
5. "workouts": An array of workout objects. The number of objects must match the length of the "schedule".
6. "workouts.id": Must be one of the IDs from the "schedule" array.
7. "workouts.name": A descriptive name for the workout (e.g., "Push Day A").
8. "workouts.exercises": The order of exercises is crucial. Always start with the most demanding compound lifts (e.g., Squats, Deadlifts, Bench Press) and finish with smaller isolation or accessory exercises. This ensures maximum performance and safety.
9. "workouts.exercises.reps": This can be a number (e.g., 8) or the literal string 'max' (for exercises done to failure).
10. "workouts.exercises.isBodyweight": (Optional) Set to true for bodyweight exercises like 'Pull-ups', 'Push-ups', 'Dips'. If omitted, it defaults to false.
11. "workouts.exercises.targetWeight": This field is MANDATORY.
    - If "isBodyweight" is true, this MUST be 0.
    - **Initial Weight Logic:** You MUST suggest a sensible starting weight. Use your knowledge and the user's profile (sex, bodyweight, experience level) to set a challenging but safe weight. DO NOT use a single default value. A 100kg male expert will lift much more than a 60kg female beginner. Adjust starting weights accordingly. For example:
        - An intermediate 80kg male might start squats at 60kg.
        - A beginner 60kg female might start squats at 20kg (just the bar).
    - **Progression Logic:** If "Consider Past Performance Data" is "Yes", base the new targetWeight on the user's most recent performance.
        - **Success:** If they completed all sets/reps, suggest a small, appropriate increase. The size of the increase depends on the exercise and user experience (beginners progress faster). Major lifts (Squat, Deadlift, Bench) can increase more than smaller lifts (Overhead Press, Curls).
        - **Failure:** If they failed, suggest repeating the weight. For repeated failures, suggest a 10% deload.
12. "workouts.exercises.description": A concise 1-2 sentence description of the exercise, including the primary muscles targeted.
13. "workouts.exercises.recommendations": Provide 2-3 essential execution tips or common mistakes to avoid. This MUST be a single string. Use a markdown-style list format, with each point prefixed by '- ' and separated by a newline character (\\n).
14. "workouts.exercises.equipment": An array of strings listing the specific equipment required from the 'Available Equipment' list. For 'bodyweight' exercises, use ["bodyweight"].

**User Requirements & Profile:**
- Name: ${name}
- Primary Goal: ${goal}
- Weekly Frequency: ${frequency} days per week.
- Target Session Duration: ${duration} minutes.
- Available Equipment: ${equipment.join(', ')}
- Sex: ${sex}
- Bodyweight: ${bodyweight} kg
- Experience Level: ${experience}
- Consider Past Performance Data: ${useHistory ? 'Yes' : 'No'}
- Additional Instructions: ${additionalInstructionsText}

**User's Past Performance Data & Settings (for context if requested):**
${historyData}

Generate the JSON response now. Fit the workout into the requested session duration.`;
    };

    const handleGeneratePlan = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const prompt = buildPrompt();

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
                return response.json();
            }

            const aiResponse = await ai_prompt_maker(prompt);

            

            let jsonStr = aiResponse.choices?.[0]?.message?.content?.trim?.() ?? '';
            if (!jsonStr) {
                throw new Error("AI response was empty or invalid. Please check your API key, backend logs, or try again later.");
            }
            const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) {
                jsonStr = match[2].trim();
            }

            let newProgram: WorkoutProgram;
            try {
                newProgram = JSON.parse(jsonStr) as WorkoutProgram;
            } catch (parseErr) {
                throw new Error("Failed to parse AI response as JSON. Raw response: " + jsonStr);
            }

            // Add basic validation
            if (
                !newProgram.program_name ||
                !newProgram.schedule ||
                !newProgram.workouts ||
                !newProgram.ai_description ||
                !newProgram.frequency
            ) {
                throw new Error("Invalid program structure received from AI.");
            }

            const updatedSettings: UserSettings = {
                ...appData.user_settings,
                name,
                experience,
                sex,
                session_duration_minutes: duration,
                bodyweight_kg: bodyweight,
                country,
            };

            onFinishPlanning(newProgram, updatedSettings);

        } catch (e) {
            console.error("Failed to generate or parse workout plan:", e);
            setError(
                `An error occurred while generating the plan. ${
                    e instanceof Error ? e.message : 'Please check the console for details.'
                }`
            );
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="p-4 md:p-6 space-y-8">
            <h1 className="text-3xl font-bold">AI Workout Planner</h1>

            <Section title="Your Profile">
                <div>
                    <label htmlFor="user-name" className="flex items-center text-sm font-medium text-text-secondary mb-1">
                        <UserIcon className="w-4 h-4 mr-2" />
                        <span>Your Name</span>
                    </label>
                    <input id="user-name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-background p-2 border border-border rounded-md" placeholder="Enter your name"/>
                    <p className="text-xs text-text-secondary mt-1">
                        The AI coach will use this to personalize your experience.
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Your Experience Level</label>
                    <select value={experience} onChange={e => setExperience(e.target.value as ExperienceLevel)} className="w-full bg-background p-2 border border-border rounded-md">
                        <option value="complete_beginner">Complete Beginner</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="expert">Expert</option>
                    </select>
                    <p className="text-xs text-text-secondary mt-1">
                        {
                            {
                                'complete_beginner': "You've never done structured weight training before.",
                                'beginner': "You've been training for less than a year, still learning form and making rapid strength gains.",
                                'intermediate': "You've been training for 1-3 years, progress is slower and more deliberate.",
                                'expert': "You have multiple years of dedicated training experience."
                            }[experience]
                        }
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Sex</label>
                    <select value={sex} onChange={e => setSex(e.target.value as Sex)} className="w-full bg-background p-2 border border-border rounded-md">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Your Bodyweight (kg)</label>
                    <input type="number" value={bodyweight} onChange={e => setBodyweight(parseFloat(e.target.value))} className="w-full bg-background p-2 border border-border rounded-md"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Country</label>
                    <input type="text" value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-background p-2 border border-border rounded-md" placeholder="e.g. Brazil"/>
                    <p className="text-xs text-text-secondary mt-1">
                        This helps the AI suggest diet ideas with local ingredients.
                    </p>
                </div>
            </Section>

            <Section title="Your Goals">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Primary Goal</label>
                    <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-background p-2 border border-border rounded-md">
                        <option value="hypertrophy">Hypertrophy (Muscle Growth)</option>
                        <option value="strength">Strength</option>
                        <option value="conditioning">General Conditioning</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Workouts per Week</label>
                    <select value={frequency} onChange={e => setFrequency(parseInt(e.target.value))} className="w-full bg-background p-2 border border-border rounded-md">
                        <option value={3}>3 days</option>
                        <option value={4}>4 days</option>
                        <option value={5}>5 days</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">How long should each session be?</label>
                    <select value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full bg-background p-2 border border-border rounded-md">
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1 hour 30 minutes</option>
                        <option value={120}>2 hours</option>
                    </select>
                </div>
            </Section>
            
            <Section title="Your Equipment">
                <div className="grid grid-cols-2 gap-2">
                    {availableEquipment.map(item => (
                        <label key={item} className="flex items-center space-x-2 bg-background p-2 border border-border rounded-md cursor-pointer">
                            <input type="checkbox" checked={equipment.includes(item)} onChange={() => handleEquipmentChange(item)} className="form-checkbox h-5 w-5 text-primary bg-surface border-border rounded focus:ring-primary"/>
                            <span className="capitalize">{item}</span>
                        </label>
                    ))}
                </div>
            </Section>

            <Section title="Your Data">
                <label className={`flex items-center space-x-3 ${hasHistory ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                     <input
                        type="checkbox"
                        checked={useHistory}
                        onChange={e => setUseHistory(e.target.checked)}
                        disabled={!hasHistory}
                        className="form-checkbox h-5 w-5 text-primary bg-surface border-border rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                     />
                     <span className={`text-text-primary ${!hasHistory ? 'opacity-50' : ''}`}>
                        Use my workout history to tailor the plan
                        {!hasHistory && <span className="text-xs text-text-secondary italic ml-2">(No history available)</span>}
                     </span>
                </label>
            </Section>
            
            <Section title="Additional Instructions">
                <div>
                    <label htmlFor="additional-instructions" className="block text-sm font-medium text-text-secondary mb-1">
                        Additional instructions for the AI
                    </label>
                    <textarea
                        id="additional-instructions"
                        value={additionalInstructions}
                        onChange={(e) => setAdditionalInstructions(e.target.value)}
                        className="w-full bg-background p-2 border border-border rounded-md min-h-[100px] resize-y"
                        placeholder="e.g., 'I want to focus on my chest', 'Include bicep curls twice a week', 'I prefer not to do deadlifts', 'My lower back is sensitive', 'Style: high-intensity interval training'"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                        Provide any other details, preferences, or constraints for the AI. This is optional.
                    </p>
                </div>
            </Section>

            <div>
                <button onClick={handleGeneratePlan} disabled={isLoading || !name} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 px-4 rounded-lg text-xl transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating Plan...
                        </>
                    ) : 'Generate My Plan'}
                </button>
                {!name && <p className="text-yellow-400 mt-2 text-center text-sm">Please enter your name to generate a plan.</p>}
                {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
            </div>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-surface p-4 rounded-lg shadow-md border border-border">
    <h2 className="text-xl font-semibold mb-4">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

export default AiPlannerScreen;