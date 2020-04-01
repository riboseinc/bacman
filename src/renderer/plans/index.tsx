import React, { useState, useEffect, useMemo } from 'react';

import slugify from 'slugify';

import {
  Tree, ITreeNode, Button,
  Divider,
  NonIdealState,
} from '@blueprintjs/core';

import { WindowComponentProps } from 'coulomb/config/renderer';
import { callIPC } from 'coulomb/ipc/renderer';
import { DatabaseList } from 'coulomb/db/renderer/status';

import { conf as appConf } from 'app';
import { Plan, makeBlankPlanRevision } from 'models';
import { conf as rendererConf } from 'renderer';
import { app } from 'renderer';

import { PlanDetails } from './plan-details';
import { buildPlanNodes } from './plan-list';
import { NEW_ID_PLACEHOLDER } from './utils';
import styles from './styles.scss';


interface RetireableQuery {
  showRetired: boolean
}


const Window: React.FC<WindowComponentProps> = function () {
  const [showRetired, setShowRetired] = useState(false);

  const plans = app.useMany<Plan, { query: RetireableQuery }>
    ('plan', { query: { showRetired }});

  const [selectedNode, selectNode] = useState<number[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);
  // BP3 TreeNode path

  const [nodes, updateNodes] = useState<ITreeNode[]>([]);

  const [selectedPlanID, selectPlanID] = useState<string | null>(null);

  const planNames = JSON.stringify(Object.values(plans.objects).map(p => p.name)); 

  useEffect(() => {
    updateNodes([{
      id: 'plans',
      label: "Plans",
      icon: "folder-open",
      isExpanded: true,
      childNodes: buildPlanNodes(
        plans.objects,
        selectedNode,
        editMode,
        () => setEditMode(false),
        handlePlanUpdate),
    }]);
  }, [
    planNames,
    JSON.stringify(selectedNode),
    editMode,
  ]);

  useEffect(() => {
    selectNode([]);
  }, [
    planNames,
  ]);

  useEffect(() => {
    setEditMode(false);
  }, [JSON.stringify(selectedNode)]);

  const DBs = useMemo(() => (
    <DatabaseList
      databases={appConf.databases}
      databaseStatusComponents={rendererConf.databaseStatusComponents} />
  ), Object.keys(appConf.databases));

  const plan = Object.values(plans.objects).find(p => p.id === selectedPlanID);

  async function handlePlanRevision(plan: Plan, fromRevisionIdx: number) {
    const currentRevision = plan.revisions[fromRevisionIdx];

    if (currentRevision === undefined) {
      throw new Error(`Cannot create new revision from non-existent revision: ${fromRevisionIdx}`)
    }

    const newRevision = { ...currentRevision, timeCreated: new Date() };
    plan.revisions = [ newRevision, ...(plan.revisions || []) ];
    return await handlePlanUpdate(plan);
  }

  async function handlePlanUpdate(plan: Plan) {
    if (plan.id === NEW_ID_PLACEHOLDER) {
      if (plan.name.trim() === '') {
        return;
      }

      selectNode([]);

      const newPlan = {
        ...plan,
        id: slugify(plan.name, { strict: true, lower: true }),
      };
      await callIPC<{ object: Plan, commit: boolean }, { success: true }>
      ('model-plan-create-one', {
        object: { ...newPlan, revisions: [makeBlankPlanRevision()] },
        commit: true,
      });

    } else {
      await callIPC<{ objectID: string, object: Plan, commit: boolean }, { success: true }>
      ('model-plan-update-one', {
        objectID: plan.id,
        object: plan,
        commit: true,
      });
    }
  }

  async function handleNodeClick(node: ITreeNode, nodePath: number[]) {
    if (JSON.stringify(selectedNode) === JSON.stringify(nodePath)) {
      setEditMode(true);
    } else if (node.id === NEW_ID_PLACEHOLDER) {
      selectPlanID(null);
      selectNode(nodePath);
      setImmediate(() => setEditMode(true));
    } else {
      const nodeData = node.nodeData as { bcPlanID?: string, activityID: string } | undefined;
      if (nodeData?.bcPlanID) {
        selectPlanID(nodeData.bcPlanID);
      } else {
        selectPlanID(null);
      }
      selectNode(nodePath);
    }
  }

  return (
    <div className={styles.base}>

      <div className={styles.sidebar}>
        <div className={styles.objects}>
          <Tree
            className={styles.objectTree}
            onNodeClick={handleNodeClick}
            contents={nodes} />

          <div className={styles.listActions}>
            <Button
                minimal
                small
                icon="history"
                alignText="left"
                fill
                onClick={() => setShowRetired(!showRetired)}
                active={showRetired === true}>
              Show retired
            </Button>
          </div>
        </div>

        <Divider />

        <div className={styles.source}>
          {DBs}
        </div>
      </div>

      {plan
        ? <PlanDetails
            plan={plan}
            onUpdate={handlePlanUpdate}
            onNewRevision={handlePlanRevision}
          />
        : <NonIdealState title="No plan selected" />}

    </div>
  );
};


export default Window;