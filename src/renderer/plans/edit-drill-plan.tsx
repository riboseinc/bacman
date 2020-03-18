import React from 'react';

import { app } from 'renderer';
import { BCPlan } from 'models';
import { NonIdealState, Spinner, H1 } from '@blueprintjs/core';

import styles from './styles.scss';


interface EditDrillPlanProps {
  planID: string
}
export const EditDrillPlan: React.FC<EditDrillPlanProps> = function ({ planID }) {
  const plan = app.useOne<BCPlan, string>('plan', planID);

  if (plan.isUpdating) {
    return <NonIdealState title={<Spinner />} />

  } else if (plan.object === null) {
    return <NonIdealState title="Failed to load BC plan" />

  } else {
    return (
      <div className={styles.editDrillPlanBase}>
        <H1>{plan.object.purpose}</H1>
      </div>
    );
  }
};