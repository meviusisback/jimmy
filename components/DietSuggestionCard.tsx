
import React, { useMemo } from 'react';
import { AiIcon, CheckCircleIcon } from './icons';

interface DietSuggestionCardProps {
    suggestion: string;
}

interface ParsedSuggestion {
    title: string;
    items: string[];
    reasoning: string;
}

const DietSuggestionCard: React.FC<DietSuggestionCardProps> = ({ suggestion }) => {
    const parsedSuggestion = useMemo<ParsedSuggestion | null>(() => {
        if (!suggestion) return null;

        const lines = suggestion.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length < 2) { // Allow for responses with no items or no reasoning
             return { title: 'Diet Tip', items: [], reasoning: suggestion };
        }
        
        const title = lines[0];
        let reasoning = '';
        let items: string[] = [];

        // Check if the last line is a reasoning or an item. Reasoning usually doesn't start with "-".
        const lastLineIsItem = lines[lines.length - 1].startsWith('-');
        
        if (!lastLineIsItem && lines.length > 1) {
            reasoning = lines[lines.length - 1];
            items = lines.slice(1, -1).map(line => line.replace(/^- /, '').trim()).filter(Boolean);
        } else {
            items = lines.slice(1).map(line => line.replace(/^- /, '').trim()).filter(Boolean);
        }

        return { title, items, reasoning };
    }, [suggestion]);

    if (!parsedSuggestion) {
        return null;
    }

    const { title, items, reasoning } = parsedSuggestion;

    return (
        <div className="text-sm p-3 bg-background rounded-md space-y-3">
            <h3 className="font-bold text-text-primary text-base">{title}</h3>
            
            {items.length > 0 && (
                <ul className="space-y-2">
                    {items.map((item, index) => (
                        <li key={index} className="flex items-start">
                            <CheckCircleIcon className="w-4 h-4 text-success mr-2.5 flex-shrink-0 mt-0.5" />
                            <span className="text-text-secondary">{item}</span>
                        </li>
                    ))}
                </ul>
            )}
            
            {reasoning && (
                 <div className="flex items-start text-xs pt-2 border-t border-border/50">
                     <AiIcon className="w-3.5 h-3.5 text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                     <p className="text-indigo-300 italic">
                        {reasoning}
                    </p>
                 </div>
            )}
        </div>
    );
};

export default DietSuggestionCard;
