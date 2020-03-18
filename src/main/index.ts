import * as path from 'path';
import { app as electronApp } from 'electron';

import { MainConfig } from 'coulomb/config/main';
import { initMain } from 'coulomb/app/main';

//import { listen } from 'coulomb/ipc/main';
import { ManagerOptions } from 'coulomb/db/isogit-yaml/main/manager';
import { default as BackendCls } from 'coulomb/db/isogit-yaml/main/base';
import { default as ModelManagerCls } from 'coulomb/db/isogit-yaml/main/manager';

import { conf as appConf } from '../app';
import { BCActivity, BCPlan, BCDrill, BCDrillParticipant } from '../models';

const appDataPath = electronApp.getPath('userData');


export const conf: MainConfig<typeof appConf> = {
  app: appConf,

  singleInstance: true,
  disableGPU: true,

  appDataPath: appDataPath,
  settingsFileName: 'bacman-settings',

  databases: {
    default: {
      backend: BackendCls,
      options: {
        workDir: path.join(appDataPath, 'bacman-data'),
        corsProxyURL: 'https://cors.isomorphic-git.org',
        fsWrapperClass: async () => await import('coulomb/db/isogit-yaml/main/yaml/file'),
      },
    },
  },

  managers: {
    activity: {
      dbName: 'default',
      options: {
        cls: ModelManagerCls,
        workDir: 'activities',
        idField: 'id',
      } as ManagerOptions<BCActivity>,
    },
    plan: {
      dbName: 'default',
      options: {
        cls: ModelManagerCls,
        workDir: 'plans',
        idField: 'id',
      } as ManagerOptions<BCPlan>,
    },
    drill: {
      dbName: 'default',
      options: {
        cls: ModelManagerCls,
        workDir: 'drills',
        idField: 'id',
      } as ManagerOptions<BCDrill>,
    },
    participant: {
      dbName: 'default',
      options: {
        cls: ModelManagerCls,
        workDir: 'participants',
        idField: 'id',
      } as ManagerOptions<BCDrillParticipant>,
    },
  },
};


export const app = initMain(conf);