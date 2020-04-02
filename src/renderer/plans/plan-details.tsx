import React, { useState, PropsWithChildren, useEffect, useRef } from 'react';
import { NonIdealState, H2, Button, EditableText, Text, Classes, Overlay } from '@blueprintjs/core';
import { Panel, PanelProps } from 'coulomb-panel/panel';
import { Plan, PlannedProcedure, PlanRevision, CriteriaGroup, Role, Resource } from 'models';
import { ProcedureDetails } from './procedure-details';
import { PlanRevisions } from './plan-revisions';
import styles from './plan-details.scss';

import * as procedures from './procedures-panel';
import * as roles from './roles-panel';
import * as resources from './resources-panel';
import * as activationCriteria from './criteria-panel';

const panels = {
  procedures: procedures,
  criteria: activationCriteria,
  roles: roles,
  resources: resources,
};


interface PanelConfig<Props> extends PanelProps {
  title: string
  props: Props
  Compact: React.FC<PanelProps & Props>
  Maximized: React.FC<Props>
  onMinimize: () => void
  onMaximize: (el: JSX.Element) => void
  isMaximized: boolean
};


function MaximizablePanel<ContentProps>(props: PropsWithChildren<PanelConfig<ContentProps>>) {
  const panelRef = useRef<HTMLElement | null>(null);
  return (
    <Panel
        contentsRef={(el) => panelRef.current = el}
        className={`${styles.panel} ${styles.maximizablePanel}`}
        title={props.title}
        isCollapsible={(props.isCollapsible && !props.isMaximized) || undefined}
        contentsClassName={styles.maximizablePanelContents}
        TitleComponentSecondary={({ isCollapsed }) => <>
          {props.TitleComponentSecondary
            ? <props.TitleComponentSecondary />
            : null}
          {!isCollapsed
            ? <MaximizeButton
                isMaximized={props.isMaximized}
                onToggle={() => props.isMaximized
                  ? props.onMinimize()
                  : props.onMaximize(<props.Maximized {...props.props} />)} />
            : null}
        </>}>
      <props.Compact {...props.props} />

      {panelRef.current !== null
        ? <Overlay
              onClose={props.onMinimize}
              isOpen={props.isMaximized}
              enforceFocus={false}
              portalClassName={styles.maximizedPanelOverlay}
              backdropClassName={styles.maximizedPanelBackdrop}
              portalContainer={panelRef.current}>
            <div></div>
          </Overlay>
        : null}
    </Panel>
  );
}



