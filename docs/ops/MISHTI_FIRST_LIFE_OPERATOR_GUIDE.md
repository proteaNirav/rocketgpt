# Mishti AI First-Life Operator Guide

## Initialize State

Run:

```powershell
.\mt.cmd system init
```

This creates the first-life state files under `.mishti/`.

## Seed Builders

Run:

```powershell
.\mt.cmd builder seed
```

This registers the local first-life builders into `.mishti/builders.json`.

## Create a Task from MTL

Run:

```powershell
.\mt.cmd task create --mtl examples/mishti-first-life.mtl
```

The parser supports first-life `generate-document` declarations only.

## Run a Task

Run:

```powershell
.\mt.cmd task run <task-id>
```

A successful run routes to `doc-builder`, executes through the bounded sandbox runner, writes `docs/generated/first-life.md`, appends evidence, and marks the task `verified`.

## Inspect Evidence

List all evidence:

```powershell
.\mt.cmd evidence list
```

Show evidence for one task:

```powershell
.\mt.cmd evidence show <task-id>
```

## Inspect Governance

Run:

```powershell
.\mt.cmd governance check <task-id>
```

This shows the persisted first-life governance decision for the task.

## Test Survival Stop Behavior

Set safe mode:

```powershell
.\mt.cmd survival set safe_mode
```

Confirm state:

```powershell
.\mt.cmd survival state
```

Attempting `task run` while `safe_mode` is active will refuse execution.

Restore normal mode:

```powershell
.\mt.cmd survival set normal
```
