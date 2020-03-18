import { ipcRenderer } from 'electron';
import React, { useState, useEffect } from 'react';

import { H2, NonIdealState, Checkbox, Button, Callout, TextArea, Toaster, Position, Popover } from '@blueprintjs/core';
import { callIPC, useIPCValue } from 'coulomb/ipc/renderer';

import { conf as appConf } from '../../app';
import { app } from '..';

import styles from './styles.scss';
import { Index } from 'coulomb/db/query';
import { Model } from 'coulomb/db/models';


export const WindowToaster = Toaster.create({
  className: "window-toaster",
  position: Position.BOTTOM,
});


type AnyIDType = string | number;

type AppConf = typeof appConf;
type Models = AppConf["data"];
type ModelNames = keyof AppConf["data"];


interface ModifiedFileOverviewProps<M extends Model> {
  items: M[],
  selectedItems: any[],
  onSelect: (objID: AnyIDType) => void,
}


/* Per content type definitions of modified file listing components. */

const modifiedFileListing: { [M in ModelNames]: React.FC<ModifiedFileOverviewProps<any>> } = {
  concepts: ({ items, selectedItems, onSelect }) => <>
    <H2>{items.length} modified {items.length !== 1 ? "concepts" : "concept"}</H2>

    <div className={styles.itemList}>
      {items.map(item => <ItemCard
        title={`${item.termid}: ${item.eng.term || '—'}`}
        onSelect={() => onSelect(item.termid)}
        isSelected={selectedItems.indexOf(item.termid) >= 0} />)}
    </div>
  </>,

  collections: ({ items, selectedItems, onSelect }) => <>
    <H2>{items.length} modified {items.length !== 1 ? "collections" : "collection"}</H2>

    <div className={styles.itemList}>
      {items.map(item => <ItemCard
        title={item.label}
        onSelect={() => onSelect(item.id)}
        isSelected={selectedItems.indexOf(item.id) >= 0} />)}
    </div>
  </>,
};


const models: (keyof Models)[] = [
  'concepts',
  'collections',
];


// selectedItems = { objType1: [id1, id2], objType2: [id3, id4] }
const initSelectedItems: { [M in ModelNames]: AnyIDType[] } =
  Object.assign({}, ...models.map(c => ({ [c]: [] })));


