import moment from 'moment';
import slugify from 'slugify'

import React, { useState, useEffect } from 'react';
import {
  H5, Divider, Button, ButtonGroup, NonIdealState, TagInput,
  FormGroup, RadioGroup, Radio, Text, Classes, H4, Callout, UL,
} from '@blueprintjs/core';
import { callIPC } from 'coulomb/ipc/renderer';

import { app } from 'renderer';
import { AutoSizedTextArea } from 'renderer/widgets';
import {
  BCPlan, BCDrill, BCDrillPlanRevision, BCDrillStepReport, BCDrillReport,
  BCDrillParticipant, BCDrillActivityType,
} from 'models';
import styles from './styles.scss';


function nameToParticipant(name: string): BCDrillParticipant {
  return { id: slugify(name, { strict: true, lower: true }), name };
}


interface RunDrillProps {
  planID: string
}
export const RunDrill: React.FC<RunDrillProps> = function ({ planID }) {
  const bcPlan = app.useOne<BCPlan, string>('plan', planID);
  const planRevisions = bcPlan.object?.drillPlan || [];

  const drills = app.useMany<BCDrill, {}>('drill', {});

  const drillPlan = planRevisions[planRevisions.length - 1];

  const drillInProgress = drillPlan
    ? Object.values(drills.objects).
      find(dr =>
        dr.bcPlanID === planID &&
        dr.bcDrillPlanRevisionID === drillPlan.revisionID &&
        dr.endTime === undefined)
    : undefined;

  const [secondsElapsed, updateSecondsElapsed] = useState<number>(0);

  var pastDrills = Object.values(drills.objects).
      filter(dr => dr.bcPlanID === planID && dr.endTime !== undefined);
  pastDrills.reverse();

  useEffect(() => {
    countSeconds();
    const interval = setInterval(countSeconds, 1000);
    return function cleanup() {
      clearInterval(interval);
    }
  }, [drillInProgress?.id]);

  const elapsedTime = moment.duration(secondsElapsed, 'seconds');

  const [drillReport, updateDrillReport] = useState<BCDrillReport | undefined>(undefined);

  useEffect(() => {
    if (drillInProgress) {
      updateDrillReport(drillInProgress.report);
    }
  }, [drillInProgress]);

  useEffect(() => {
    updateDrillReport(undefined);
  }, [planID]);

  const activeDrill = app.useOne<BCDrill, string>('drill', drillInProgress?.id || null);

  const [commitInProgress, setCommitInProgress] =
    useState(false);

  function countSeconds() {
    if (drillInProgress !== undefined &&
        drillInProgress.startTime &&
        drillInProgress.endTime === undefined) {
      updateSecondsElapsed(
        moment.duration(
          moment().diff(moment(drillInProgress.startTime))
        ).asSeconds()
      );
    }
  }

  async function handleStartDrill() {
    setCommitInProgress(true);

    if (!drillPlan) {
      throw new Error("No drill plan found to run drill");
    }

    const startTime = moment();
    const drillID = `${planID}-${drillPlan.revisionID}-${startTime.toISOString()}`;

    const newDrill: BCDrill = {
      id: drillID,
      bcPlanID: planID,
      bcDrillPlanRevisionID: drillPlan.revisionID,
      startTime: startTime.toDate(),
      report: {
        followUpAction: '',
        steps: drillPlan.steps.map(stepPlan => ({
          plan: stepPlan,
          responsible: [],
          participants: [],
          result: '',
          activityType: 'Discussion',
        })),
        authors: [],
      },
    }

    try {
      await callIPC<{ commit: boolean, object: BCDrill }, { success: true }>
      ('model-drill-create-one', {
        object: newDrill,
        commit: true,
      });
    } catch (e) {
      setCommitInProgress(false);
    }
    setCommitInProgress(false);
    await activeDrill.refresh();
  }

  async function handleEndDrill() {
    setCommitInProgress(true);

    if (!activeDrill.object) {
      throw new Error("No active drill to stop has been found");
    }

    const endTime = moment();

    try {
      await callIPC<{ commit: boolean, objectID: string, object: BCDrill }, { success: true }>
      ('model-drill-update-one', {
        objectID: activeDrill.object.id,
        object: {
          ...activeDrill.object,
          report: drillReport || activeDrill.object.report,
          endTime: endTime.toDate(),
        },
        commit: true,
      });
      //setActiveDrillID(activeDrill.object.id);
    } catch (e) {
      setCommitInProgress(false);
    }
    setCommitInProgress(false);
    await activeDrill.refresh();
  }

  async function handleSaveReport() {
    setCommitInProgress(true);

    if (!drillReport || !drillInProgress) {
      throw new Error("No report found");
    }

    try {
      await callIPC<{ commit: boolean, objectID: string, object: BCDrill }, { success: true }>
      ('model-drill-update-one', {
        objectID: drillInProgress.id,
        object: { ...drillInProgress, report: drillReport },
        commit: true,
      });
      //setActiveDrillID(activeDrill.object.id);
    } catch (e) {
      setCommitInProgress(false);
    }
    setCommitInProgress(false);
    await activeDrill.refresh();
  }

  function updateStep(idx: number, report: Partial<BCDrillStepReport>) {
    if (drillReport) {
      const steps = [ ...drillReport.steps ];
      steps[idx] = { ...steps[idx], ...report };
      updateDrillReport({ ...drillReport, steps });
    }
  }

  function handleAuthorsChange(names: string[]) {
    if (drillReport) {
      updateDrillReport({ ...drillReport, authors: names.map(nameToParticipant) });
    }
  }
  function handleStepActivityTypeSet(step: number, activity: BCDrillActivityType) {
    updateStep(step, { activityType: activity });
  }

  function handleStepParticipantsChange(
      step: number,
      field: 'participants' | 'responsible',
      names: string[]) {
    updateStep(step, { [field]: names.map(nameToParticipant) });
  }

  function handleStepStart(step: number) {
    updateStep(step, { startTime: new Date() });
  }
  function handleStepEnd(step: number) {
    updateStep(step, { endTime: new Date() });
  }

  function handleStepResultUpdate(step: number, result: string) {
    updateStep(step, { result });
  }

  function handleFollowUpActionUpdate(description: string) {
    if (drillReport) {
      updateDrillReport({ ...drillReport, followUpAction: description });
    }
  }

  return (
    <div className={styles.mainPaneInner}>
      <div className={styles.toolbar}>
        <Text ellipsize className={styles.title}>
          {drillInProgress
            ? <>
                Drill in progress:
                {" "}
                {secondsElapsed > 0
                  ? <>
                      {`${elapsedTime.minutes()}`.padStart(2, '0')}
                      :
                      {`${elapsedTime.seconds()}`.padStart(2, '0')}
                      {" "}
                      elapsed
                    </>
                  : undefined}
              </>
            : <>Run drill</>}
        </Text>
        <ButtonGroup>
          <Button
              key="start"
              large
              onClick={handleStartDrill}
              active={commitInProgress}
              disabled={drillPlan === undefined || drillInProgress !== undefined}
              icon="record"
              intent="danger">
            Start drill
          </Button>
          <Button
              key="end"
              large
              onClick={handleEndDrill}
              active={commitInProgress}
              disabled={drillInProgress === undefined}
              icon="stop"
              title="End drill and record duration."
              intent="primary">
            End
          </Button>
          <Button
              key="save"
              large
              onClick={handleSaveReport}
              active={commitInProgress}
              disabled={drillReport === undefined || drillInProgress === undefined}
              icon="floppy-disk">
            Save report
          </Button>
        </ButtonGroup>
      </div>

      <Divider />

      {(drillReport !== undefined && drillPlan !== undefined)
        ? <DrillReportForm
            plan={drillPlan}
            report={drillReport}
            onAuthorsChange={drillInProgress ? handleAuthorsChange : undefined}
            onStepParticipantsChange={drillInProgress ? handleStepParticipantsChange : undefined}
            onStepActivityTypeChange={drillInProgress ? handleStepActivityTypeSet : undefined}
            onStepResultUpdate={drillInProgress ? handleStepResultUpdate : undefined}
            onFollowUpActionUpdate={drillInProgress ? handleFollowUpActionUpdate : undefined}
            onStepStart={drillInProgress ? handleStepStart : undefined}
            onStepEnd={drillInProgress ? handleStepEnd : undefined}
          />
        : <NonIdealState
            title="No drill to show."
            description={<div className={styles.noDrillPrompt}>
              <Text>
                Start a new drill above, or select a past report to review:
              </Text>
              <UL className={styles.pastDrillList}>
                {pastDrills.map(dr =>
                  <li key={dr.id} className={styles.pastDrillEntry}>
                    <a onClick={() => updateDrillReport(dr.report)}>
                      <Text ellipsize>{dr.id}</Text>
                    </a>
                  </li>
                )}
              </UL>
            </div>}
          />}
      
    </div>
  );
};


