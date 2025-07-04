import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Screen, Workout, ExercisePerformed, Session, WorkoutProgram, UserSettings } from './types';
import { DEFAULT_APP_DATA } from './constants';
import LandingScreen from './components/LandingScreen';
import DashboardScreen from './components/DashboardScreen';
import ActiveWorkoutScreen from './components/ActiveWorkoutScreen';
import HistoryScreen from './components/HistoryScreen';
import SettingsScreen from './components/SettingsScreen';
import AiPlannerScreen from './components/AiPlannerScreen';
import PostWorkoutPrompt from './components/PostWorkoutPrompt';
import { ChartIcon, SettingsIcon, NotepadIcon, AiIcon, CheckCircleIcon } from './components/icons';

const App: React.FC = () => {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const [showPostWorkoutPrompt, setShowPostWorkoutPrompt] = useState(false);


  // --- Data Persistence Hook Logic ---
  useEffect(() => {
    try {
      const savedDataString = localStorage.getItem('workout_log.json');
      if (savedDataString) {
        const savedData = JSON.parse(savedDataString) as AppData;
        
        // Migration logic for user settings
        if (savedData.user_settings) {
            if (typeof savedData.user_settings.experience === 'undefined') {
              savedData.user_settings.experience = 'beginner';
              savedData.user_settings.sex = 'male';
              savedData.user_settings.session_duration_minutes = 60;
              savedData.user_settings.bodyweight_kg = 80;
            }
            if (typeof savedData.user_settings.name === 'undefined') {
                savedData.user_settings.name = 'Lifter';
            }
            if (typeof savedData.user_settings.country === 'undefined') {
                savedData.user_settings.country = '';
            }
        } else {
            savedData.user_settings = DEFAULT_APP_DATA.user_settings;
        }
        
        // Migration for workout program frequency
        if (savedData.workout_programs) {
            savedData.workout_programs.forEach(p => {
                if (p.schedule && typeof p.frequency === 'undefined') {
                    p.frequency = p.schedule.length;
                }
            });
        }
        setAppData(savedData);
      } else {
        setAppData(DEFAULT_APP_DATA);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      setAppData(DEFAULT_APP_DATA);
    }
  }, []);

  useEffect(() => {
    if (appData) {
      try {
        localStorage.setItem('workout_log.json', JSON.stringify(appData, null, 2));
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [appData]);

  // Effect to reset scroll on screen change
  useEffect(() => {
    mainContentRef.current?.scrollTo(0, 0);
  }, [currentScreen]);

  const handleSetAppData = useCallback((data: AppData) => {
    setAppData(data);
  }, []);

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const data = JSON.parse(text);
          // Basic validation could be added here
          setAppData(data);
          alert('Data imported successfully!');
          setCurrentScreen('landing');
        }
      } catch (error) {
        console.error("Failed to parse imported file", error);
        alert('Failed to import data. The file might be corrupted.');
      }
    };
    reader.readAsText(file);
  }, []);

  const triggerFileImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleExport = useCallback(() => {
    if (!appData) return;
    const dataStr = JSON.stringify(appData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'workout_log.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [appData]);

  // --- Screen Navigation & Workout Flow ---
  const handleStartWorkout = (workout: Workout) => {
    setActiveWorkout(workout);
    setCurrentScreen('workout');
  };

  const handleFinishWorkout = (performedExercises: ExercisePerformed[]) => {
    if (!appData || !activeWorkout) return;

    const newSession: Session = {
      session_id: `session_${new Date().toISOString()}`,
      date: new Date().toISOString(),
      workout_id: activeWorkout.id,
      exercises_performed: performedExercises,
    };

    setAppData({
      ...appData,
      session_history: [...appData.session_history, newSession],
    });

    setShowPostWorkoutPrompt(true);
  };
  
  const handleClosePostWorkoutPrompt = () => {
    setShowPostWorkoutPrompt(false);
    setActiveWorkout(null);
    setCurrentScreen('landing');
  };

  const handleFinishPlanning = (newProgram: WorkoutProgram, settings: UserSettings) => {
    if (!appData) return;
    setAppData({ 
      ...appData, 
      user_settings: settings,
      workout_programs: [newProgram] 
    });
    alert('New workout plan generated successfully!');
    setCurrentScreen('landing');
  };
  
  const renderScreen = () => {
    if (!appData) {
        return <div className="flex items-center justify-center h-full"><p>Loading data...</p></div>;
    }
    
    switch (currentScreen) {
      case 'landing':
        return <LandingScreen appData={appData} onNavigate={setCurrentScreen} onTriggerImport={triggerFileImport} onExport={handleExport} />;
      case 'dashboard':
        return <DashboardScreen appData={appData} onStartWorkout={handleStartWorkout} />;
      case 'workout':
        if (activeWorkout) {
          return <ActiveWorkoutScreen workout={activeWorkout} appData={appData} onFinishWorkout={handleFinishWorkout} />;
        }
        // Fallback if workout screen is active but no workout is set
        setCurrentScreen('landing');
        return null;
      case 'history':
        return <HistoryScreen appData={appData} />;
      case 'settings':
        return <SettingsScreen appData={appData} setAppData={handleSetAppData} onTriggerImport={triggerFileImport} onExport={handleExport} />;
      case 'aiPlanner':
        return <AiPlannerScreen appData={appData} onFinishPlanning={handleFinishPlanning} />;
      default:
        setCurrentScreen('landing');
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans bg-background">
      <header className="bg-surface border-b border-border shadow-sm sticky top-0 z-10 py-2">
          <h1 className="text-center font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary text-2xl">
              Jimmy
          </h1>
      </header>

      <main ref={mainContentRef} className="flex-1 overflow-y-auto pb-20">
        {renderScreen()}
      </main>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".json"
        onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
                handleImport(file);
                if(e.target) e.target.value = ''; // Reset to allow same file import again
            }
        }}
      />
      
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex justify-around">
        <NavButton icon={<NotepadIcon className="w-6 h-6"/>} label="Home" isActive={currentScreen === 'landing' || currentScreen === 'dashboard' || currentScreen === 'workout'} onClick={() => setCurrentScreen('landing')} />
        <NavButton icon={<AiIcon className="w-6 h-6"/>} label="AI Planner" isActive={currentScreen === 'aiPlanner'} onClick={() => setCurrentScreen('aiPlanner')} />
        {appData && appData.session_history.length > 0 && (
          <NavButton icon={<ChartIcon className="w-6 h-6"/>} label="History" isActive={currentScreen === 'history'} onClick={() => setCurrentScreen('history')} />
        )}
        <NavButton icon={<SettingsIcon className="w-6 h-6"/>} label="Settings" isActive={currentScreen === 'settings'} onClick={() => setCurrentScreen('settings')} />
      </nav>

      {showPostWorkoutPrompt && (
        <PostWorkoutPrompt 
            onClose={handleClosePostWorkoutPrompt}
            onExport={handleExport}
        />
      )}
    </div>
  );
};

const NavButton: React.FC<{icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void}> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center p-2 text-sm transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
        {icon}
        <span className="mt-1">{label}</span>
    </button>
);

export default App;