const Window: React.FC<{}> = function () {

  const modifiedConcepts = useIPCValue<{}, number[]>(`model-concepts-read-uncommitted-ids`, []);
  const modifiedCollections = useIPCValue<{}, string[]>(`model-collections-read-uncommitted-ids`, []);

  const modifiedIDs: { [M in ModelNames]: AnyIDType[] } = {
    concepts: modifiedConcepts.value,
    collections: modifiedCollections.value,
  };
  const objects: { [M in ModelNames]: Index<any> } = {
    concepts: app.useMany('concepts', {}).objects,
    collections: app.useMany('concepts', {}).objects,
  }


  const [selectedItems, updateSelectedItems] = useState(initSelectedItems);

  // Make sure selected items don’t contain IDs that are no longer modified.
  // Could happen e.g. after user discards or commits changes.
  useEffect(() => {
    var selectedValid = { ...selectedItems };
    for (const [modelName, items] of Object.entries(selectedValid)) {
      selectedValid[modelName] = items.filter(i => modifiedIDs[modelName].indexOf(i) >= 0);
    }
    updateSelectedItems(selectedValid);
  }, [JSON.stringify(modifiedIDs.concepts), JSON.stringify(modifiedIDs.collections)]);


  const [commitMessage, updateCommitMessage] = useState('');
  const [commitPromptIsOpen, toggleCommitPrompt] = useState(false);
  const [commitInProgress, updateCommitInProgress] = useState(false);

  const [discardingInProgress, updateDiscardingInProgress] = useState(false);
  const [discardConfirmationIsOpen, toggleDiscardConfirmation] = useState(false);


  function refreshModified() {
    modifiedConcepts.refresh();
    modifiedCollections.refresh();
  }

  const hasModifiedItems = Object.values(modifiedIDs).
    reduce((acc, val) => { return [ ...acc, ...Object.keys(val) ] }, [] as AnyIDType[]).length > 0;

  const hasSelectedItems = Object.values(selectedItems).
    reduce((acc, val) => [ ...acc, ...val ]).length > 0;

  const buttonsDisabled = !hasSelectedItems || commitPromptIsOpen || discardConfirmationIsOpen;


  /* Event handlers */

  function onSelect(modelName: keyof Models, id: AnyIDType) {
    var selected = selectedItems[modelName];
    const selectedIdx = selected.indexOf(id);
    if (selectedIdx >= 0) {
      selected.splice(selectedIdx, 1);
    } else {
      selected.push(id);
    }
    updateSelectedItems({ ...selectedItems, [modelName]: selected });
  }

  function handleCommitMessageChange(evt: React.FormEvent<HTMLElement>) {
    updateCommitMessage((evt.target as HTMLInputElement).value as string);
  }

  async function handleDiscard() {
    updateDiscardingInProgress(true);

    try {
      await Promise.all([...Object.entries(selectedItems).map(
        async ([modelName, objectIDs]: [keyof Models, AnyIDType[]]) =>
          await callIPC<{ objectIDs: AnyIDType[] }, { success: true }>
          (`model-${modelName}-discard-all-uncommitted`, { objectIDs })
      )]);
      refreshModified();
      await ipcRenderer.send('db-default-git-update-status');
    } catch (e) {
      WindowToaster.show({ intent: 'danger', message: "Error occured while discarding changes to selected items" });
      updateDiscardingInProgress(false);
      return;
    }

    updateDiscardingInProgress(false);
    toggleDiscardConfirmation(false);
  }

  async function handleCommit() {
    updateCommitInProgress(true);

    try {
      await Promise.all([...Object.entries(selectedItems).map(
        async ([modelName, objectIDs]: [keyof Models, AnyIDType[]]) =>
          await callIPC<{ objectIDs: AnyIDType[], commitMessage: string }, { success: true }>
          (`model-concepts-commit-objects`, { objectIDs, commitMessage })
      )]);
      refreshModified();
      await ipcRenderer.send('db-default-git-trigger-sync');
    } catch (e) {
      WindowToaster.show({ intent: 'danger', message: "Error occured while committing selected items" });
      updateCommitInProgress(false);
      return;
    }

    updateCommitInProgress(false);
    updateCommitMessage('');
    toggleCommitPrompt(false);
  }


  return (
    <div className={styles.batchCommitWindow}>
      <div className={styles.paneHeader}>
        <H2>Commit or Discard</H2>

        {hasModifiedItems
          ? <Callout icon="asterisk" intent="warning" title="Uncommitted changes present">
              Online synchronization is paused until you commit or discard these changes.
            </Callout>
          : null}
      </div>

      {hasModifiedItems
        ? <div className={styles.paneBody}>
            {models.
              filter(modelName => Object.keys(modifiedIDs[modelName]).length > 0).
              map(modelName => (
                <div className={styles.objectListing}>
                  {modifiedFileListing[modelName]({
                    items: modifiedIDs[modelName].map(objID => objects[modelName][objID]).filter(obj => obj !== undefined),
                    selectedItems: selectedItems[modelName],
                    onSelect: (objID: AnyIDType) => onSelect(modelName, objID),
                  })}
                </div>))}
          </div>
        : <NonIdealState title="No uncommitted changes found" icon="tick-circle" />}

      {hasModifiedItems
        ? <footer className={styles.actionFooter}>
            <Popover minimal={true} isOpen={discardConfirmationIsOpen} content={<div className={styles.actionPrompt}>
                <div className={styles.actionFooter}>
                  <Button onClick={() => { toggleDiscardConfirmation(false) }} icon="undo">Cancel</Button>
                  <Button intent="danger" loading={discardingInProgress} onClick={handleDiscard} icon="trash">Lose changes</Button>
                </div>
              </div>}>
              <Button
                  onClick={() => { toggleDiscardConfirmation(true); toggleCommitPrompt(false); }}
                  fill={true}
                  large={true}
                  disabled={buttonsDisabled}>
                Discard selected
              </Button>
            </Popover>
            <Popover minimal={true} isOpen={commitPromptIsOpen} content={<div className={styles.actionPrompt}>
                <TextArea value={commitMessage} growVertically={true} fill={true} placeholder="Describe your changes…" onChange={handleCommitMessageChange} />
                <div className={styles.actionFooter}>
                  <Button onClick={() => { toggleCommitPrompt(false); updateCommitMessage(''); }} icon="undo">Cancel</Button>
                  <Button intent="success" loading={commitInProgress} onClick={handleCommit} icon="git-commit">Commit changes</Button>
                </div>
              </div>}>
              <Button
                  fill={true}
                  onClick={() => { toggleCommitPrompt(true); toggleDiscardConfirmation(false); }}
                  intent={!buttonsDisabled ? "primary" : undefined}
                  large={true}
                  disabled={buttonsDisabled}>
                Commit selected
              </Button>
            </Popover>
          </footer>
        : null}
    </div>
  );
};


interface ItemCardProps {
  title: string,
  isSelected: boolean,
  onSelect: () => void,
  onEdit?: () => void,
}
const ItemCard: React.FC<ItemCardProps> = function ({ title, isSelected, onSelect, onEdit }) {
  return (
    <Checkbox checked={isSelected} onChange={onSelect} inline>
      <Button disabled={!onEdit} onClick={onEdit} icon="edit">{title}</Button>
    </Checkbox>
  );
};


export default Window;