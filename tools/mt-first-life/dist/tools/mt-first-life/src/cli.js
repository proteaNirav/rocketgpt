import { seedBuilders } from "./builders.js";
import { createTaskFromDraft, getSurvivalState, governanceCheck, listBuilders, listEvidence, listTasks, runTask, setSurvivalState, showEvidence, showTask, systemInit, } from "./activation.js";
import { parseMtlFile } from "./mtl.js";
import { getStateFilePaths } from "./state.js";
function print(value) {
    console.log(JSON.stringify(value, null, 2));
}
async function main() {
    const [domain, action, ...rest] = process.argv.slice(2);
    if (!domain) {
        throw new Error("Usage: mt <system|builder|task|evidence|governance|survival> ...");
    }
    if (domain === "system" && action === "init") {
        await systemInit();
        print({ ok: true, stateFiles: getStateFilePaths() });
        return;
    }
    if (domain === "builder" && action === "seed") {
        print(await seedBuilders());
        return;
    }
    if (domain === "builder" && action === "list") {
        print(await listBuilders());
        return;
    }
    if (domain === "task" && action === "create") {
        const mtlIndex = rest.indexOf("--mtl");
        if (mtlIndex === -1 || !rest[mtlIndex + 1]) {
            throw new Error("mt task create --mtl <file>");
        }
        const draft = await parseMtlFile(rest[mtlIndex + 1]);
        print(await createTaskFromDraft(draft));
        return;
    }
    if (domain === "task" && action === "list") {
        print(await listTasks());
        return;
    }
    if (domain === "task" && action === "run") {
        const taskId = rest[0];
        if (!taskId) {
            throw new Error("mt task run <task-id>");
        }
        print(await runTask(taskId));
        return;
    }
    if (domain === "task" && action === "show") {
        const taskId = rest[0];
        if (!taskId) {
            throw new Error("mt task show <task-id>");
        }
        print(await showTask(taskId));
        return;
    }
    if (domain === "evidence" && action === "list") {
        print(await listEvidence());
        return;
    }
    if (domain === "evidence" && action === "show") {
        const taskId = rest[0];
        if (!taskId) {
            throw new Error("mt evidence show <task-id>");
        }
        print(await showEvidence(taskId));
        return;
    }
    if (domain === "governance" && action === "check") {
        const taskId = rest[0];
        if (!taskId) {
            throw new Error("mt governance check <task-id>");
        }
        print(await governanceCheck(taskId));
        return;
    }
    if (domain === "survival" && action === "state") {
        print(await getSurvivalState());
        return;
    }
    if (domain === "survival" && action === "set") {
        const state = rest[0];
        if (!state) {
            throw new Error("mt survival set <state>");
        }
        print(await setSurvivalState(state));
        return;
    }
    throw new Error("Unsupported mt command.");
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
