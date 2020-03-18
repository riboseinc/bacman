import { AppConfig } from 'coulomb/config/app';


export const conf: AppConfig = {
  data: {
    activity: {
      shortName: 'activity',
      verboseName: 'business activity',
      verboseNamePlural: 'business activities',
    },
    plan: {
      shortName: 'plan',
      verboseName: 'business continuity plan',
      verboseNamePlural: 'business continuity plans',
    },
    drill: {
      shortName: 'drill',
      verboseName: 'business continuity drill',
      verboseNamePlural: 'business continuity drills',
    },
    participant: {
      shortName: 'participant',
      verboseName: 'business continuity drill participant',
      verboseNamePlural: 'business continuity drill participants',
    },
  },

  databases: {
    default: {
      verboseName: 'BC database',
    }
  },

  windows: {
    default: {
      openerParams: {
        title: 'Bacman',
        dimensions: { width: 1200, height: 700, minWidth: 800, minHeight: 500 },
      },
    },
    batchCommit: {
      openerParams: {
        title: 'Bacman: Commit changes',
        dimensions: { width: 800, height: 700, minWidth: 800, minHeight: 500 },
      },
    },
    settings: {
      openerParams: {
        title: 'Bacman Settings',
        dimensions: { width: 800, height: 500, minWidth: 800, minHeight: 500 },
      },
    },
  },
  settingsWindowID: 'settings',
};