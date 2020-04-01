import React, { useState, useEffect } from 'react';
import { CriteriaGroup, COMPOSITION_OPERATORS, CompositionOperator, makeBlankCriteria } from 'models';
import { Tree, Button, ITreeNode, H4, ButtonGroup, EditableText } from '@blueprintjs/core';
import styles from './plan-details.scss';

interface PanelProps {
  impliedCriteria?: CriteriaGroup
  criteria: CriteriaGroup
  onUpdate?: (criteria: CriteriaGroup) => void
}


export const Compact: React.FC<PanelProps> = function ({ impliedCriteria, criteria, onUpdate }) {
  return <CriteriaTree impliedCriteria={impliedCriteria} criteria={criteria} onUpdate={onUpdate} />;
};


export const Full: React.FC<PanelProps> = function ({ impliedCriteria, criteria, onUpdate }) {
  return <>
    <H4>Activation criteria</H4>
    <CriteriaTree impliedCriteria={impliedCriteria} criteria={criteria} onUpdate={onUpdate} />
  </>;
};


const CriteriaTree: React.FC<PanelProps> =
function ({ criteria, impliedCriteria, onUpdate }) {
  const [crit, updateCriteria] = useState<CriteriaGroup>(criteria);

  useEffect(() => {
    updateCriteria(criteria);
  }, [JSON.stringify(criteria)]);

  function onAddGroup(parent: number[]) {
    var p = JSON.parse(JSON.stringify(parent));
    p.reverse();
    var newCriteria = JSON.parse(JSON.stringify([crit]));
    const newGroup: CriteriaGroup = makeBlankCriteria();
    mutateGroup(newCriteria, p, { action: 'insert', item: newGroup });
    updateCriteria(newCriteria[0]);
    onUpdate!(newCriteria[0]);
  }

  function onDelete(parent: number[], idx: number) {
    var p = JSON.parse(JSON.stringify(parent));
    p.reverse();
    var newCriteria = JSON.parse(JSON.stringify([crit]));
    mutateGroup(newCriteria, p, { action: 'delete', idx });
    updateCriteria(newCriteria[0]);
    onUpdate!(newCriteria[0]);
  }

  function onEditItem(parent: number[], idx: number, newItem: CriteriaGroup | string, commit?: true) {
    var p = JSON.parse(JSON.stringify(parent));
    p.reverse();
    var newCriteria = JSON.parse(JSON.stringify([crit]));
    mutateGroup(newCriteria, p, { action: 'edit', idx, item: newItem });
    updateCriteria(newCriteria[0]);
    if (commit) {
      onUpdate!(newCriteria[0]);
    }
  }

  const nodes: ITreeNode[] = criteriaToNodes([crit], {
    onEditItem: onUpdate ? onEditItem : undefined,
    onAddGroup: onUpdate ? onAddGroup : undefined,
    onDeleteItem: onUpdate ? onDelete : undefined,
  });

  const implied: ITreeNode[] = impliedCriteria !== undefined
    ? criteriaToNodes([impliedCriteria], { implied: true })
    : [];

  return (
    <Tree contents={[ ...implied, ...nodes ]} />
  );
}


/* Displaying criteria group labels */

interface CriteriaGroupLabelProps {
  criteriaGroup: CriteriaGroup
  onUpdate?: (op: CompositionOperator) => void
}
const CriteriaGroupLabel: React.FC<CriteriaGroupLabelProps> = function ({ criteriaGroup, onUpdate }) {
  return <>
    {onUpdate
      ? <ButtonGroup className={styles.compoundOperatorChoice}>
          {COMPOSITION_OPERATORS.map(op =>
            <Button
                key={op}
                small
                onClick={() => onUpdate ? onUpdate(op) : void 0}
                active={criteriaGroup.require === op}>
              {op}
            </Button>
          )}
        </ButtonGroup>
      : <strong>{criteriaGroup.require}</strong>}
    {" "}
    of:
  </>;
}


/* Building tree nodes */