type StepParticipantsField = 'participants' | 'responsible';


interface DrillReportFormProps {
  plan: BCDrillPlanRevision
  report: BCDrillReport
  onAuthorsChange?: (ids: string[]) => void
  onStepParticipantsChange?: (stepIdx: number, field: StepParticipantsField, ids: string[]) => void
  onStepActivityTypeChange?: (stepIdx: number, activity: BCDrillActivityType) => void
  onStepResultUpdate?: (stepIdx: number, result: string) => void
  onFollowUpActionUpdate?: (text: string) => void
  onStepStart?: (idx: number) => void
  onStepEnd?: (idx: number) => void
}
const DrillReportForm: React.FC<DrillReportFormProps> = function ({
  plan,
  report,
  onAuthorsChange,
  onStepParticipantsChange,
  onStepActivityTypeChange,
  onStepResultUpdate,
  onFollowUpActionUpdate,
  onStepStart,
  onStepEnd,
}) {
  return (
    <div className={styles.drillReportForm}>

      <Callout className={styles.planIntro} intent="primary">
        <div className={styles.resourceRequirements}>
          <H4>Resource requirements</H4>
          {plan.resourceRequirements.length < 1 ? <Text>None</Text> : null}
          <UL>
            {plan.resourceRequirements.map(rr => <li>{rr.description}</li>)}
          </UL>
        </div>
        <div className={styles.preparationSteps}>
          <H4>Preparation steps</H4>
          {plan.preparationSteps.length < 1 ? <Text>None</Text> : null}
          <UL>
            {plan.preparationSteps.map(ps => <li>{ps.description}</li>)}
          </UL>
        </div>
      </Callout>

      <div className={styles.stepReports}>
        {[ ...report.steps.entries() ].map(([idx, step]) =>
          <StepReport
            key={idx}
            title={`Step ${idx + 1}`}
            step={step}
            onResultUpdate={onStepResultUpdate
              ? ((result) => onStepResultUpdate(idx, result))
              : undefined}
            onParticipantsChange={onStepParticipantsChange
              ? ((names) => onStepParticipantsChange(idx, 'participants', names))
              : undefined}
            onResponsibleChange={onStepParticipantsChange
              ? ((names) => onStepParticipantsChange(idx, 'responsible', names))
              : undefined}
            onActivityTypeChange={onStepActivityTypeChange
              ? ((activity) => onStepActivityTypeChange(idx, activity))
              : undefined}
            onStart={onStepStart
              ? (() => onStepStart(idx))
              : undefined}
            onEnd={onStepEnd
              ? (() => onStepEnd(idx))
              : undefined}
          />
        )}
      </div>

      <Callout intent="success">
        <H4>Conclusion</H4>
        <div className={styles.reportFollowUp}>
          <FormGroup label="Follow-up action:" labelFor="follow-up">
            <AutoSizedTextArea fill
              value={report.followUpAction}
              growVertically
              placeholder="Summarize follow-up action…"
              id="follow-up"
              readOnly={!onFollowUpActionUpdate}
              onChange={(evt: React.FormEvent<HTMLTextAreaElement>) => {
                evt.persist();
                onFollowUpActionUpdate
                  ? onFollowUpActionUpdate((evt.target as HTMLTextAreaElement).value)
                  : void 0}} />
          </FormGroup>
        </div>

        <div className={styles.reportAuthors}>
          <FormGroup label="Report authors:">
            <TagInput
              placeholder="Enter a name and press Enter"
              values={report.authors.map(a => a.name)}
              disabled={!onAuthorsChange}
              onChange={(values: React.ReactNode[]) => onAuthorsChange
                ? onAuthorsChange(values.filter(v => v !== undefined).map(v => v!.toString()))
                : undefined} />
          </FormGroup>
        </div>
      </Callout>

    </div>
  );
};


