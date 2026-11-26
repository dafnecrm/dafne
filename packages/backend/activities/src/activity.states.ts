import type { StatesConfig } from '@dafne/backend-fsm';
import type { ActivityStatus } from '@dafne/contracts';

/** The activities' state machine, to inject with @InjectStateMachine. */
export const ACTIVITY_STATE_MACHINE = 'activity';

/**
 * The statuses an activity can move to: an open one is closed when done,
 * a closed one can be reopened. ActivityTransition sets (and clears) who
 * completed it and when.
 */
export const ACTIVITY_STATES: StatesConfig<ActivityStatus, number> = {
  open: {
    closed: {},
  },
  closed: {
    open: {},
  },
};
