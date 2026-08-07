# Self-Improvement Step

IMPORTANT: You MUST complete this step before stopping.

1. Look back at your work in building this project, including any challenges you encountered,
   bugs you hit and feedback you received.
2. Identify the strengths and weaknesses.
3. Self-improvement: Update PROCESS.md to factor in your learnings so that your process is
   improved in the future.
4. Recursive self-improvement: Update this file SELF_IMPROVE.md so that you are more effective
   at self-improvement in the future.

IMPORTANT: You MUST include step 4, recursive self-improvement. Every time you run, this document
should be taken to the next level based on your learnings.

---

## How to self-improve effectively (meta-learnings, refined each run)

Do the reflection in this structured way — it produced better updates than free-form notes:

1. **Categorize every learning** before writing it down:
   (a) environment/tooling (npm, shell, permissions, browser automation),
   (b) app architecture/design, (c) verification (how bugs were actually caught),
   (d) review handling. Put (a)–(d) into the PROCESS.md playbook; keep only *meta* guidance here.
2. **Write learnings as executable instructions**, with the exact command or pattern that fixes the
   problem ("use `pkill -f "x[.]y"`", "detach with `setsid nohup … < /dev/null &`"), never as vague
   advice ("be careful with processes"). A future run must be able to copy-paste.
3. **Record the detection method** for each bug (unit test / browser screenshot / numeric check /
   product review). If a class of bug was only caught late (e.g. seed-data realism was caught by
   eyeballing screenshots, not tests), add an earlier check for it next time — that is how the
   "inspect every screenshot yourself" and "scrollWidth === clientWidth" checks entered the process.
4. **Prune, don't just append.** Re-read the existing PROCESS.md playbook first; merge duplicates,
   delete advice that proved wrong or obsolete, and keep the playbook short enough that a fresh
   agent actually reads it. Growth without pruning degrades the process.
5. **Distinguish durable vs project-specific.** Shell/browser/npm quirks are durable; facts like
   port numbers or record types belong to REQUIREMENTS.md and should only be referenced, not
   duplicated, in PROCESS.md.
6. **Close the loop:** after editing PROCESS.md, re-read it once as if you were a brand-new agent
   and ask "could I execute this without guessing?" Fix any step that fails that question.
7. **Tool-quirk discipline:** before concluding the *app* is broken, reproduce with real user
   events (keyboard/mouse) — automation tools have their own bugs (e.g. `fill ""` not triggering
   React onChange). Log such quirks in the playbook so future runs don't re-diagnose them.