interface PlanDetailsProps {
  plan: Plan
  onUpdate: (plan: Plan) => void 
  onNewRevision: (plan: Plan, fromRevisionIdx: number) => void
}
export const PlanDetails: React.FC<PlanDetailsProps> =
function ({ plan, onUpdate, onNewRevision }) {
  const [selectedProcedureIdx, selectProcedureIdx] = useState<number | null>(null);
  const [maximizedPanel, maximizePanel] = useState<JSX.Element | null>(null);
  const [maximizedPanelTitle, setMaximizedPanelTitle] = useState<string | null>(null);
  const [selectedRevisionIdx, selectRevisionIdx] = useState<number>(0);

  useEffect(() => {
    selectProcedureIdx(null);
  }, [plan.id]);

  useEffect(() => {
    selectRevisionIdx(0);
  }, [plan.revisions.length]);

  useEffect(() => {
    minimizePanel();
  }, [selectedProcedureIdx]);

  if (plan === null) {
    return <NonIdealState title="No plan is selected" />;
  }

  const revision: PlanRevision = plan.revisions[selectedRevisionIdx];
  const isLatestRevision = selectedRevisionIdx === 0;

  if (revision === undefined) {
    return <NonIdealState
      icon="error"
      title={`Missing plan revision ${selectedRevisionIdx}`} />;
  }

  function onUpdateRevision(revision: PlanRevision) {
    let newPlan = { ...plan };
    newPlan.revisions[0] = revision;
    onUpdate(newPlan);
  }

  function handleUpdateRoles(roles: Role[]) {
    if (selectedProcedure !== null) {
      handleUpdateProcedure({ ...selectedProcedure, roles });
    } else {
      onUpdateRevision({ ...revision, roles });
    }
  }

  function handleUpdateCriteria(activationCriteria: CriteriaGroup) {
    if (selectedProcedure !== null) {
      handleUpdateProcedure({ ...selectedProcedure, activationCriteria });
    } else {
      onUpdateRevision({ ...revision, activationCriteria });
    }
  }

  function handleUpdateResources(requiredResources: Resource[]) {
    if (selectedProcedure !== null) {
      handleUpdateProcedure({ ...selectedProcedure, requiredResources });
    } else {
      onUpdateRevision({ ...revision, requiredResources });
    }
  }

  function handleAddProcedure(procedure: PlannedProcedure) {
    if (plan === null) {
      return;
    }
    const procs = [...(revision.procedures || []), procedure];
    const idx = procs.length - 1;
    onUpdateRevision({ ...revision, procedures: procs });
    setImmediate(() => selectProcedureIdx(idx));
  }

  function handleDeleteProcedure(idx: number) {
    if (plan === null) {
      return;
    }
    var procs = [...(revision.procedures || [])];
    procs.splice(idx, 1);
    onUpdateRevision({ ...revision, procedures: procs });
    setImmediate(() => selectProcedureIdx(null));
  }

  function handleUpdateProcedure(procedure: PlannedProcedure) {
    if (selectedProcedure !== null && revision.procedures && selectedProcedureIdx !== null) {
      const procedures = [ ...revision.procedures ];
      procedures[selectedProcedureIdx] = procedure;

      const newRevision = { ...revision, procedures };
      onUpdateRevision(newRevision);
    }
  }

  function minimizePanel() {
    maximizePanel(null);
    setMaximizedPanelTitle(null);
  }

  function panelProps(title: string):
  Pick<PanelConfig<any>, "title" | "isMaximized" | "onMaximize"> {
    return {
      title,
      isMaximized: maximizedPanelTitle === title,
      onMaximize: (el) => {
        maximizePanel(el);
        setMaximizedPanelTitle(title);
      },
    };
  }

  const selectedProcedure: PlannedProcedure | null = selectedProcedureIdx !== null
    ? ((revision.procedures || [])[selectedProcedureIdx] || null)
    : null;

  const selectedProcedurePanel = selectedProcedure && maximizedPanelTitle !== 'Procedures'
    ? <ProcedureDetails
        collapsed={maximizedPanel !== null}
        procedure={selectedProcedure}
        onUpdate={isLatestRevision ? handleUpdateProcedure : undefined}
      />
    : null;

  const planSummaryCollapsed = selectedProcedureIdx !== null || maximizedPanel !== null;

  return (
    <div className={styles.base}>

      <div className={styles.mainView}>
        <PlanSummary
          plan={plan}
          revision={revision}
          onPlanUpdate={onUpdate}
          onRevisionUpdate={isLatestRevision ? onUpdateRevision : undefined}
          collapsed={planSummaryCollapsed} />

        {!planSummaryCollapsed
          ? <PlanRevisions
              revisions={plan.revisions}
              selectedIdx={selectedRevisionIdx}
              onSelect={selectRevisionIdx}
              onCreate={() => onNewRevision(plan, selectedRevisionIdx)}
            />
          : null}

        {selectedProcedurePanel
          ? <div className={`${styles.selectedProcedure} ${maximizedPanel !== null ? styles.sheetCollapsed : ''}`}>
              <CloseSheetButton onClose={() => selectProcedureIdx(null)} />
              {selectedProcedurePanel}
            </div>
          : null}

        {maximizedPanel
          ? <div className={styles.maximizedPanel }>
              <MaximizedPanel onMinimize={minimizePanel}>
                {maximizedPanel}
              </MaximizedPanel>
            </div>
          : null}
      </div>

      <div className={styles.panelSidebar}>
        <Panel title="Procedures"
            className={styles.panel}
            TitleComponentSecondary={procedures.PanelActions}>
          <panels.procedures.Compact
            procedures={revision.procedures || []}
            onSelect={selectProcedureIdx}
            selectedIdx={selectedProcedureIdx !== null ? selectedProcedureIdx : undefined}
            onAdd={isLatestRevision ? handleAddProcedure : undefined}
            onDelete={isLatestRevision ? handleDeleteProcedure : undefined}
          />
        </Panel>

        <MaximizablePanel
          Compact={panels.criteria.Compact}
          Maximized={panels.criteria.Full}
          onMinimize={minimizePanel}
          isCollapsible
          props={{
            impliedCriteria: selectedProcedure ? revision.activationCriteria : undefined,
            criteria: selectedProcedure ? selectedProcedure.activationCriteria : revision.activationCriteria,
            onUpdate: isLatestRevision ? handleUpdateCriteria : undefined,
          }}
          {...panelProps(`${selectedProcedure ? 'Procedure' : 'Plan'} activation criteria`)} />

        <MaximizablePanel
          Compact={panels.roles.Compact}
          Maximized={panels.roles.Full}
          onMinimize={minimizePanel}
          props={{
            roles: (selectedProcedure ? selectedProcedure.roles : revision.roles) || [],
            onUpdate: isLatestRevision ? handleUpdateRoles : undefined,
          }}
          {...panelProps(`${selectedProcedure ? 'Procedure' : 'Plan'} roles`)} />

        <MaximizablePanel
          Compact={panels.resources.Compact}
          Maximized={panels.resources.Full}
          onMinimize={minimizePanel}
          props={{
            resources: (selectedProcedure ? selectedProcedure.requiredResources : revision.requiredResources) || [],
            onUpdate: isLatestRevision ? handleUpdateResources : undefined,
          }}
          {...panelProps(`Required resources for the ${selectedProcedure ? 'procedure' : 'plan'}`)} />
      </div>
    </div>
  );
};