const ACTIVITIES = [
  "Discussion",
  "Tabletop",
  "Live",
]


interface StepReportProps {
  step: BCDrillStepReport
  title: string
  onActivityTypeChange?: (activityType: BCDrillActivityType) => void
  onResponsibleChange?: (ids: string[]) => void
  onParticipantsChange?: (ids: string[]) => void
  onResultUpdate?: (result: string) => void
  onStart?: () => void
  onEnd?: () => void
}
const StepReport: React.FC<StepReportProps> = function ({
  step,
  title,
  onActivityTypeChange,
  onResponsibleChange,
  onParticipantsChange,
  onResultUpdate,
  onStart,
  onEnd,
}) {
  const [secondsElapsed, updateSecondsElapsed] = useState(0);

  function countSeconds() {
    if (step.startTime !== undefined && step.endTime === undefined) {
      updateSecondsElapsed(
        moment.duration(
          moment().diff(moment(step.startTime))
        ).asSeconds()
      );
    }
  }

  useEffect(() => {
    countSeconds();
    const interval = setInterval(countSeconds, 1000);
    return function cleanup() {
      clearInterval(interval);
    }
  }, [step.startTime, step.endTime]);

  return (
    <div className={styles.stepReport}>
      <H5>{title}</H5>

      <div className={styles.stepPlan}>
        <FormGroup
            label="Description, per drill plan:"
            className={styles.stepPlanDescription}>
          <Text className={Classes.TEXT_LARGE}>{step.plan.description}</Text>
        </FormGroup>
        <FormGroup
            label="Time allocated:"
            className={styles.stepPlanTimeAllocated}>
          <Text>{moment.duration(step.plan.timeAllowed).minutes()} min.</Text>
        </FormGroup>
      </div>

      <div className={styles.stepActivity}>
        <div className={styles.stepActivityType}>
          <RadioGroup
              inline={true}
              label="Activity type:"
              disabled={!onActivityTypeChange}
              onChange={(evt: React.FormEvent) => onActivityTypeChange
                ? onActivityTypeChange((evt.target as HTMLInputElement).value as BCDrillActivityType)
                : undefined}
              selectedValue={step.activityType}>
            {ACTIVITIES.map(a => <Radio key={a} label={a} value={a} />)}
          </RadioGroup>
        </div>
        <div className={styles.stepTimer}>
          <ButtonGroup>
            <Button
              intent="danger"
              disabled={!onStart || step.startTime !== undefined || step.endTime !== undefined}
              onClick={onStart}>Start</Button>
            <Button
              intent="primary"
              disabled={!onEnd || step.startTime === undefined || step.endTime !== undefined}
              onClick={onEnd}>End</Button>
          </ButtonGroup>
          <Text>
            {`${moment.duration(secondsElapsed, 'seconds').asSeconds()}`} sec. elapsed
          </Text>
        </div>
      </div>

      <div className={styles.stepParticipantsGeneral}>
        <div className={styles.stepResponsible}>
          <FormGroup label="Responsible:">
            <TagInput
              placeholder="Enter a name and press Enter"
              values={step.responsible.map(a => a.name)}
              disabled={!onResponsibleChange}
              onChange={(values: React.ReactNode[]) => onResponsibleChange
                ? onResponsibleChange(values.filter(v => v !== undefined).map(v => v!.toString()))
                : undefined} />
          </FormGroup>
        </div>

        <div className={styles.stepParticipants}>
          <FormGroup label="Participants:">
            <TagInput
              placeholder="Enter a name and press Enter"
              values={step.participants.map(a => a.name)}
              disabled={!onParticipantsChange}
              onChange={(values: React.ReactNode[]) => onParticipantsChange
                ? onParticipantsChange(values.filter(v => v !== undefined).map(v => v!.toString()))
                : undefined} />
          </FormGroup>
        </div>
      </div>

      <div className={styles.stepResult}>
        <FormGroup label="Result:" labelFor="result">
          <AutoSizedTextArea fill
            value={step.result}
            growVertically
            placeholder="Describe step outcome…"
            id="result"
            readOnly={!onResultUpdate}
            onChange={(evt: React.FormEvent<HTMLTextAreaElement>) => {
              evt.persist();
              onResultUpdate
                ? onResultUpdate((evt.target as HTMLTextAreaElement).value)
                : void 0}} />
        </FormGroup>
      </div>

    </div>
  );
};