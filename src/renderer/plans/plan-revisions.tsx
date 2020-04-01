import moment from 'moment';
import React from 'react';
import { PlanRevision } from 'models';
import { Button, Tree, ITreeNode, IconName, Tag } from '@blueprintjs/core';
import styles from './plan-details.scss';


interface PlanRevisionsProps {
  revisions: PlanRevision[]
  selectedIdx: number
  onSelect: (revisionIdx: number) => void
  onCreate: () => void
}
export const PlanRevisions: React.FC<PlanRevisionsProps> =
function ({ revisions, onSelect, onCreate, selectedIdx }) {
  const nodes: ITreeNode[] = [...revisions.entries()].map(([idx, r]) => ({
    id: `${idx}`,
    label: (idx > 0) ? <>Revision {revisions.length - idx}</> : <>Working revision</>,
    isSelected: idx === selectedIdx,
    icon: (idx > 0 ? 'history' : false) as false | IconName,
    secondaryLabel: <div className={styles.revisionLabel}>
      {moment(r.timeCreated).toISOString()}
    </div>,
  }))
  function handleNodeClick(node: ITreeNode) {
    onSelect(parseInt(`${node.id}`, 10));
  }
  return (
    <div className={styles.planRevisions}>
      <Button onClick={onCreate} icon="add">Start new revision</Button>
      <Tree contents={nodes} onNodeClick={handleNodeClick} />
    </div>
  );
};
