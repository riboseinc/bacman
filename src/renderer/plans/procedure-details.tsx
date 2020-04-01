import React, { useState, useEffect } from 'react';
import { PlannedProcedure, ProcedureStep } from 'models';
import { H3, EditableText, UL } from '@blueprintjs/core';
import styles from './plan-details.scss';


interface ProcedureDetailsProps {
  collapsed: boolean
  procedure: PlannedProcedure 
  onUpdate?: (proc: PlannedProcedure) => void
}
export const ProcedureDetails: React.FC<ProcedureDetailsProps> =
function ({ collapsed, procedure, onUpdate }) {

  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const [name, setName] = useState<string>('');

  useEffect(() => {
    onUpdate
      ? setSteps([ ...procedure.steps, { action: '' } ])
      : setSteps(procedure.steps);
  }, [JSON.stringify(procedure.steps), onUpdate]);

  useEffect(() => {
    setName(procedure.name);
  }, [procedure.name]);

  function handleStepDeletion(idx: number) {
    var steps = procedure.steps;
    steps.splice(idx, 1);
    onUpdate ? onUpdate({ ...procedure, steps }) : void 0;
  }

  function handleStepEdit(idx: number, newStep: ProcedureStep) {
    if (newStep.action.trim() === '') {
      handleStepDeletion(idx);
    } else {
      var steps = procedure.steps;
      steps[idx] = newStep;
      onUpdate ? onUpdate({ ...procedure, steps }) : void 0;
    }
  }

  return (
    <div className={styles.procedureDetails}>
      <H3>
        <EditableText
          selectAllOnFocus
          value={name}
          disabled={!onUpdate}
          onChange={setName}
          onConfirm={(val) => onUpdate
            ? onUpdate({ ...procedure, name: val.trim() })
            : void 0 } />
      </H3>
      
      {!collapsed
        ? <UL className={styles.procedureStepList}>
            {[...steps.entries()].map(([idx, item]) =>
              <li key={idx}>
                <EditableText
                  multiline confirmOnEnterKey selectAllOnFocus
                  placeholder="Describe action…"
                  disabled={!onUpdate}
                  value={item.action || ''}
                  onChange={(val) => {
                    setSteps(steps => {
                      const newSteps = [...steps];
                      newSteps[idx].action = val;
                      return newSteps;
                    });
                  }}
                  onConfirm={(val) => {
                    handleStepEdit(idx, { action: val.trim() });
                  }} />
              </li>
            )}
          </UL>
        : null}
    </div>
  );
};
