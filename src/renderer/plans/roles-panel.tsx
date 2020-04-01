import React, { useState, useEffect } from 'react';
import { Role } from 'models';
import { Tree, Button, ITreeNode, H4, EditableText } from '@blueprintjs/core';
import styles from './plan-details.scss';

interface PanelProps {
  roles: Role[]
  onUpdate?: (roles: Role[]) => void
}


export const Compact: React.FC<PanelProps> = function ({ roles, onUpdate }) {
  return <RoleTree roles={roles} onUpdate={onUpdate} />
};


export const Full: React.FC<PanelProps> = function ({ roles, onUpdate }) {
  return <>
    <H4>Roles and responsibilities</H4>
    <RoleTree roles={roles} onUpdate={onUpdate} />
  </>;
};


const BLANK_ITEM = { role: '', responsibility: '' };


const RoleTree: React.FC<PanelProps> =
function ({ roles, onUpdate }) {
  const [_roles, updateRoles] = useState<Role[]>(onUpdate
    ? [ ...roles, BLANK_ITEM ] : roles);

  useEffect(() => {
    updateRoles(onUpdate ? [ ...roles, BLANK_ITEM ] : roles);
  }, [JSON.stringify(roles)]);

  const sanitizedRoles = _roles.filter(r => r.role.trim() !== '');

  function handleDeleteItem(idx: number) {
    updateRoles((roles) => {
      var newRoles = [ ...roles ];
      newRoles.splice(idx, 1);
      setImmediate(() => onUpdate ? onUpdate(newRoles.filter(r => r.role.trim() !== '')) : void 0);
      return newRoles;
    });
  }

  function handleEditRole(idx: number, newItem: Partial<Role>, commit?: boolean) {
    if (_roles[idx] === undefined) {
      return;
    }

    const newRole = { ..._roles[idx], ...newItem };
    var newRoles = [ ..._roles ];
    newRoles[idx] = newRole;

    if (commit === true) {
      updateRoles([ ...sanitizedRoles, BLANK_ITEM ]);
      onUpdate ? onUpdate(sanitizedRoles) : void 0;
    } else {
      updateRoles(newRoles);
    }
  }

  const nodes: ITreeNode[] = [ ..._roles.entries() ].map(([idx, r]): ITreeNode => {
    return {
      id: `role-${idx}`,
      label: <div className={styles.roleRow}>
        <EditableText
          value={r.role}
          placeholder="New role…"
          disabled={!onUpdate}
          onChange={(val) => handleEditRole(idx, { role: val })}
          onConfirm={(val) => handleEditRole(idx, { role: val.trim() }, true)} />
        <EditableText
          value={r.responsibility}
          placeholder="Responsibility (opt.)"
          disabled={!onUpdate}
          onChange={(val) => handleEditRole(idx, { responsibility: val })}
          onConfirm={(val) => 
            handleEditRole(idx, { responsibility: val.trim() || undefined }, r.role.trim() !== '')} />
      </div>,
      secondaryLabel: onUpdate && idx < _roles.length - 1
        ? <Button
            minimal small icon="cross"
            title="Delete role"
            tabIndex={-1}
            onClick={() => handleDeleteItem(idx)} />
        : null,
      icon: 'person',
    };
  });

  return (
    <Tree contents={nodes} />
  );
}