const MaximizedPanel: React.FC<{ onMinimize: () => void }> = function ({ onMinimize, children }) {
  return (
    <>
      <CloseSheetButton onClose={onMinimize} />
      {children}
    </>
  );
};


const CloseSheetButton: React.FC<{ onClose: () => void }> = function ({ onClose }) {
  return <Button
    small
    minimal
    icon="minimize"
    className={styles.closeSheetButton}
    onClick={(evt: React.FormEvent) => onClose()}
  />;
};


interface MaximizeButtonProps {
  isMaximized: boolean
  onToggle: () => void 
}
const MaximizeButton: React.FC<MaximizeButtonProps> = function ({ isMaximized, onToggle }) {
  return <Button
    small
    minimal
    icon={isMaximized ? "minimize" : "maximize"}
    active={isMaximized}
    onClick={(evt: React.FormEvent) => { evt.stopPropagation(); onToggle(); }}
  />;
};


interface PlanSummaryProps {
  plan: Plan
  revision: PlanRevision
  onPlanUpdate: (plan: Plan) => void
  onRevisionUpdate?: (revision: PlanRevision) => void
  collapsed: boolean 
}
const PlanSummary: React.FC<PlanSummaryProps> =
function ({ plan, revision, onPlanUpdate, onRevisionUpdate, collapsed }) {
  const [name, setName] = useState<string>(plan.name);
  const [purpose, setPurpose] = useState<string | undefined>(plan.purpose);
  const [scope, setScope] = useState<string | undefined>(revision.scope);

  const [ready, setReady] = useState(false);
  // Workaround EditableText not recalculating height
  // when switching between plans

  useEffect(() => {
    setReady(false);

    setName(plan.name);
    setPurpose(plan.purpose);
    setScope(revision.scope);

    setImmediate(() => setReady(true));
  }, [plan.id, JSON.stringify(revision)]);

  return (
    <div className={`${styles.planSummary} ${collapsed ? styles.sheetCollapsed : ''}`}>
      <H2>
        {collapsed
          ? <Text>{plan.name}</Text>
          : <EditableText
              confirmOnEnterKey
              selectAllOnFocus
              value={name}
              onChange={setName}
              onConfirm={(val) => onPlanUpdate({ ...plan, name: val.trim() })}
            />}
      </H2>

      <Text className={styles.planID} ellipsize>
        {plan.id}
      </Text>

      {!collapsed && ready
        ? <>
            <div title="Plan purpose" className={`${Classes.RUNNING_TEXT} ${styles.planPurpose}`}>
              <EditableText
                multiline
                minLines={2}
                maxLines={7}
                selectAllOnFocus
                value={purpose}
                placeholder="Enter plan purpose…"
                onChange={setPurpose}
                onConfirm={(val) => onPlanUpdate({ ...plan, purpose: val.trim() })}
              />
            </div>
            <div title="Plan scope" className={`${Classes.RUNNING_TEXT} ${styles.planScope}`}>
              <EditableText
                multiline
                minLines={2}
                maxLines={7}
                selectAllOnFocus
                value={scope}
                placeholder="Enter plan scope…"
                onChange={setScope}
                disabled={!onRevisionUpdate}
                onConfirm={(val) => onRevisionUpdate
                  ? onRevisionUpdate({ ...revision, scope: val.trim() })
                  : undefined}
              />
            </div>
          </>
        : null}
    </div>
  );
};