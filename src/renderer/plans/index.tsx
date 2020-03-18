import React, { useState, useEffect, useMemo } from 'react';

import slugify from 'slugify';

import { Menu, Tree, ITreeNode, EditableText, Text, Button, Popover } from '@blueprintjs/core';
import { WindowComponentProps } from 'coulomb/config/renderer';
import { callIPC } from 'coulomb/ipc/renderer';
import { DatabaseList } from 'coulomb/db/renderer/status';

import { conf as appConf } from 'app';
import { BCActivity, BCPlan } from 'models';
import { conf as rendererConf } from 'renderer';
import { app } from 'renderer';
import styles from './styles.scss';


interface RetireableQuery {
  showRetired: boolean
}


const NEW_ID_PLACEHOLDER = '__new';
const NEW_TEXT_PLACEHOLDER = "Add…";


const Window: React.FC<WindowComponentProps> = function () {
  const [showRetired, setShowRetired] = useState(false);

  const activities = app.useMany<BCActivity, { query: RetireableQuery }>
    ('activity', { query: { showRetired }});

  const plans = app.useMany<BCPlan, { query: RetireableQuery }>
    ('plan', { query: { showRetired }});

  const [selectedNode, selectNode] = useState<number[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);
  // BP3 TreeNode path

  const [nodes, updateNodes] = useState<ITreeNode[]>([]);

  useEffect(() => {
    updateNodes(buildAcitvityNodes(
      activities.objects,
      plans.objects,
      selectedNode,
      editMode,
      handleActivityUpdate,
      handlePlanUpdate,
      handleShowDrillPlan,
      handleDrillStart));
  }, [
    JSON.stringify(activities.objects),
    JSON.stringify(plans.objects),
    JSON.stringify(selectedNode),
    editMode,
  ]);

  useEffect(() => {
    setEditMode(false);
  }, [JSON.stringify(selectedNode)]);


  async function handleActivityUpdate(activity: BCActivity) {
    if (activity.id === NEW_ID_PLACEHOLDER) {
      if (activity.description === NEW_TEXT_PLACEHOLDER) {
        return;
      }

      const newActivity = {
        ...activity,
        id: slugify(activity.description, { lower: true, strict: true }),
      };
      await callIPC<{ object: BCActivity, commit: boolean }, { success: true }>
      ('model-activity-create-one', {
        object: newActivity,
        commit: true,
      });
      selectNode([]);

    } else {
      await callIPC<{ objectID: string, object: BCActivity, commit: boolean }, { success: true }>
      ('model-activity-update-one', {
        objectID: activity.id,
        object: activity,
        commit: true,
      });
    }
  }

  async function handlePlanUpdate(plan: BCPlan) {
    if (plan.id === NEW_ID_PLACEHOLDER) {
      if (plan.purpose === NEW_TEXT_PLACEHOLDER) {
        return;
      }

      const newPlan = {
        ...plan,
        id: slugify(plan.purpose, { strict: true, lower: true }),
      };
      await callIPC<{ object: BCPlan, commit: boolean }, { success: true }>
      ('model-plan-create-one', {
        object: newPlan,
        commit: true,
      });
      selectNode([]);

    } else {
      await callIPC<{ objectID: string, object: BCPlan, commit: boolean }, { success: true }>
      ('model-plan-update-one', {
        objectID: plan.id,
        object: plan,
        commit: true,
      });
    }
  }

  async function handleDrillStart(activityID: string, planID: string) {
  }

  async function handleShowDrillPlan(activityID: string, planID: string) {
  }

  async function handleNodeClick(node: ITreeNode, nodePath: number[]) {
    if (JSON.stringify(selectedNode) === JSON.stringify(nodePath)) {
      setEditMode(true);
    } else {
      selectNode(nodePath);
    }
  }

  const DBs = useMemo(() => (
    <DatabaseList
      databases={appConf.databases}
      databaseStatusComponents={rendererConf.databaseStatusComponents} />
  ), Object.keys(appConf.databases));


  return (
    <div className={styles.base}>

      <Tree onNodeClick={handleNodeClick} contents={nodes} />

      <Button
          fill
          onClick={() => setShowRetired(!showRetired)}
          active={showRetired === true}>
        Show retired
      </Button>

      {DBs}

    </div>
  );
};


