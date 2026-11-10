import type { Database } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import {
  Inject,
  Module,
  type DynamicModule,
  type ModuleMetadata,
  type Provider,
  type Type,
} from '@nestjs/common';
import type { StatesConfig } from './fsm.types.js';
import { StateMachine } from './state-machine.js';
import type { StateTransition } from './state-transition.js';

export interface StateMachineOptions<S extends string = string, Id = unknown> {
  /** The machine's name, to inject it with `@InjectStateMachine(name)`. */
  name: string;
  /** Reads and changes the records' status. */
  transition: Type<StateTransition<S, Id>>;
  /** The statuses each status can move to, with their aspects. */
  states: StatesConfig<S, Id>;
  /** Modules whose exported providers the transition, guards or hooks need. */
  imports?: ModuleMetadata['imports'];
  /** Other providers they need. */
  providers?: Provider[];
}

/** The injection token of the machine called `name`. */
export const getStateMachineToken = (name: string) => `dafne:fsm:${name}`;

/** Injects the `StateMachine` called `name`. */
export const InjectStateMachine = (name: string) => Inject(getStateMachineToken(name));

/** Every guard and hook class in `states`, once each. */
function aspectClasses(states: StatesConfig<string, unknown>): Type[] {
  const classes = new Set<Type>();
  for (const targets of Object.values(states)) {
    for (const config of Object.values(targets ?? {})) {
      for (const type of [...(config?.guards ?? []), ...(config?.pre ?? []), ...(config?.post ?? [])]) {
        classes.add(type);
      }
    }
  }
  return [...classes];
}

/**
 * State machines: `FsmModule.forFeature({ name, transition, states })` in a
 * feature module gives it a `StateMachine` for its records. The guards and
 * hooks are its providers, built by Nest with their dependencies. The
 * database is the global one (DatabaseModule).
 */
@Module({})
export class FsmModule {
  static forFeature<S extends string, Id>(options: StateMachineOptions<S, Id>): DynamicModule {
    const { name, transition, states, imports = [], providers = [] } = options;
    const aspects = aspectClasses(states as StatesConfig<string, unknown>);
    const token = getStateMachineToken(name);

    return {
      module: FsmModule,
      imports,
      providers: [
        ...providers,
        transition,
        ...aspects,
        {
          provide: token,
          inject: [getDrizzleToken(), transition, ...aspects],
          useFactory: (db: Database, instance: StateTransition<S, Id>, ...instances: unknown[]) =>
            new StateMachine<S, Id>(
              name,
              db,
              instance,
              states,
              new Map(aspects.map((type, index) => [type, instances[index]])),
            ),
        },
      ],
      exports: [token],
    };
  }
}
