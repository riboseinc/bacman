//import { Duration } from 'moment';


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
  endTime: Date

  report: BCDrillReport
}


/* Drill reporting */

interface BCDrillReport {
  followUpAction: string
  steps: BCDrillStepReport[]
  authors: BCDrillParticipant[]
}

interface BCDrillStepReport {
  plan: BCDrillStepPlan

  responsible: BCDrillParticipant[]
  participants: BCDrillParticipant[]
  result: string
  type: BCDrillType
  startTime: Date
  endTime: Date
}

type BCDrillType = 'Tabletop' | 'Live' | 'Discussion';


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