# Module Isolation Framework

## Critical Context

A serious incident occurred where changes to one module inadvertently affected another, resulting in lost functionality. This framework ensures such incidents never recur by enforcing strict module isolation.

## Core Priorities

### P0 - Module Isolation (Never Skip)
- Each module must be self-contained
- Changes to one module must NOT modify imports or code in other modules
- Dashboard integration points must remain untouched unless explicitly working on them
- Module routing structure must stay intact
- Never remove or modify shared components without explicit approval

### P1 - Dashboard Integrity
- Dashboard must continue to render all module entry points
- Navigation between modules must remain functional
- Module lazy loading patterns must be preserved
- State management connections must stay intact
- Shared layouts must remain consistent

### P2 - Module-Specific Changes
- Keep changes contained within the target module's directory
- Preserve existing prop interfaces between module and dashboard
- Maintain module-specific routing patterns
- Keep module-specific state management isolated
- Document any new dependencies added to the module

## Quick Safety Checklist
- MODULE ISOLATION: Check working directory matches target module
- DASHBOARD HEALTH: Verify dashboard still renders correctly
- NAVIGATION: Test routes to and from modified module
- DEPENDENCIES: Confirm no unintended changes to package.json
- STATE: Verify state management remains isolated

## Risk Areas

### Component Dependencies
- Never modify shared components without review
- Keep new components within module directory
- Use composition over modification for shared component changes

### Routing Structure
- Preserve existing route patterns
- Don't modify parent routes when working on child routes
- Keep lazy loading boundaries intact

### State Management
- Maintain clear state boundaries between modules
- Don't modify global state when working on local state
- Keep module state contained within its directory

### Package Dependencies
- Add new dependencies only to relevant module
- Document shared dependency changes
- Watch for dependency version conflicts

## When Issues Occur
1. Immediately record which files were modified
2. Check git diff for unintended changes
3. Review module boundaries
4. Document any required cross-module changes
5. Seek review for changes affecting multiple modules

## Key Principles

### BOUNDARIES
- Clear module separation
- Explicit integration points
- Documented dependencies

### VERIFICATION
- Test module in isolation
- Verify dashboard integration
- Check other modules remain functional

### DOCUMENTATION
- Note cross-module dependencies
- Document integration points
- Track shared component usage

Remember: Modules should be "black boxes" that connect only through well-defined interfaces. When in doubt, err on the side of isolation.