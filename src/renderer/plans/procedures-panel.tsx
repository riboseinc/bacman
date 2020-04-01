import React, { useState, useContext, useEffect } from 'react';
import { PanelContext } from 'coulomb-panel/panel';
import { PlannedProcedure, PROCEDURE_TYPES, PROCEDURE_TYPE_NAMES, ProcedureType, makeBlankCriteria } from 'models';
import { Tree, Button, ITreeNode, Text, EditableText, NonIdealState, H3 } from '@blueprintjs/core';
import { NEW_LABEL_PLACEHOLDER } from './utils';


type IndexedProcedure = PlannedProcedure & { idx: number };
// Procedure with index in context of all plan procedures.

interface PanelState {
  canEdit?: boolean
  editMode?: boolean
}

interface PanelProps {
  procedures: PlannedProcedure[]
  selectedIdx?: number
  onSelect: (idx: number | null) => void 
  onAdd?: (procedure: PlannedProcedure) => void
  onDelete?: (idx: number) => void
}


export const title = "Procedures";


export const PanelActions: React.FC<{}> = function () {
  const panelCtx =
    useContext<{ state: PanelState, setState: (opts: PanelState) => void}>
    (PanelContext);

  const editMode = panelCtx.state.editMode === true;

  if (panelCtx.state.canEdit) {
    return <Button
      small minimal icon="edit"
      active={editMode}
      onClick={() => panelCtx.setState({ ...panelCtx.state, editMode: !editMode })} />;
  } else {
    return null;
  }
};


export const Compact: React.FC<PanelProps> =
function ({ procedures, selectedIdx, onSelect, onAdd, onDelete }) {
  const [selectedNodePath, selectNodePath] = useState<number[]>([]);

  const panelCtx =
    useContext<{ state: PanelState, setState: (opts: PanelState) => void}>
    (PanelContext);

  const editMode = panelCtx.state.editMode === true;

  useEffect(() => {
    if (onAdd === undefined) {
      panelCtx.setState({ editMode: false, canEdit: false });
    } else {
      panelCtx.setState({ ...panelCtx.state, canEdit: true });
    }
  }, [onAdd]);

  useEffect(() => {
    selectNodePath([]);
  }, [editMode]);

  if (editMode === false && procedures.length < 1) {
    return <NonIdealState description={onAdd
      ? <Button
            onClick={() => panelCtx.setState({ ...panelCtx.state, editMode: !editMode })}
            minimal icon="add">
          Click to add
        </Button>
      : "No procedures in plan"} />;
  }

  function handleNodeClick(node: ITreeNode, nodePath: number[]) {
    if (nodePath.length > 1) {
      const nodeData = node.nodeData as { procIdx?: number } | undefined;
      const procIdx = nodeData?.procIdx;
      if (procIdx !== undefined) {
        if (procIdx >= 0) {
          onSelect(procIdx);
          selectNodePath([]);
        } else if (procIdx === -1) {
          onSelect(null);
          selectNodePath(nodePath);
        }
      } else {
        onSelect(null);
      }
    }
  }

  function getProceduresForType(pt: ProcedureType): IndexedProcedure[] {
    return [...procedures.entries()].
      map(([idx, p]) => ({ ...p, idx })).
      filter(p => p.type === pt);
  }

  const nodes: ITreeNode[] =
    [...PROCEDURE_TYPES.filter(pt => editMode || getProceduresForType(pt).length > 0).entries()].
    map(([ptIdx, pt]): ITreeNode => {
      const typeIsSelected =
        selectedNodePath.length > 0 &&
        selectedNodePath[0] === ptIdx;

      const _procs: IndexedProcedure[] = getProceduresForType(pt);
      const procs: IndexedProcedure[] = editMode ? [..._procs, placeholderItem] : _procs;

      const childNodes: ITreeNode[] = [...procs.entries()].map(([idx, p]) => {
        const isPlaceholder =
          editMode &&
          p.name === NEW_LABEL_PLACEHOLDER;

        const isSelected =
          (typeIsSelected &&
          selectedNodePath.length > 1 &&
          selectedNodePath[1] === idx) || p.idx === selectedIdx;

        return {
          id: `procedure-${pt}-${idx}`,
          icon: isPlaceholder ? 'add' : 'clipboard',
          isSelected,
          nodeData: {
            procIdx: p.idx,
          },
          secondaryLabel: editMode && onDelete !== undefined && !isPlaceholder
            ? <Button minimal small icon="cross" onClick={(evt: React.FormEvent) => {
                evt.preventDefault();
                onDelete(p.idx);
                setImmediate(() => onSelect(null));
              }} />
            : null,
          label: isPlaceholder && isSelected && onAdd !== undefined
            ? <EditableText
                defaultValue=''
                isEditing={isSelected}
                placeholder="New procedure name"
                onConfirm={name => {
                  if (name.trim() !== '') {
                    onAdd({
                      name,
                      type: pt,
                      steps: [],
                      activationCriteria: makeBlankCriteria(),
                      requiredResources: [],
                    });
                  }
                }}
                confirmOnEnterKey={true}
                selectAllOnFocus={true}
              />
            : <Text ellipsize={true}>{p.name}</Text>,
        };
      });
      return {
        id: pt,
        icon: 'folder-open',
        label: PROCEDURE_TYPE_NAMES[pt],
        childNodes,
        isExpanded: true,
        hasCaret: false,
      };
    });

  return (
    <Tree contents={nodes} onNodeClick={handleNodeClick} />
  );
};


export const Full: React.FC<PanelProps> = function ({ procedures, onSelect }) {
  return <H3>Procedures</H3>;
};


const placeholderItem: IndexedProcedure = {
  name: NEW_LABEL_PLACEHOLDER,
  type: 'other',
  steps: [],
  activationCriteria: makeBlankCriteria(),
  requiredResources: [],
  idx: -1,
};