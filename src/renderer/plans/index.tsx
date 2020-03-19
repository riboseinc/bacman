import React, { useState, useEffect, useMemo } from 'react';

import slugify from 'slugify';

import {
  Menu, Tree, ITreeNode, EditableText, Text, Button, Popover, Position,
  ButtonGroup, NonIdealState, Divider } from '@blueprintjs/core';
import { WindowComponentProps } from 'coulomb/config/renderer';
import { callIPC } from 'coulomb/ipc/renderer';
import { DatabaseList } from 'coulomb/db/renderer/status';

import { conf as appConf } from 'app';
import { BCActivity, BCPlan } from 'models';
import { conf as rendererConf } from 'renderer';
import { app } from 'renderer';
import styles from './styles.scss';
import { EditDrillPlan } from './edit-drill-plan';
import { RunDrill } from './run-drill';
import { DrillHistory } from './drill-history';


interface RetireableQuery {
  showRetired: boolean
}


const NEW_ID_PLACEHOLDER = '__new';
const NEW_TEXT_PLACEHOLDER = "Add";


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

  const [selectedPlanID, selectPlanID] = useState<string | null>(null);

  useEffect(() => {
    updateNodes(buildAcitvityNodes(
      activities.objects,
      plans.objects,
      selectedNode,
      editMode,
      () => setEditMode(false),
      handleActivityUpdate,
      handlePlanUpdate,

      mod,
      handleShowDrillHistory,
      handleDrillStart,
      handleEditDrillPlan));
  }, [
    JSON.stringify(activities.objects),
    JSON.stringify(plans.objects),
    JSON.stringify(selectedNode),
    editMode,
  ]);

  useEffect(() => {
    setEditMode(false);
  }, [JSON.stringify(selectedNode)]);

  const DBs = useMemo(() => (
    <DatabaseList
      databases={appConf.databases}
      databaseStatusComponents={rendererConf.databaseStatusComponents} />
  ), Object.keys(appConf.databases));

  const [mod, setMod] = useState<Module>('edit-plan');


  async function handleActivityUpdate(activity: BCActivity) {
    if (activity.id === NEW_ID_PLACEHOLDER) {
      if (activity.description === NEW_TEXT_PLACEHOLDER || activity.description.trim() === '') {
        return;
      }

      const id = slugify(activity.description, { lower: true, strict: true });
      const newActivity = { ...activity, id };
      await callIPC<{ object: BCActivity, commit: boolean }, { success: true }>
      ('model-activity-create-one', {
        object: newActivity,
        commit: true,
      });

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
      if (plan.purpose === NEW_TEXT_PLACEHOLDER || plan.purpose.trim() === '') {
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
    setMod('run-drill');
  }

  async function handleShowDrillHistory(activityID: string, planID: string) {
    setMod('show-history');
  }

  async function handleEditDrillPlan(activityID: string, planID: string) {
    setMod('edit-plan');
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

  let mainPane: JSX.Element;
  if (selectedPlanID !== null) {
    if (mod === 'run-drill') {
      mainPane = <RunDrill planID={selectedPlanID} />;
    } else if (mod === 'show-history') {
      mainPane = <DrillHistory planID={selectedPlanID} />;
    } else if (mod === 'edit-plan') {
      mainPane = <EditDrillPlan planID={selectedPlanID} />;
    } else {
      throw new Error("Unknown BC plan module");
    }
  } else {
    mainPane = <NonIdealState title="No BC plan selected" />;
  }


  return (
    <div className={styles.base}>

      <div className={styles.sidebar}>
        <div className={styles.objects}>
          <Tree className={styles.objectTree} onNodeClick={handleNodeClick} contents={nodes} />

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

      <div className={styles.mainPane}>
        {mainPane}
      </div>

    </div>
  );
};


function buildAcitvityNodes(
    activities: { [id: string]: BCActivity },
    plans: { [id: string]: BCPlan },

    selectedNodePath: number[],
    editMode: boolean,
    exitEditMode: () => void,

    onUpdateActivity: (activity: BCActivity) => void,
    onUpdatePlan: (plan: BCPlan) => void,

    mod: Module,
    onShowDrillReports: (activityID: string, planID: string) => void,
    onDrillStart: (activityID: string, planID: string) => void,
    onReviseDrillPlan: (activityID: string, planID: string) => void,
  ): ITreeNode[] {

  const orderedActivities = [
    ...Object.values(activities).sort((a, b) => a.id.localeCompare(b.id)),
    {
      id: NEW_ID_PLACEHOLDER,
      description: "Add activity",
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
        purpose: "Add continuity plan",
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
    map(([activityIdx, activity]: [number, BCActivity]) => {
      const isSelected = activityIsSelected(activityIdx);
      const isBeingEdited = activityIsBeingEdited(activityIdx);
      const isPlaceholder = activity.id === NEW_ID_PLACEHOLDER;
      const plans = getPlansForActivity(activity.id);
      return {
        id: activity.id,
        isSelected,
        hasCaret: !isPlaceholder && plans.length > 0,
        isExpanded: true,
        icon: isPlaceholder ? 'add' : 'pulse',
        label: isBeingEdited
          ? <EditableText
              isEditing={true}
              defaultValue={isPlaceholder ? '' : activity.description}
              placeholder="New activity description…"
              onConfirm={description => { exitEditMode(); onUpdateActivity({ ...activity, description }) }}
              onCancel={() => exitEditMode()}
              confirmOnEnterKey={true}
              selectAllOnFocus={true}
            />
          : <Text ellipsize={true}>{activity.description}</Text>,
        secondaryLabel: !isPlaceholder
          ? <>
              <Popover
                  position={Position.RIGHT}
                  content={<Menu>
                    <Menu.Item
                      text="Retire"
                      disabled
                      icon="archive"
                      onClick={() => onUpdateActivity({ ...activity, retired: true })} />
                  </Menu>}>
                <Button minimal icon="more" small />
              </Popover>
              </>
          : undefined,

        childNodes: !isPlaceholder
          ? [...plans.entries()].
            map(([planIdx, plan]: [number, BCPlan]) => {
              const isSelected = planIsSelected(activityIdx, planIdx);
              const isBeingEdited = planIsBeingEdited(activityIdx, planIdx);
              const isPlaceholder = plan.id === NEW_ID_PLACEHOLDER;
              return {
                id: plan.id,
                isSelected,
                hasCaret: false,
                icon: isPlaceholder ? 'add' : 'clipboard',
                nodeData: {
                  bcActivityID: activity.id,
                  bcPlanID: plan.id,
                },
                label: isBeingEdited
                  ? <EditableText
                      isEditing={isBeingEdited}
                      defaultValue={isPlaceholder ? '' : plan.purpose}
                      placeholder="New BC plan purpose…"
                      onConfirm={purpose => { exitEditMode(); onUpdatePlan({ ...plan, purpose }) }}
                      onCancel={() => exitEditMode()}
                      confirmOnEnterKey={true}
                      selectAllOnFocus={true}
                    />
                  : <Text ellipsize={true}>{plan.purpose}</Text>,
                secondaryLabel: !isPlaceholder
                  ? <ButtonGroup>
                      <Button
                          key="start-drill"
                          onClick={() => onDrillStart(activity.id, plan.id)}
                          disabled={(plan.drillPlan || []).length < 1}
                          intent="danger"
                          small
                          minimal
                          active={isSelected && mod === 'run-drill'}
                          title="Start drill…"
                          icon="record"
                        />
                      <Button
                          key="view-reports"
                          onClick={() => onShowDrillReports(activity.id, plan.id)}
                          small
                          minimal
                          active={isSelected && mod === 'show-history'}
                          title="View past drill reports…"
                          icon="history"
                        />
                      <Button
                          key="edit-plan"
                          onClick={() => onReviseDrillPlan(activity.id, plan.id)}
                          small
                          minimal
                          active={isSelected && mod === 'edit-plan'}
                          title="Edit drill plan…"
                          icon="edit"
                        />
                      <Popover
                          position={Position.RIGHT}
                          content={<Menu>
                            <Menu.Item
                              text="Retire"
                              disabled
                              icon="archive"
                              onClick={() => onUpdatePlan({ ...plan, retired: true })} />
                          </Menu>}>
                        <Button minimal icon="more" small />
                      </Popover>
                    </ButtonGroup>
                  : undefined,
              };
            })
          : undefined,
      };
    })
  );
}


export default Window;

type Module = 'show-history' | 'run-drill' | 'edit-plan';