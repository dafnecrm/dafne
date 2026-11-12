import { Module, type DynamicModule, type ModuleMetadata, type Provider, type Type } from '@nestjs/common';
import { CrudHooksRegistry } from './crud-hooks.js';
import type { CrudHooksConfig } from './crud-hooks.types.js';

export interface CrudHooksFeatureOptions {
  /** Modules whose exported providers the hooks need. */
  imports?: ModuleMetadata['imports'];
  /** Other providers they need. */
  providers?: Provider[];
}

/** Every hook class in `hooks`, once each. */
function hookClasses(hooks: CrudHooksConfig): Type[] {
  const classes = new Set<Type>();
  for (const phases of Object.values(hooks)) {
    for (const type of [...(phases?.pre ?? []), ...(phases?.post ?? []), ...(phases?.afterCommit ?? [])]) {
      classes.add(type);
    }
  }
  return [...classes];
}

/** The module `forFeature` returns. */
@Module({})
class CrudHooksFeatureModule {}

/** Makes each `forFeature` registration's provider token unique. */
let registrations = 0;

/**
 * Hooks on the writes of CRUD resources. A resource's module imports
 * `CrudHooksModule` (its service gets `CrudHooksRegistry`); any module
 * adds hooks to a resource with
 * `CrudHooksModule.forFeature('customers', { delete: { pre: [NoOpenOrdersHook] } })`.
 * The hooks are its providers, built by Nest with their dependencies; the
 * registrations of several modules add up.
 */
@Module({
  providers: [CrudHooksRegistry],
  exports: [CrudHooksRegistry],
})
export class CrudHooksModule {
  static forFeature(resource: string, hooks: CrudHooksConfig, options: CrudHooksFeatureOptions = {}): DynamicModule {
    const { imports = [], providers = [] } = options;
    const classes = hookClasses(hooks);
    registrations += 1;

    return {
      module: CrudHooksFeatureModule,
      imports: [CrudHooksModule, ...imports],
      providers: [
        ...providers,
        ...classes,
        {
          provide: `dafne:crud-hooks:${resource}:${registrations}`,
          inject: [CrudHooksRegistry, ...classes],
          useFactory: (registry: CrudHooksRegistry, ...instances: unknown[]) => {
            registry.register(resource, hooks, new Map(classes.map((type, index) => [type, instances[index]])));
            return resource;
          },
        },
      ],
      exports: [CrudHooksModule],
    };
  }
}
