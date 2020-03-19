import * as log from 'electron-log';
import moment from 'moment';
import React, { useState, useEffect } from 'react';

import {
  NonIdealState, Spinner, Button, FormGroup,
  Divider, H4, NumericInput, Popover, Position, Menu, Tag } from '@blueprintjs/core';
import { callIPC } from 'coulomb/ipc/renderer';

import {
  BCPlan,
  BCDrillResourceRequirement,
  BCDrillPreparationStep,
  BCDrillStepPlan,
  BCDrillPlanRevision,
} from 'models';
import { app } from 'renderer';
import { AutoSizedTextArea } from 'renderer/widgets';
import styles from './styles.scss';


function makeBlankDrillPlanRevision(id: number): BCDrillPlanRevision {
  return {
    resourceRequirements: [],
    preparationSteps: [],
    steps: [],
    revisionID: id,
    timeCreated: moment().toISOString(),
  };
}


interface EditDrillPlanProps {
  planID: string
}
export const EditDrillPlan: React.FC<EditDrillPlanProps> = function ({ planID }) {
  const bcPlan = app.useOne<BCPlan, string>('plan', planID);

  const revisions = bcPlan.object?.drillPlan || [];

  const [selectedRevisionID, selectRevisionID] =
    useState<number | null>(null);

  const [revision, setRevision] =
    useState<BCDrillPlanRevision>(makeBlankDrillPlanRevision(0));

  const [sanitizedPlanRevision, updateSanitizedPlanRevision] =
    useState<BCDrillPlanRevision | undefined>(undefined);

  const canAmendRevision =
    selectedRevisionID === revisions.length && selectedRevisionID > 0;

  const [commitInProgress, setCommitInProgress] =
    useState(false);

  const hasUncommittedChanges = sanitizedPlanRevision && revision && bcPlan.object &&
    JSON.stringify([revision.resourceRequirements, revision.preparationSteps, revision.steps]) !==
    JSON.stringify([
      sanitizedPlanRevision.resourceRequirements.filter(i => i.description.trim() !== ''),
      sanitizedPlanRevision.preparationSteps.filter(i => i.description.trim() !== ''),
      sanitizedPlanRevision.steps.filter(i => i.description.trim() !== '')]);

  useEffect(() => {
    updateSanitizedPlanRevision(sanitizeEntry(revision));

    const trailingReq = revision.resourceRequirements[revision.resourceRequirements.length - 1];
    if (!trailingReq || trailingReq.description !== '') {
      setRevision({
        ...revision,
        resourceRequirements: [ ...revision.resourceRequirements, { description: '' }],
      });
    }
    const trailingPrepStep = revision.preparationSteps[revision.preparationSteps.length - 1];
    if (!trailingPrepStep || trailingPrepStep.description !== '') {
      setRevision({
        ...revision,
        preparationSteps: [ ...revision.preparationSteps, { description: '' }],
      });
    }
    const trailingStep = revision.steps[revision.steps.length - 1];
    if (!trailingStep || (trailingStep.description !== '' && trailingStep.timeAllowed !== 'PT0M')) {
      setRevision({
        ...revision,
        steps: [ ...revision.steps, { description: '', timeAllowed: 'PT0M' }],
      });
    }
  }, [JSON.stringify(revision)]);

  useEffect(() => {
    if (bcPlan.object !== null) {
      setImmediate(() => selectRevisionID(revisions.length));
    }
  }, [JSON.stringify(revisions)]);

  useEffect(() => {
    if (selectedRevisionID !== null) {
      const selectedRevision = revisions.
        find(rev => rev.revisionID === selectedRevisionID);

      if (selectedRevision !== undefined) {
        setRevision(selectedRevision);
      } else {
        selectRevisionID(null);
      }
    } else {
      setRevision(makeBlankDrillPlanRevision(revisions.length));
    }
  }, [JSON.stringify(revisions), selectedRevisionID]);

  const commitChanges = async (silentlyAmendLatest: boolean = false) => {
    if (bcPlan.object !== null && sanitizedPlanRevision !== undefined) {
      let newPlan: BCPlan;

      if (silentlyAmendLatest) {
        const revisionAmended = revisions.find(r => r.revisionID === selectedRevisionID);
        if (!canAmendRevision) {
          log.error("Cannot amend drill plan revision", selectedRevisionID);
          return;
        } else if (!revisionAmended) {
          log.error("Drill plan revision to amend unexpectedly not found", selectedRevisionID);
          return;
        } else {
          const newRevisions = revisions.map(r =>
            r.revisionID === selectedRevisionID
              ? sanitizedPlanRevision
              : r);
          newPlan = { ...bcPlan.object, drillPlan: newRevisions };
        }
      } else {
        const newRevision = {
          ...sanitizedPlanRevision,
          revisionID: sanitizedPlanRevision.revisionID + 1,
          timeCreated: moment().toISOString(),
        };
        console.debug(newRevision.timeCreated);
        newPlan = { ...bcPlan.object, drillPlan: [ ...revisions, newRevision ] };
      }
      setCommitInProgress(true);

      try {
        await callIPC<{ commit: boolean, objectID: string, object: BCPlan }, { success: true }>
        ('model-plan-update-one', {
          objectID: planID,
          object: newPlan,
          commit: true,
        });
      } catch (e) {
        setCommitInProgress(false);
      }
      setCommitInProgress(false);
    }
  };

  function sanitizeEntry(entry: BCDrillPlanRevision): BCDrillPlanRevision | undefined {
    const sanitizedSteps = (entry.steps || []).filter(s =>
      s.description.trim() !== '' &&
      moment.duration(s.timeAllowed).minutes() >= 1);

    if (sanitizedSteps.length < 1) {
      return undefined;
    }

    return {
      ...entry,
      steps: sanitizedSteps,
      resourceRequirements:
        entry.resourceRequirements.filter(rr => rr.description.trim() !== ''),
      preparationSteps:
        entry.preparationSteps.filter(ps => ps.description.trim() !== ''),
    };
  }

  function handleItemDeletion(field: 'resourceRequirements' | 'preparationSteps' | 'steps') {
    if (revision[field].length > 1) {
      return (idx: number) => {
        setRevision(e => {
          if (e) {
            var items = [ ...e[field] ];
            items.splice(idx, 1);
            return { ...e, [field]: items };
          }
          return e;
        });
      };
    } else {
      return undefined;
    }
  }

  function handleRequirementEdit(idx: number, newReq: BCDrillResourceRequirement) {
    setRevision(e => {
      if (e) {
        var items = [ ...e.resourceRequirements ];
        items[idx] = newReq;
        return { ...e, resourceRequirements: items };
      }
      return e;
    });
  }

  function handlePrepStepEdit(idx: number, newStep: BCDrillPreparationStep) {
    setRevision(e => {
      if (e) {
        var items = [ ...e.preparationSteps ];
        items[idx] = newStep;
        return { ...e, preparationSteps: items };
      }
      return e;
    });
  }

  function handleStepEdit(idx: number, newStep: Partial<BCDrillStepPlan>) {
    setRevision(e => {
      if (e) {
        var items = [ ...e.steps ];
        items[idx] = { ...items[idx], ...newStep };
        return { ...e, steps: items };
      }
      return e;
    });
  }

  return (
    <div className={styles.drillPlanBase}>
      <div className={styles.actions}>
        <span className={styles.title}>
          BC drill plan: {revision.revisionID < 1
            ? <>initial revision</>
            : <Popover
                position={Position.BOTTOM}
                content={
                  <RevisionList
                    revisions={revisions}
                    selectedRevisionID={selectedRevisionID}
                    onSelectRevision={(id: number) => selectRevisionID(id)} />
                }><Button large>rev. {revision.revisionID}</Button></Popover>}
        </span>
        <Button
            large
            onClick={commitInProgress ? undefined : () => commitChanges()}
            active={commitInProgress}
            disabled={
              sanitizedPlanRevision === undefined ||
              bcPlan.isUpdating ||
              !revision ||
              !hasUncommittedChanges}
            intent="success">
          {revision.revisionID < 1
            ? <>Save plan</>
            : <>Save as new plan revision</>}
        </Button>
      </div>

      <Divider />

      <PlanForm
        plan={revision}
        onItemDelete={handleItemDeletion}
        onReqEdit={handleRequirementEdit}
        onPrepEdit={handlePrepStepEdit}
        onStepEdit={handleStepEdit}
      />
    </div>
  );
}


