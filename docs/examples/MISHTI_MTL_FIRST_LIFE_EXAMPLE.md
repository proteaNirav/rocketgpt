# Mishti Task Language Example

The first-life MTL surface is declarative and bounded. It does not support loops, arbitrary code, or general programming.

## Example

```text
TASK generate-document
TITLE "Mishti AI First Life"
TARGET "docs/generated/first-life.md"
CONTENT """
Mishti AI successfully executed its first governed task.
"""
```

Use it with:

```powershell
.\mt.cmd task create --mtl examples/mishti-first-life.mtl
```
