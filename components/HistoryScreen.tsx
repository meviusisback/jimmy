import React, { useState, useMemo } from 'react';
import { AppData } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HistoryScreenProps {
  appData: AppData;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ appData }) => {
  const [selectedExercise, setSelectedExercise] = useState<string>('overall');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const allExercises = useMemo(() => {
    const exerciseSet = new Set<string>();
    appData.workout_programs.forEach(program =>
      program.workouts.forEach(workout =>
        workout.exercises.forEach(ex => exerciseSet.add(ex.name))
      )
    );
    return Array.from(exerciseSet).sort();
  }, [appData.workout_programs]);
  
  const hasAnyWeightedHistory = useMemo(() => {
    return appData.session_history.some(session =>
      session.exercises_performed.some(ex =>
        ex.sets_completed.some(set => set.weight > 0)
      )
    );
  }, [appData.session_history]);

  const isSelectedExerciseBodyweight = useMemo(() => {
    if (selectedExercise === 'overall' || !appData.workout_programs[0]) return false;
    const exerciseDef = appData.workout_programs[0].workouts
      .flatMap(w => w.exercises)
      .find(ex => ex.name === selectedExercise);
    return !!exerciseDef?.isBodyweight;
  }, [selectedExercise, appData.workout_programs]);

  const chartData = useMemo(() => {
    if (selectedExercise === 'overall') {
      return appData.session_history
        .map(session => {
          if (session.exercises_performed.length === 0) return null;

          if (hasAnyWeightedHistory) {
            let totalWeight = 0;
            let weightedSetCount = 0;
            session.exercises_performed.forEach(ex => {
              ex.sets_completed.forEach(set => {
                if (set.weight > 0) {
                  totalWeight += set.weight;
                  weightedSetCount++;
                }
              });
            });
            const avgWeight = weightedSetCount > 0 ? totalWeight / weightedSetCount : 0;
            return {
              date: new Date(session.date).toLocaleDateString(),
              weight: parseFloat(avgWeight.toFixed(2)),
            };
          } else { // Only bodyweight exercises
            const totalReps = session.exercises_performed.reduce((sum, ex) =>
              sum + ex.sets_completed.reduce((setSum, set) => setSum + set.reps, 0), 0);
            return {
              date: new Date(session.date).toLocaleDateString(),
              reps: totalReps
            };
          }
        })
        .filter((item): item is { date: string; weight: number } | { date: string; reps: number } => item !== null && (('weight' in item && !isNaN(item.weight)) || ('reps' in item && !isNaN(item.reps))))
        .reverse();
    }
    
    // Logic for individual exercises
    return appData.session_history
      .map(session => {
        const exerciseData = session.exercises_performed.find(e => e.name === selectedExercise);
        if (!exerciseData || exerciseData.sets_completed.length === 0) return null;
        
        if (isSelectedExerciseBodyweight) {
          const totalReps = exerciseData.sets_completed.reduce((sum, set) => sum + set.reps, 0);
          return {
            date: new Date(session.date).toLocaleDateString(),
            reps: totalReps
          };
        } else {
          const avgWeight = exerciseData.sets_completed.reduce((sum, set) => sum + set.weight, 0) / exerciseData.sets_completed.length;
          return {
            date: new Date(session.date).toLocaleDateString(),
            weight: parseFloat(avgWeight.toFixed(2))
          };
        }
      })
      .filter((item): item is { date: string; weight: number } | { date: string; reps: number } => item !== null)
      .reverse(); // Show oldest first
  }, [selectedExercise, appData.session_history, isSelectedExerciseBodyweight, hasAnyWeightedHistory]);

  const { yAxisKey, yAxisLabel, chartTitle } = useMemo(() => {
    if (selectedExercise === 'overall') {
      if (hasAnyWeightedHistory) {
        return {
          yAxisKey: 'weight',
          yAxisLabel: 'Avg Session Weight (kg)',
          chartTitle: 'Overall Progress (Average Weight)'
        };
      } else {
        return {
          yAxisKey: 'reps',
          yAxisLabel: 'Total Session Reps',
          chartTitle: 'Overall Progress (Total Reps)'
        };
      }
    }
    
    if (isSelectedExerciseBodyweight) {
      return {
        yAxisKey: 'reps',
        yAxisLabel: 'Total Reps',
        chartTitle: `${selectedExercise} Progression`
      };
    } else {
      return {
        yAxisKey: 'weight',
        yAxisLabel: 'Avg Weight (kg)',
        chartTitle: `${selectedExercise} Progression`
      };
    }
  }, [selectedExercise, hasAnyWeightedHistory, isSelectedExerciseBodyweight]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">History & Progress</h1>
      
      <div className="bg-surface p-4 rounded-lg shadow-md mb-8 border border-border">
        <h2 className="text-xl font-semibold mb-4">{chartTitle}</h2>
        <select
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="w-full p-2 bg-background border border-border rounded-md mb-4"
        >
          <option value="overall">Overall Progress</option>
          {allExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
        </select>
        
        <div style={{ width: '100%', height: 300 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" domain={['auto', 'auto']}/>
                <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #374151' }} />
                <Legend />
                <Line type="monotone" dataKey={yAxisKey} name={yAxisLabel} stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }}/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-background/50 rounded-md">
                <p className="text-text-secondary">No history for this exercise yet.</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Workout Log</h2>
        <div className="space-y-3">
          {appData.session_history.slice().reverse().map(session => {
            const workout = appData.workout_programs[0]?.workouts.find(w => w.id === session.workout_id);
            return (
              <div key={session.session_id} className="bg-surface rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedSessionId(expandedSessionId === session.session_id ? null : session.session_id)}
                  className="w-full text-left p-4 flex justify-between items-center hover:bg-border/20 transition-colors"
                >
                  <div>
                    <p className="font-bold">{workout?.name || 'Workout'}</p>
                    <p className="text-sm text-text-secondary">{new Date(session.date).toLocaleString()}</p>
                  </div>
                  <span className={`transform transition-transform ${expandedSessionId === session.session_id ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {expandedSessionId === session.session_id && (
                  <div className="p-4 border-t border-border bg-background/50">
                    <ul className="space-y-2">
                    {session.exercises_performed.map(ex => (
                      <li key={ex.name}>
                        <p className="font-semibold">{ex.name}</p>
                        <ul className="list-disc list-inside pl-4 text-sm text-text-secondary">
                          {ex.sets_completed.map((set, i) => (
                            <li key={i}>{set.reps} reps @ {set.weight > 0 ? `${set.weight} kg` : 'Bodyweight'}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HistoryScreen;