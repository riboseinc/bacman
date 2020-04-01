export interface SubjectToActivationCriteria {
  activationCriteria: CriteriaGroup
}

export function makeBlankCriteria(): CriteriaGroup {
  return { require: 'all', criteria: [] }
};

export interface SubjectToResourceAvailability {
  requiredResources: Resource[]
}

export type Role = { role: string, responsibility?: string };

export interface CriteriaGroup {
  require: 'all' | 'any' | 'none'
  criteria: (CriteriaGroup | string)[]
}


export interface PlanRevision extends SubjectToActivationCriteria, SubjectToResourceAvailability {
  timeCreated: Date

  scope?: string

  roles?: Role[]
  // { roleName: responsibility? }

  objectives?: string[]
  // Measures of successs

  procedures?: PlannedProcedure[]
}
export function makeBlankPlanRevision(): PlanRevision {
  return {
    activationCriteria: { require: 'all', criteria: [] },
    requiredResources: [],
    timeCreated: new Date(),
  };
}


export interface Plan {
  id: string
  // Based on name

  name: string
  purpose?: string

  revisions: PlanRevision[]
  retired?: true
}


export const RESOURCE_TYPES = [
  'people',
  'information',
  'utility',
  'equipment',
  'transportation',
  'funds',
  'other',
] as const;

export type ResourceType = typeof RESOURCE_TYPES[number];


export interface Resource {
  type: ResourceType
  description: string
}


export const COMPOSITION_OPERATORS = [
  'all',
  'any',
  'none',
] as const;

export type CompositionOperator = typeof COMPOSITION_OPERATORS[number];


export const PROCEDURE_TYPES = [
  'activation',
  'communication',
  'implementation',
  'welfare-safety',
  'resumption',
  'escalation',
  'standdown',
  'other',
] as const;

export type ProcedureType = typeof PROCEDURE_TYPES[number];


export const PROCEDURE_TYPE_NAMES: { [K in ProcedureType]: string } = {
  'activation': "Activation",
  'communication': "Communication",
  'implementation': "Implementation",
  'welfare-safety': "Welfare and Safety",
  'resumption': "Resuming activities",
  'escalation': "Escalation",
  'standdown': "Standing down",
  'other': "Other",
}


export interface Procedure extends SubjectToActivationCriteria, SubjectToResourceAvailability {
  type: ProcedureType
  // TODO: Name clash with blueprint names is possible, make blueprint only?
  name: string
  steps: ProcedureStep[]
}


export interface PlannedProcedure extends Procedure {
  blueprintID?: string
  // A procedure created from blueprint or saved as blueprint
  // is linked to that blueprint forever via ID.

  roles?: Role[]
  // { roleName: responsibility? }
}


export interface ProcedureStep {
  action: string
  timeAllocated?: number
}


export interface ProcedureBlueprint extends Procedure {
  id: string
}



export interface TimedReport {
  startTime: Date
  endTime?: Date
  result: string
  followUpAction: string
}

export interface DrillReport extends TimedReport {
  stepResults: (TimedReport & ProcedureStep)[]

  followUpAction: string
  authors: string
}

export interface PlanAudit {
  planID: string
  reviewedProcedureNames: string[]
}

export interface Audit extends TimedReport {
  scope: {
    startTime: Date
    endTime: Date
    items: 'drills' | 'plans'
  }

  // Automatic
  problemsFound: string[]

  // Manual
  plans: PlanAudit[]
  followUpAction: string
  authors: string
}


/* Legacy */

export interface BCActivity {
  id: string
  // Auto-generated from description

  description: string

  retired?: true
}

export interface BCPlan {
  id: string
  // Auto: <activityID>-<purpose>

  activityID: string
  purpose: string
  drillPlan?: BCDrillPlanRevision[]

  retired?: true
}

export interface BCDrillParticipant {
  id: string
  // Auto-generated from name

  name: string

  retired?: true

  // TODO: (?) photo, role
}

export interface BCDrill {
  id: string
  // Automatic: <bcPlanID>-<bcDrillPlanRevisionID>-<startTime>

  bcPlanID: string
  bcDrillPlanRevisionID: number
  startTime: Date
  endTime?: Date

  report: BCDrillReport
}


/* Drill reporting */

export interface BCDrillReport {
  followUpAction: string
  steps: BCDrillStepReport[]
  authors: BCDrillParticipant[]
}

export interface BCDrillStepReport {
  plan: BCDrillStepPlan

  responsible: BCDrillParticipant[]
  participants: BCDrillParticipant[]
  result: string
  activityType: BCDrillActivityType
  startTime?: Date
  endTime?: Date
}

export type BCDrillActivityType = 'Tabletop' | 'Live' | 'Discussion';


/* Drill planning */

export interface BCDrillPlanRevision {
  resourceRequirements: BCDrillResourceRequirement[]
  preparationSteps: BCDrillPreparationStep[]
  steps: BCDrillStepPlan[]


  // Newest drill plan for given BC plan is considered the one in effect.
  // Revisions are numbered automatically.

  timeCreated: string
  // ISO date

  revisionID: number
}

export interface BCDrillResourceRequirement {
  description: string
}

export interface BCDrillPreparationStep {
  description: string
}

export interface BCDrillStepPlan {
  description: string

  timeAllowed: string
  // ISO 8601 duration string
}