function criteriaToNodes(cs: (CriteriaGroup | string)[], opts: {
    path?: number[],
    implied?: true,
    onEditItem?: (parent: number[], idx: number, newItem: CriteriaGroup | string, commit?: true) => void,
    onDeleteItem?: (parent: number[], idx: number) => void,
    onAddGroup?: (parent: number[]) => void}): ITreeNode[] {

  const path = opts.path || [];

  return [ ...cs.entries() ].map(([idx, c]): ITreeNode => {
    const isRoot = path.length < 1;
    const icon = isRoot && opts.implied === true ? 'manual' : undefined;
    const disabled = opts.implied === true;
    const deleteButton: JSX.Element | null =
      idx < (cs.length - 1) &&
      opts.onDeleteItem &&
      !isRoot
      ? <Button minimal small
          onClick={() => opts.onDeleteItem!(path, idx)}
          icon="cross" />
      : null;

    if (c.hasOwnProperty('require')) {
      const cg = c as CriteriaGroup;
      return {
        id: `${path.join('-')}-${idx}-${opts.implied}`,
        disabled,
        hasCaret: true,
        isExpanded: true,
        icon,
        label: <CriteriaGroupLabel
          criteriaGroup={cg}
          onUpdate={opts.onEditItem
            ? ((op) => opts.onEditItem!(path, idx, { ...cg, require: op }, true))
            : undefined} />,
        secondaryLabel: <ButtonGroup>
          {opts.implied && isRoot ? <>(implied from plan)</> : null}
          {opts.onAddGroup
            ? <Button minimal small
                onClick={() => opts.onAddGroup!([...path, idx])}
                icon="more" />
            : null}
          {deleteButton}
        </ButtonGroup>,
        childNodes: criteriaToNodes(
          opts.onEditItem ? [ ...cg.criteria, '' ] : cg.criteria,
          { ...opts, path: [ ...path, idx ] }),
      };

    } else {
      const ci = c as string;
      return {
        id: `${path.join('-')}-${idx}-${opts.implied}`,
        disabled,
        icon,
        label: <EditableText
          value={ci}
          placeholder="Enter a criterion…"
          disabled={!opts.onEditItem}
          onChange={(val) => opts.onEditItem!(path, idx, val)}
          onConfirm={(val) => val.trim() !== '' ? opts.onEditItem!(path, idx, val.trim(), true) : void 0} />,
        secondaryLabel: <ButtonGroup>
          {deleteButton}
        </ButtonGroup>,
      };
    }
  });
}


/* Mutating criteria tree */

type TreeMutation<T> =
  { action: 'delete', idx: number } |
  { action: 'insert', item: T } |
  { action: 'edit', idx: number, item: T };

function mutateGroup(
    criteria: (CriteriaGroup | string)[],
    path: number[],
    // Here path must be parent node path in reverse (top-level index coming last).
    mutation: TreeMutation<CriteriaGroup | string>) {

  if (path.length < 1 && mutation.action === 'edit') {
    (criteria[0] as CriteriaGroup).require = (mutation.item as CriteriaGroup).require;
  }
  for (const [curIdx, c] of criteria.entries()) {
    if (curIdx === path[path.length - 1]) {
      path.pop();

      let cg: CriteriaGroup;
      if (c.hasOwnProperty('criteria')) {
        // This item is a group, let’s go in and delete descendants
        cg = c as CriteriaGroup;
      } else {
        // This item is a predicate string, can’t go in and delete descendants
        throw new Error(`Cannot enter item: not a group at path ${path.join('/')}/${curIdx}: ${c}`);
      }

      if (path.length > 0) {
        mutateGroup(cg.criteria, path, mutation);
      } else {
        if (mutation.action === 'delete') {
          cg.criteria.splice(mutation.idx, 1);
        } else if (mutation.action === 'insert') {
          cg.criteria.push(mutation.item);
        } else if (mutation.action === 'edit') {
          if (cg.criteria[mutation.idx] === undefined && mutation.idx === cg.criteria.length) {
            if (mutation.item.hasOwnProperty('require')) {
              console.error(cg.criteria, mutation);
              throw new Error("Won’t auto-insert new group");
            }
            // It may be that a new item is being appended
            cg.criteria.push(mutation.item);
          }
          const isGroup = cg.criteria[mutation.idx].hasOwnProperty('require');
          if (isGroup) {
            // If it’s a group, only change the predicate operator to preserve nested items:
            (cg.criteria[mutation.idx] as CriteriaGroup).require =
              (mutation.item as CriteriaGroup).require;
          } else {
            cg.criteria[mutation.idx] = mutation.item;
          }
        }
      }
    }
  }
}