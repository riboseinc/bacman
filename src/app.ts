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
      verboseName: 'Concept database',
    }
  },

  help: {
    rootURL: 'https://geolexica.org/desktop/help/',
  },

  windows: {
    splash: {
      openerParams: {
        title: 'ISO/TC 211 Geolexica',
        frameless: true,
        dimensions: { width: 800, height: 500, minWidth: 800, minHeight: 500 },
      },
    },
    default: {
      openerParams: {
        title: 'ISO/TC 211 Geolexica Desktop',
        dimensions: { width: 1200, height: 700, minWidth: 800, minHeight: 500 },
      },
    },
    batchCommit: {
      openerParams: {
        title: 'ISO/TC 211 Geolexica Desktop: Commit changes',
        dimensions: { width: 800, height: 700, minWidth: 800, minHeight: 500 },
      },
    },
    settings: {
      openerParams: {
        title: 'ISO/TC 211 Geolexica Desktop Settings',
        dimensions: { width: 800, height: 500, minWidth: 800, minHeight: 500 },
      },
    },
  },
  settingsWindowID: 'settings',
};