interface PlanFormProps {
  plan: BCDrillPlanRevision
  onItemDelete?:
    (field: 'resourceRequirements' | 'preparationSteps' | 'steps') =>
      ((idx: number) => void) | undefined
  //onReqAdd?: (idx: number) => void
  onReqEdit?: (idx: number, newItem: BCDrillResourceRequirement) => void
  //onPrepAdd?: (idx: number) => void
  onPrepEdit?: (idx: number, newItem: BCDrillPreparationStep) => void
  //onStepAdd?: (idx: number) => void
  onStepEdit?: (idx: number, newItem: Partial<BCDrillStepPlan>) => void
}
const PlanForm: React.FC<PlanFormProps> = function ({
  plan,
  onItemDelete,
  //onReqAdd,
  onReqEdit,
  //onPrepAdd,
  onPrepEdit,
  //onStepAdd,
  onStepEdit,
}) {
  return (
    <div className={styles.drillPlanForm}>

      <div className={styles.drillPlanRequirements}>
        <H4 className={styles.drillPlanSectionHeader}>Resource requirements</H4>
        {[...plan.resourceRequirements.entries()].map(([idx, item]) =>
          <FormGroup
              key={`resource-requirement-${idx}`}
              labelFor={`resource-requirement-${idx}`}
              label={`Req. ${idx + 1}:`}
              labelInfo={idx !== (plan.resourceRequirements.length - 1) && onItemDelete && onItemDelete('resourceRequirements')
                ? <Button small minimal
                    title="Delete this requirement"
                    intent="danger"
                    icon="cross"
                    onClick={() => onItemDelete('resourceRequirements')!(idx)} />
                : undefined}
              intent={item.description.trim() === '' ? 'danger' : undefined}>
            <AutoSizedTextArea fill
              value={item.description}
              growVertically
              placeholder="Define a resource requirement…"
              id={`resource-requirement-${idx}`}
              readOnly={!onReqEdit}
              onChange={(evt: React.FormEvent<HTMLTextAreaElement>) => {
                evt.persist();
                onReqEdit
                  ? onReqEdit(idx, { description: (evt.target as HTMLTextAreaElement).value })
                  : void 0}} />
          </FormGroup>
        )}
      </div>

      <div className={styles.drillPlanPreparationSteps}>
        <H4 className={styles.drillPlanSectionHeader}>Preparatory steps</H4>
        {[...plan.preparationSteps.entries()].map(([idx, item]) =>
          <FormGroup
              key={`prep-step-${idx}`}
              labelFor={`prep-step-${idx}`}
              label={`Step ${idx + 1}:`}
              labelInfo={idx !== (plan.preparationSteps.length - 1) && onItemDelete && onItemDelete('preparationSteps')
                ? <Button small minimal
                    title="Delete this preparatory step"
                    intent="danger"
                    icon="cross"
                    onClick={() => onItemDelete('preparationSteps')!(idx)} />
                : undefined}
              intent={item.description.trim() === '' ? 'danger' : undefined}>
            <AutoSizedTextArea fill
              value={item.description}
              growVertically
              placeholder="Describe a preparatory step…"
              id={`prep-step-${idx}`}
              readOnly={!onPrepEdit}
              onChange={(evt: React.FormEvent<HTMLTextAreaElement>) => {
                evt.persist();
                onPrepEdit
                  ? onPrepEdit(idx, { description: (evt.target as HTMLTextAreaElement).value })
                  : void 0}} />
          </FormGroup>
        )}
      </div>

      <div className={styles.drillPlanSteps}>
        <H4 className={styles.drillPlanSectionHeader}>Drill steps</H4>
        {[...plan.steps.entries()].map(([idx, item]) =>
          <div className={styles.drillPlanStep} key={idx}>
            <FormGroup
                labelFor={`step-${idx}-desc`}
                label={`Step ${idx + 1}:`}
                labelInfo={idx !== (plan.steps.length - 1) && onItemDelete && onItemDelete('steps')
                  ? <Button small minimal
                      title="Delete this preparatory step"
                      intent="danger"
                      icon="cross"
                      onClick={() => onItemDelete('steps')!(idx)} />
                  : undefined}
                intent={item.description.trim() === '' ? 'danger' : undefined}>
              <AutoSizedTextArea fill
                value={item.description}
                growVertically
                placeholder="Describe drill step…"
                id={`step-${idx}-desc`}
                readOnly={!onPrepEdit}
                onChange={(evt: React.FormEvent<HTMLTextAreaElement>) => {
                  evt.persist();
                  onStepEdit
                    ? onStepEdit(idx, { description: (evt.target as HTMLTextAreaElement).value })
                    : void 0}} />
            </FormGroup>

            <FormGroup
                labelFor={`step-${idx}-time-allocation`}
                label={`Time allowed:`}
                helperText="A number of minutes."
                intent={moment.duration(item.timeAllowed).minutes() < 1 ? 'danger' : undefined}>
              <NumericInput fill
                value={`${moment.duration(item.timeAllowed).minutes()}`}
                id={`step-${idx}-time-allocation`}
                readOnly={!onPrepEdit}
                onValueChange={(valueAsNumber: number) => {
                  onStepEdit
                    ? onStepEdit(idx, { timeAllowed: moment.duration({ minutes: valueAsNumber }).toISOString() })
                    : void 0}} />
            </FormGroup>
          </div>
        )}
      </div>

    </div>
  );
};


interface RevisionListProps {
  revisions: BCDrillPlanRevision[]
  selectedRevisionID: number | null
  onSelectRevision: (revisionID: number) => void
}
const RevisionList: React.FC<RevisionListProps> = function ({ revisions, onSelectRevision, selectedRevisionID }) {
  return (
    <Menu className={styles.revisionList}>
      {[ ...revisions.entries() ].map(([idx, rev]) =>
        <Menu.Item
          key={rev.revisionID}
          active={rev.revisionID === selectedRevisionID}
          text={`Revision ${rev.revisionID}: ${moment(rev.timeCreated).format('dddd, MMMM Do YYYY, h:mm:ss a')}`}
          labelElement={idx === revisions.length - 1 ? <Tag minimal>Latest</Tag> : undefined}
          onClick={() => onSelectRevision(rev.revisionID)}
        />)}
    </Menu>
  );
};