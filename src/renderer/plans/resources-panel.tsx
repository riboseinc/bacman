import React, { useState, useEffect } from 'react';
import { Resource, RESOURCE_TYPES, ResourceType } from 'models';
import { Tree, Button, ITreeNode, H4, EditableText, HTMLSelect, IconName } from '@blueprintjs/core';
import styles from './plan-details.scss';

interface PanelProps {
  resources: Resource[]
  onUpdate?: (resources: Resource[]) => void
}


const RESOURCE_ICONS: { [K in ResourceType]: IconName } = {
  'information': 'search-around',
  'people': 'people',
  'utility': 'office',
  'equipment': 'oil-field',
  'funds': 'dollar',
  'transportation': 'train',
  'other': 'cube',
};


export const Compact: React.FC<PanelProps> = function ({ resources, onUpdate }) {
  return <ResourceTree resources={resources} onUpdate={onUpdate} />
};


export const Full: React.FC<PanelProps> = function ({ resources, onUpdate }) {
  return <>
    <H4>Required resources</H4>
    <ResourceTree resources={resources} onUpdate={onUpdate} />
  </>;
};


const BLANK_ITEM: Resource = { type: 'other', description: '' };


const ResourceTree: React.FC<PanelProps> =
function ({ resources, onUpdate }) {
  const [items, updateItems] = useState<Resource[]>(onUpdate
    ? [ ...resources, BLANK_ITEM ] : resources);

  useEffect(() => {
    updateItems(onUpdate ? [ ...resources, BLANK_ITEM ] : resources);
  }, [JSON.stringify(resources)]);

  function handleDeleteItem(idx: number) {
    updateItems((items) => {
      var newItems = [ ...items ];
      newItems.splice(idx, 1);
      setImmediate(() => onUpdate
        ? onUpdate(newItems.filter(r => r.description.trim() !== ''))
        : void 0);
      return newItems;
    });
  }

  function handleEdit(idx: number, _newItem: Partial<Resource>, commit?: boolean) {
    if (items[idx] === undefined) {
      return;
    }

    const newItem: Resource = { ...items[idx], ..._newItem };
    var newItems = [ ...items ];
    newItems[idx] = newItem;

    if (commit === true) {
      updateItems([ ...newItems.filter(r => r.description.trim() !== ''), BLANK_ITEM ]);
      onUpdate ? onUpdate(newItems.filter(r => r.description.trim() !== '')) : void 0;
    } else {
      updateItems(newItems);
    }
  }

  const nodes: ITreeNode[] = [ ...items.entries() ].map(([idx, r]): ITreeNode => {
    return {
      id: `role-${idx}`,
      icon: RESOURCE_ICONS[r.type],
      label: <div className={styles.resourceRow}>
        <HTMLSelect
          value={r.type}
          disabled={!onUpdate}
          onChange={(evt) => {
            handleEdit(
              idx,
              { type: evt.currentTarget.value as ResourceType },
              r.description.trim() !== '');
          }}
          options={RESOURCE_TYPES.map(rt => ({ value: rt }))} />
        <EditableText
          value={r.description}
          placeholder="Description"
          disabled={!onUpdate}
          onChange={(val) => handleEdit(idx, { description: val })}
          onConfirm={(val) => 
            handleEdit(idx, { description: val.trim() }, true)} />
      </div>,
      secondaryLabel: onUpdate && idx < items.length - 1
        ? <Button
            minimal small icon="cross"
            title="Unlist resource"
            tabIndex={-1}
            onClick={() => handleDeleteItem(idx)} />
        : null,
    };
  });

  return (
    <Tree contents={nodes} />
  );
}
