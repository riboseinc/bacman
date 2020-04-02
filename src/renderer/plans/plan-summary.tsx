import React, { useEffect, useState } from 'react';
import { H2, EditableText, Text, Classes } from '@blueprintjs/core';
import { PlanRevision, Plan } from 'models';
import styles from './plan-details.scss';


interface PlanSummaryProps {
  plan: Plan
  revision: PlanRevision
  onPlanUpdate: (plan: Plan) => void
  onRevisionUpdate?: (revision: PlanRevision) => void
  collapsed: boolean 
}
export const PlanSummary: React.FC<PlanSummaryProps> =
function ({ plan, revision, onPlanUpdate, onRevisionUpdate, collapsed }) {
  const [name, setName] = useState<string>(plan.name);
  const [purpose, setPurpose] = useState<string | undefined>(plan.purpose);
  const [scope, setScope] = useState<string | undefined>(revision.scope);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    setName(plan.name);
    setPurpose(plan.purpose);
    setScope(revision.scope);
  }, [plan.id, JSON.stringify(revision)]);

  return (
    <div className={`${styles.planSummary} ${collapsed ? styles.sheetCollapsed : ''}`}>
      <H2 className={styles.planName}>
        <EditableText
            multiline
            maxLines={2}
            disabled={collapsed}
            confirmOnEnterKey
            selectAllOnFocus
            value={name}
            onChange={setName}
            onConfirm={(val) => onPlanUpdate({ ...plan, name: val.trim() })}
          />
      </H2>

      <Text className={styles.planID} ellipsize>
        {plan.id}
      </Text>

      {!collapsed
        ? <>
            <div title="Plan purpose" className={`${Classes.RUNNING_TEXT} ${styles.planPurpose}`}>
              <EditableText
                multiline
                minLines={2}
                selectAllOnFocus
                value={purpose}
                placeholder="Enter plan purpose…"
                onChange={setPurpose}
                onConfirm={(val) => onPlanUpdate({ ...plan, purpose: (val || '').trim() })}
              />
            </div>
            <div title="Plan scope" className={`${Classes.RUNNING_TEXT} ${styles.planScope}`}>
              <EditableText
                multiline
                minLines={2}
                selectAllOnFocus
                value={scope}
                placeholder="Enter plan scope…"
                onChange={setScope}
                disabled={!onRevisionUpdate}
                onConfirm={(val) => onRevisionUpdate
                  ? onRevisionUpdate({ ...revision, scope: (val || '').trim() })
                  : undefined}
              />
            </div>
          </>
        : null}
    </div>
  );
};
