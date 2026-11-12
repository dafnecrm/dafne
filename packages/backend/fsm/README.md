# @dafne/backend-fsm

State machines for a resource's records: `FsmModule.forFeature` gives a
feature module a `StateMachine` that moves records from one status to
another, as its `states` allow, running guards and hooks in one
transaction.

```ts
@Module({
  imports: [
    FsmModule.forFeature<SalesOrderStatus, number>({
      name: SALES_ORDER_STATE_MACHINE,
      transition: SalesOrderTransition,
      states: SALES_ORDER_STATES,
    }),
  ],
  providers: [SalesOrdersService], // injects it with @InjectStateMachine(SALES_ORDER_STATE_MACHINE)
})
export class SalesOrdersModule {}
```

## Where the guards and hooks come from

You don't register guards and hooks in any module: `forFeature` finds them
in `states` and provides them itself.

1. It collects every class in the `guards`, `pre` and `post` lists of
   `states`, once each.
2. It registers them, with `transition`, as providers of its own dynamic
   module, so Nest builds them and injects their constructor dependencies.
3. The machine's factory injects those instances and hands them to the
   `StateMachine` as a map from class to instance.
4. When a transition runs, the machine looks up the instances of the
   classes its config lists.

That's why `states` holds classes, not instances.

## `imports` and `providers`

The transition, guards and hooks live **in the FSM's dynamic module**,
not in the feature module that calls `forFeature`. Their dependencies must
be resolvable from there:

- **Global modules** are always visible. The database (the Drizzle token of
  `DatabaseModule`) is one, so nothing needs to be imported for it.
- **`imports`**: modules whose *exported* providers they inject, e.g.
  `imports: [CustomersModule]` for a guard that needs `CustomersService`.
- **`providers`**: other classes or values they inject that no module
  exports, e.g. `providers: [Rules]`.

What to keep in mind:

- The feature module's own providers **aren't visible**: a hook can't
  inject a service just because the feature module declares it. Listing it
  in `providers` creates a second instance.
- Nothing in `imports` or `providers` is exported: the module exports only
  the machine's token.
- Prefer querying through `ctx.tx` in guards and hooks: their reads and
  writes are then part of the transition's transaction.
