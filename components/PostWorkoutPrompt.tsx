import React from 'react';
import { CheckCircleIcon, DocumentTextIcon } from './icons';

interface PostWorkoutPromptProps {
    onClose: () => void;
    onExport: () => void;
}

const PostWorkoutPrompt: React.FC<PostWorkoutPromptProps> = ({ onClose, onExport }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-2xl p-6 w-full max-w-sm text-center border border-border">
                <div className="flex justify-center mb-4">
                    <CheckCircleIcon className="w-16 h-16 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Workout Complete!</h2>
                <p className="text-text-secondary mb-6">
                    Great job finishing your workout. Your progress has been logged.
                </p>
                <div className="flex flex-col space-y-3">
                    <button
                        onClick={onExport}
                        className="w-full bg-secondary hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                        <DocumentTextIcon className="w-5 h-5" />
                        <span>Export Latest Data</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostWorkoutPrompt;