function buildAcitvityNodes(
    activities: { [id: string]: BCActivity },
    plans: { [id: string]: BCPlan },

    selectedNodePath: number[],
    editMode: boolean,

    onUpdateActivity: (activity: BCActivity) => void,
    onUpdatePlan: (plan: BCPlan) => void,
    onShowDrillPlan: (activityID: string, planID: string) => void,
    onDrillStart: (activityID: string, planID: string) => void,
  ): ITreeNode[] {

  const orderedActivities = [
    ...Object.values(activities).sort((a, b) => a.id.localeCompare(b.id)),
    {
      id: NEW_ID_PLACEHOLDER,
      description: NEW_TEXT_PLACEHOLDER,
    } as BCActivity,
  ];

  const orderedPlans = Object.values(plans).sort((a, b) => {
    return a.purpose.localeCompare(b.purpose);
  });

  function getPlansForActivity(activityID: string) {
    return [
      ...orderedPlans.filter(plan => plan.activityID === activityID),
      {
        id: NEW_ID_PLACEHOLDER,
        purpose: NEW_TEXT_PLACEHOLDER,
        activityID,
      } as BCPlan,
    ];
  }

  function activityIsSelected(idx: number) {
    return (
      selectedNodePath.length === 1 &&
      selectedNodePath[0] === idx);
  }
  function activityIsBeingEdited(idx: number) {
    return activityIsSelected(idx) && editMode === true;
  }

  function planIsSelected(activityIdx: number, idx: number) {
    return (
      selectedNodePath.length === 2 &&
      selectedNodePath[0] === activityIdx &&
      selectedNodePath[1] === idx);
  }
  function planIsBeingEdited(activityIdx: number, idx: number) {
    return planIsSelected(activityIdx, idx) && editMode === true;
  }

  return (
    [ ...orderedActivities.entries() ].
    map(([activityIdx, activity]: [number, BCActivity]) => ({
      id: activity.id,
      isSelected: activityIsSelected(activityIdx),
      hasCaret: false,
      isExpanded: true,
      label: activityIsBeingEdited(activityIdx)
        ? <EditableText
            disabled={!activityIsSelected(activityIdx)}
            isEditing={true}
            defaultValue={activity.description}
            onConfirm={description => onUpdateActivity({ ...activity, description })}
            confirmOnEnterKey={true}
            selectAllOnFocus={true}
          />
        : <Text>{activity.description}</Text>,
      secondaryLabel: <>
        <Button
            key="retire"
            onClick={() => onUpdateActivity({ ...activity, retired: true })}
            small>
          Retire
        </Button>
      </>,

      childNodes: activity.id !== NEW_ID_PLACEHOLDER ?
        [...getPlansForActivity(activity.id).entries()].
        map(([planIdx, plan]: [number, BCPlan]) => {
          return {
            id: plan.id,
            isSelected: planIsSelected(activityIdx, planIdx),
            hasCaret: false,
            label: planIsBeingEdited(activityIdx, planIdx)
              ? <EditableText
                  disabled={!planIsSelected(activityIdx, planIdx)}
                  isEditing={planIsBeingEdited(activityIdx, planIdx)}
                  defaultValue={plan.purpose}
                  onConfirm={purpose => onUpdatePlan({ ...plan, purpose })}
                  confirmOnEnterKey={true}
                  selectAllOnFocus={true}
                />
              : <Text>{plan.purpose}</Text>,
            secondaryLabel: plan.id !== NEW_ID_PLACEHOLDER ? <>
              {(plan.drillPlan || []).length > 0
                ? <Button
                      key="start-drill"
                      onClick={() => onDrillStart(activity.id, plan.id)}
                      icon="record"
                      intent="danger"
                      small
                    >Drill</Button>
                : null}
              <Popover
                  content={<Menu>
                    <Menu.Item
                      text="Edit drill plan"
                      onClick={() => onShowDrillPlan(activity.id, plan.id)} />
                    <Menu.Item
                      text="Retire"
                      onClick={() => onUpdatePlan({ ...plan, retired: true })} />
                  </Menu>}
                ><Button small>…</Button></Popover>
            </> : undefined,
          };
        }) : undefined,
    }))
  );
}


export default Window;