//import moment from 'moment';
import React from 'react';
//import { app } from 'renderer';
//import { BCPlan } from 'models';


interface DrillHistoryProps {
  planID: string
}
export const DrillHistory: React.FC<DrillHistoryProps> = function ({ planID }) {
  //const bcPlan = app.useOne<BCPlan, string>('plan', planID);

  return (
    <p>Drill history here…</p>
  );
};