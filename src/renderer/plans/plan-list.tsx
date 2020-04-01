import React from 'react';
import {
  ITreeNode,
  EditableText,
  Menu,
  Text,
  Button, ButtonGroup,
  Position, Popover,
} from '@blueprintjs/core';

import { Plan, makeBlankPlanRevision } from 'models';
import { NEW_ID_PLACEHOLDER } from './utils';


export function buildPlanNodes(
    plans: { [id: string]: Plan },
    selectedNodePath: number[],
    editMode: boolean,
    exitEditMode: () => void,
    onUpdatePlan: (plan: Plan) => void,
  ): ITreeNode[] {

  const orderedPlans: Plan[] = [
    ...Object.values(plans).sort((a, b) =>  a.name.localeCompare(b.name)),
    {
      id: NEW_ID_PLACEHOLDER,
      name: "Add continuity plan",
      revisions: [makeBlankPlanRevision()],
    },
  ]

  function planIsSelected(idx: number) {
    return (
      selectedNodePath.length === 2 &&
      selectedNodePath[0] === 0 &&
      selectedNodePath[1] === idx);
  }
  function planIsBeingEdited(idx: number) {
    return planIsSelected(idx) && editMode === true;
  }

  return (
    [...orderedPlans.entries()].
    map(([planIdx, plan]: [number, Plan]) => {
      const isSelected = planIsSelected(planIdx);
      const isBeingEdited = planIsBeingEdited(planIdx);
      const isPlaceholder = plan.id === NEW_ID_PLACEHOLDER;
      return {
        id: plan.id,
        isSelected,
        hasCaret: false,
        icon: isPlaceholder ? 'add' : 'manual',
        nodeData: {
          bcPlanID: plan.id,
        },
        label: isBeingEdited
          ? <EditableText
              isEditing={isBeingEdited}
              defaultValue={isPlaceholder ? '' : plan.name}
              placeholder="New BC plan name…"
              onConfirm={name => { exitEditMode(); onUpdatePlan({ ...plan, name }) }}
              onCancel={() => exitEditMode()}
              confirmOnEnterKey={true}
              selectAllOnFocus={true}
            />
          : <Text ellipsize={true}>{plan.name}</Text>,
        secondaryLabel: !isPlaceholder
          ? <ButtonGroup>
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
  );
}
