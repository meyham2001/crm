import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "../server/db";
import * as repo from "../server/repo";

let db: DB;

beforeEach(() => {
  db?.close();
  db = openDb(":memory:");
});

describe("deal stage changes", () => {
  it("moves a deal through stages", () => {
    const deal = repo.createDeal(db, { name: "Journey", value: 10000, probability: 20 });
    for (const stage of ["qualified", "proposal", "negotiation"] as const) {
      const updated = repo.updateDeal(db, deal.id, { stage });
      expect(updated.stage).toBe(stage);
    }
  });

  it("marks a deal Won: probability locks to 100 and close date is stamped if missing", () => {
    const deal = repo.createDeal(db, { name: "Winner", value: 5000, probability: 30 });
    const won = repo.updateDeal(db, deal.id, { stage: "won" });
    expect(won.stage).toBe("won");
    expect(won.probability).toBe(100);
    expect(won.close_date).toBe(new Date().toISOString().slice(0, 10));
    // A pre-existing close date is preserved.
    const deal2 = repo.createDeal(db, { name: "Winner 2", value: 100, close_date: "2026-01-15" });
    expect(repo.updateDeal(db, deal2.id, { stage: "won" }).close_date).toBe("2026-01-15");
  });

  it("marks a deal Lost: probability locks to 0", () => {
    const deal = repo.createDeal(db, { name: "Loser", value: 5000, probability: 60 });
    const lost = repo.updateDeal(db, deal.id, { stage: "lost" });
    expect(lost.stage).toBe("lost");
    expect(lost.probability).toBe(0);
  });

  it("stage changes persist (re-read from the database)", () => {
    const deal = repo.createDeal(db, { name: "Sticky" });
    repo.updateDeal(db, deal.id, { stage: "negotiation" });
    expect(repo.getDeal(db, deal.id).stage).toBe("negotiation");
  });

  it("won deals count into the monthly dashboard figures", () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const deal = repo.createDeal(db, { name: "This month win", value: 12345 });
    repo.updateDeal(db, deal.id, { stage: "won" });
    const dash = repo.getDashboard(db);
    const current = dash.wonByMonth.find((m) => m.key === thisMonth)!;
    expect(current.count).toBe(1);
    expect(current.revenue).toBe(12345);
    expect(dash.kpis.wonThisMonthCount).toBe(1);
    expect(dash.kpis.wonThisMonthRevenue).toBe(12345);
  });

  it("expected revenue reflects value x probability for open deals only", () => {
    repo.createDeal(db, { name: "Open", value: 10000, probability: 50 });
    const won = repo.createDeal(db, { name: "Closed won", value: 8000, probability: 50 });
    repo.updateDeal(db, won.id, { stage: "won" });
    const dash = repo.getDashboard(db);
    expect(dash.kpis.expectedValue).toBe(5000); // only the open deal is weighted
    const wonRow = dash.pipeline.find((p) => p.stage === "won")!;
    expect(wonRow.total).toBe(8000);
    expect(wonRow.expected).toBe(0); // won revenue is real, not "expected"
  });
});

describe("activities as tasks", () => {
  it("adds an activity to a contact and to a deal", () => {
    const contact = repo.createContact(db, { name: "C" });
    const deal = repo.createDeal(db, { name: "D" });
    const a1 = repo.createActivity(db, { contact_id: contact.id, description: "about the contact" });
    const a2 = repo.createActivity(db, { deal_id: deal.id, description: "about the deal" });
    expect(repo.listActivities(db, { contactId: contact.id }).map((a) => a.id)).toEqual([a1.id]);
    expect(repo.listActivities(db, { dealId: deal.id }).map((a) => a.id)).toEqual([a2.id]);
    // An activity can link both.
    const both = repo.createActivity(db, { contact_id: contact.id, deal_id: deal.id, description: "both" });
    expect(both.contact_name).toBe("C");
    expect(both.deal_name).toBe("D");
  });

  it("toggles task completion back and forth", () => {
    const contact = repo.createContact(db, { name: "Tasky" });
    const task = repo.createActivity(db, {
      contact_id: contact.id,
      description: "Follow up",
      due_date: "2027-06-01"
    });
    expect(task.done).toBe(false);
    expect(repo.updateActivity(db, task.id, { done: true }).done).toBe(true);
    expect(repo.updateActivity(db, task.id, { done: false }).done).toBe(false);
  });

  it("overdue open tasks surface on the dashboard", () => {
    const contact = repo.createContact(db, { name: "Overdue" });
    const past = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const future = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    repo.createActivity(db, { contact_id: contact.id, description: "late", due_date: past });
    repo.createActivity(db, { contact_id: contact.id, description: "soon", due_date: future });
    const done = repo.createActivity(db, { contact_id: contact.id, description: "done late", due_date: past });
    repo.updateActivity(db, done.id, { done: true });

    const dash = repo.getDashboard(db);
    expect(dash.kpis.overdueTaskCount).toBe(1);
    expect(dash.tasks.map((t) => t.description)).toEqual(["late", "soon"]); // overdue first
  });
});
