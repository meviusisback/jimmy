import React, { useState } from 'react';
import { AppData, Plate, UserSettings, ExperienceLevel, Sex } from '../types';
import { PlusIcon, TrashIcon } from './icons';

interface SettingsScreenProps {
  appData: AppData;
  setAppData: (data: AppData) => void;
  onTriggerImport: () => void;
  onExport: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ appData, setAppData, onTriggerImport, onExport }) => {
  const [localSettings, setLocalSettings] = useState(appData.user_settings);
  const [localPrograms, setLocalPrograms] = useState(appData.workout_programs);

  const handleSettingsChange = (field: keyof UserSettings, value: any) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    setAppData({ ...appData, user_settings: newSettings });
  };
  
  const handlePlateChange = (index: number, field: keyof Plate, value: number) => {
    const newPlates = [...localSettings.available_plates];
    newPlates[index] = { ...newPlates[index], [field]: value };
    handleSettingsChange('available_plates', newPlates);
  };

  const addPlate = () => {
    const newPlates = [...localSettings.available_plates, { weight: 0.25, quantity: 2 }];
    handleSettingsChange('available_plates', newPlates);
  };
  
  const removePlate = (index: number) => {
    const newPlates = localSettings.available_plates.filter((_, i) => i !== index);
    handleSettingsChange('available_plates', newPlates);
  };
  
  // Handlers for workout program changes would be complex. For this implementation, we will keep it simple.
  // A full implementation would involve deep nested state updates.

  return (
    <div className="p-4 md:p-6 space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Section title="User Profile">
        <Input label="Name" type="text" value={localSettings.name || ''} onChange={(e) => handleSettingsChange('name', e.target.value)} />
        <Input label="Bodyweight (kg)" type="number" value={localSettings.bodyweight_kg} onChange={(e) => handleSettingsChange('bodyweight_kg', parseFloat(e.target.value))} />
        <Input label="Country" type="text" value={localSettings.country || ''} onChange={(e) => handleSettingsChange('country', e.target.value)} placeholder="e.g. United States" />
        
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Sex</label>
          <select value={localSettings.sex} onChange={(e) => handleSettingsChange('sex', e.target.value as Sex)} className="w-full bg-background p-2 border border-border rounded-md">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Experience Level</label>
          <select value={localSettings.experience} onChange={(e) => handleSettingsChange('experience', e.target.value as ExperienceLevel)} className="w-full bg-background p-2 border border-border rounded-md">
            <option value="complete_beginner">Complete Beginner (Never lifted)</option>
            <option value="beginner">Beginner (Lifting for &lt;1 year)</option>
            <option value="intermediate">Intermediate (Lifting for 1-3 years)</option>
            <option value="expert">Expert (Lifting for 3+ years)</option>
          </select>
        </div>
      </Section>
      
      <Section title="User Equipment">
        <Input label="Barbell Weight (kg)" type="number" value={localSettings.barbell_weight} onChange={(e) => handleSettingsChange('barbell_weight', parseFloat(e.target.value))} />
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Available Plates</h3>
          <div className="space-y-2">
            {localSettings.available_plates.map((plate, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="number" value={plate.weight} onChange={(e) => handlePlateChange(index, 'weight', parseFloat(e.target.value))} className="w-1/2 bg-background p-2 border border-border rounded-md" placeholder="Weight (kg)"/>
                <input type="number" value={plate.quantity} onChange={(e) => handlePlateChange(index, 'quantity', parseInt(e.target.value))} className="w-1/2 bg-background p-2 border border-border rounded-md" placeholder="Quantity"/>
                <button onClick={() => removePlate(index)} className="p-2 text-red-500 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
              </div>
            ))}
          </div>
          <button onClick={addPlate} className="mt-2 flex items-center space-x-2 text-primary hover:text-primary-hover">
            <PlusIcon className="w-5 h-5"/><span>Add Plate</span>
          </button>
        </div>
      </Section>
      
      <Section title="App Preferences">
        <Input label="Rest Timer (seconds)" type="number" value={localSettings.rest_timer_seconds} onChange={(e) => handleSettingsChange('rest_timer_seconds', parseInt(e.target.value, 10))} />
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Default Session Duration</label>
          <select value={localSettings.session_duration_minutes} onChange={(e) => handleSettingsChange('session_duration_minutes', parseInt(e.target.value, 10))} className="w-full bg-background p-2 border border-border rounded-md">
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1 hour 30 minutes</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
      </Section>

      <Section title="Data Management">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <button onClick={onExport} className="flex-1 bg-secondary hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition-colors">Export Data</button>
            <button onClick={onTriggerImport} className="flex-1 bg-secondary hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition-colors">Import Data</button>
        </div>
      </Section>

      <Section title="Workout Program">
        {localPrograms.length > 0 ? (
          <p className="text-text-secondary mb-4">The current workout program is displayed below. To generate a new one, use the AI Planner tab.</p>
        ) : (
          <p className="text-text-secondary mb-4">There is no workout program loaded in the app. To generate a new one, use the AI Planner tab.</p>
        )}
        {localPrograms.map((program, pIndex) => (
          <div key={pIndex} className="mt-4">
            <h4 className="text-lg font-bold">{program.program_name}</h4>
            {program.ai_description && (
                <div className="mt-2 mb-4 p-3 bg-background rounded-md border border-indigo-500/30">
                    <p className="text-sm italic text-indigo-300">
                        <span className="font-bold not-italic text-indigo-200">AI Rationale:</span> {program.ai_description}
                    </p>
                </div>
            )}
            <div className="space-y-2 mt-2">
              {program.workouts.map((workout, wIndex) => (
                <div key={wIndex} className="p-3 bg-background rounded-md border border-border">
                  <p className="font-semibold">{workout.name} ({workout.id})</p>
                  <ul className="list-disc list-inside pl-4 text-sm text-text-secondary">
                    {workout.exercises.map((ex, eIndex) => (
                      <li key={eIndex}>{ex.name}: {ex.sets}x{ex.reps}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-surface p-4 rounded-lg shadow-md border border-border">
    <h2 className="text-xl font-semibold mb-4">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const Input: React.FC<{ label: string; type: string; value: any; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; }> = ({ label, type, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-background p-2 border border-border rounded-md"
    />
  </div>
);


export default SettingsScreen;