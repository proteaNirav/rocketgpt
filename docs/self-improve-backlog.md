
# RocketGPT – Self-Improve Backlog (Specification)

This document explains how `config/self_improve_backlog.json` is used to plan, select, and track self-improvements for RocketGPT.

---

## 1. Backlog File

**Location:**  
`config/self_improve_backlog.json`

**Structure Example:**

```json
{
  "backlog": [
    {
      "id": "IMP-0001",
      "title": "Improve dashboard responsiveness",
      "description": "Analyze the main dashboard layout and refactor components to work better on mobile and tablet viewports.",
      "status": "pending",
      "priority": "medium",
      "created_at": "2025-11-14T18:17:55.0247199+05:30"
    }
  ]
}
```

---

## 2. Fields Explained

### **id**
A unique identifier for the improvement (e.g., `IMP-0001`, `IMP-0002`).

### **title**
Short summary of the improvement.

### **description**
Detailed explanation of what needs to be changed, fixed, or enhanced.

### **status**
Represents the improvement lifecycle:

| Status       | Meaning                                   |
|-------------|--------------------------------------------|
| `pending`     | Not started yet                            |
| `in_progress` | Work has started (coding, config, refactor)|
| `in_ci`       | Code pushed and CI/CD is running           |
| `in_review`   | PR created, waiting for approval           |
| `merged`      | PR merged into `main`                      |
| `verified`    | Final tests passed and improvement confirmed |
| `blocked`     | Cannot proceed (needs input/failure/dependency) |
| `abandoned`   | Dropped/replaced                           |

### **priority**
Determines selection order when self-improve runs:

- `high`
- `medium`
- `low`

### **created_at**
ISO 8601 timestamp when the improvement was added.

---

## 3. How RocketGPT Chooses the “Next Improvement”

When the self-improve workflow runs, it follows this algorithm:

1. Load `config/self_improve_backlog.json`.
2. Filter improvements where:
   - `status` = `pending`
   - (future logic: unblocked items)
3. Sort the list:
   1. **Priority**: `high` → `medium` → `low`
   2. **Oldest first** (FIFO inside same priority).
4. Select the top candidate — this becomes the **current improvement**.
5. When development begins:
   - Update its status to `in_progress`.
6. As progress continues:
   - `in_progress` → `in_ci` → `in_review` → `merged` → `verified`.
7. If something fails or needs your input:
   - Mark as `blocked`.

---

## 4. What You Will See in RocketGPT (Once Step 9.x Is Done)

RocketGPT will be able to show:

### **Current Improvement**
- The backlog item with status:
  - `in_progress`, `in_ci`, or `in_review`.

### **Next Improvement**
- First `pending` item based on:
  - highest priority  
  - oldest `created_at`.

### **Its Stage of Progress**
Based on its current `status`:
- Started?  
- Coded?  
- Built?  
- Deployed?  
- Tested?  
- Verified?  

---

## 5. Next Steps in Step 9.x

Later tasks will connect this backlog to:

- The `self_improve.yml` workflow  
- Automatic status updates  
- A helper for reading/writing status  
- Dashboard UI to display current + next improvements  

This document acts as the reference for all later automation.
