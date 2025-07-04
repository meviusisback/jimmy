
import React from 'react';
import { Exercise } from '../types';
import { DumbbellIcon, CheckCircleIcon } from './icons';

const ExerciseTooltipContent: React.FC<{ exercise: Exercise }> = ({ exercise }) => {
    const hasContent = exercise.description || (exercise.equipment && exercise.equipment.length > 0) || exercise.recommendations;

    if (!hasContent) {
        return null;
    }
    
    // Split recommendations into individual lines, removing any empty ones
    const recommendationsList = exercise.recommendations
        ? exercise.recommendations.split('\n').filter(r => r.trim() !== '')
        : [];

    return (
        <div className="w-64 p-3 bg-surface border border-border rounded-lg shadow-xl text-sm text-text-secondary">
            {exercise.description && (
                <p className="mb-3 text-text-primary italic">{exercise.description}</p>
            )}
            
            {recommendationsList.length > 0 && (
                <div className="mb-3">
                    <h4 className="font-bold text-text-primary mb-1 flex items-center">
                        <CheckCircleIcon className="w-4 h-4 mr-1.5 text-success" />
                        <span>Key Tips</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs pl-1">
                        {recommendationsList.map((rec, index) => (
                            <li key={index} className="text-text-secondary">{rec.replace(/^- /, '')}</li>
                        ))}
                    </ul>
                </div>
            )}

            {exercise.equipment && exercise.equipment.length > 0 && (
                <div>
                    <h4 className="font-bold text-text-primary mb-1 flex items-center">
                        <DumbbellIcon className="w-4 h-4 mr-1.5" />
                        <span>Equipment</span>
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {exercise.equipment.map(eq => (
                            <span key={eq} className="bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
                                {eq}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExerciseTooltipContent;
