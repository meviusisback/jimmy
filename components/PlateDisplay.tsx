
import React from 'react';
import { calculatePlates } from '../services/workoutLogic';
import { UserSettings } from '../types';

interface PlateDisplayProps {
  targetWeight: number;
  settings: UserSettings;
}

const PlateDisplay: React.FC<PlateDisplayProps> = ({ targetWeight, settings }) => {
  const plates = calculatePlates(targetWeight, settings);

  if (targetWeight <= settings.barbell_weight) {
    return <p className="text-sm text-text-secondary">Just the bar ({settings.barbell_weight}kg)</p>;
  }

  return (
    <div className="text-sm text-text-secondary">
      <h4 className="font-bold">Plates per side:</h4>
      {plates.length > 0 ? (
        <ul className="list-disc list-inside">
          {plates.map(({ weight, count }) => (
            <li key={weight}>
              {count} x {weight} kg
            </li>
          ))}
        </ul>
      ) : (
        <p>None</p>
      )}
    </div>
  );
};

export default PlateDisplay;