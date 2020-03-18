import { RendererConfig } from 'coulomb/config/renderer';
import { renderApp } from 'coulomb/app/renderer';
import { conf as appConf } from '../app';


export const conf: RendererConfig<typeof appConf> = {
  app: appConf,

  windowComponents: {

    default: () => import('./plans'),
    //editDrillPlan: () => import('./edit-drill-plan'),
    //performDrill: () => import('./perform-drill'),
    //editParticipants: () => import('./edit-participants'),

    //audit: () => import('./audit'),
    //viewDrillReport: () => import('./view-drill-report'),

    batchCommit: () => import('./batch-commit'),
    settings: () => import('coulomb/settings/renderer'),

  },

  databaseStatusComponents: {
    default: () => import('coulomb/db/isogit-yaml/renderer/status'),
  },
};


export const app = renderApp(conf);