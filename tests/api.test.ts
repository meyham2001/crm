import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { openDb, type DB } from "../server/db";
import { createApp } from "../server/app";

let db: DB;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db?.close();
  db = openDb(":memory:");
  app = createApp(db);
});

describe("REST API", () => {
  it("supports the full organization lifecycle over HTTP", async () => {
    const created = await request(app)
      .post("/api/organizations")
      .send({ name: "HTTP Co", industry: "Testing" })
      .expect(201);
    const id = created.body.id;

    await request(app).get("/api/organizations").expect(200).then((res) => {
      expect(res.body.map((o: any) => o.name)).toContain("HTTP Co");
    });

    await request(app).patch(`/api/organizations/${id}`).send({ name: "HTTP Co Ltd" }).expect(200);

    await request(app).get(`/api/organizations/${id}`).expect(200).then((res) => {
      expect(res.body.name).toBe("HTTP Co Ltd");
    });

    await request(app).delete(`/api/organizations/${id}`).expect(204);
    await request(app).get(`/api/organizations/${id}`).expect(404);
  });

  it("validates input and returns helpful errors", async () => {
    await request(app).post("/api/organizations").send({}).expect(400).then((res) => {
      expect(res.body.error).toMatch(/name is required/i);
    });
    await request(app).post("/api/contacts").send({ name: "No Org", organization_id: 999 }).expect(400);
    await request(app).get("/api/organizations/12345").expect(404);
  });

  it("searches contacts via query string", async () => {
    await request(app).post("/api/contacts").send({ name: "Ada Lovelace", email: "ada@analytical.engine" }).expect(201);
    await request(app).post("/api/contacts").send({ name: "Grace Hopper", email: "grace@navy.mil" }).expect(201);

    await request(app).get("/api/contacts?search=ada").expect(200).then((res) => {
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Ada Lovelace");
    });
    await request(app).get("/api/contacts?search=navy.mil").expect(200).then((res) => {
      expect(res.body.map((c: any) => c.name)).toEqual(["Grace Hopper"]);
    });
    await request(app).get("/api/contacts?status=lead").expect(200).then((res) => {
      expect(res.body).toHaveLength(2);
    });
  });

  it("changes a deal's stage to Won and Lost via PATCH", async () => {
    const deal = await request(app).post("/api/deals").send({ name: "API Deal", value: 7500 }).expect(201);

    await request(app)
      .patch(`/api/deals/${deal.body.id}`)
      .send({ stage: "won" })
      .expect(200)
      .then((res) => {
        expect(res.body.stage).toBe("won");
        expect(res.body.probability).toBe(100);
        expect(res.body.close_date).toBeTruthy();
      });

    await request(app)
      .patch(`/api/deals/${deal.body.id}`)
      .send({ stage: "lost" })
      .expect(200)
      .then((res) => {
        expect(res.body.stage).toBe("lost");
        expect(res.body.probability).toBe(0);
      });

    await request(app).patch(`/api/deals/${deal.body.id}`).send({ stage: "sideways" }).expect(400);
  });

  it("adds activities and toggles task completion via PATCH", async () => {
    const contact = await request(app).post("/api/contacts").send({ name: "Busy Bee" }).expect(201);
    const activity = await request(app)
      .post("/api/activities")
      .send({ contact_id: contact.body.id, type: "call", description: "Check in", due_date: "2027-02-01" })
      .expect(201);
    expect(activity.body.done).toBe(false);

    await request(app)
      .patch(`/api/activities/${activity.body.id}`)
      .send({ done: true })
      .expect(200)
      .then((res) => expect(res.body.done).toBe(true));

    await request(app).post("/api/activities").send({ description: "no link" }).expect(400);
  });

  it("serves dashboard aggregates", async () => {
    const org = await request(app).post("/api/organizations").send({ name: "Dash Co" }).expect(201);
    await request(app)
      .post("/api/deals")
      .send({ name: "Dash deal", organization_id: org.body.id, value: 1000, probability: 50 })
      .expect(201);

    await request(app).get("/api/dashboard").expect(200).then((res) => {
      expect(res.body.kpis.openCount).toBe(1);
      expect(res.body.kpis.openValue).toBe(1000);
      expect(res.body.kpis.expectedValue).toBe(500);
      expect(res.body.wonByMonth).toHaveLength(6);
      expect(res.body.pipeline).toHaveLength(6);
      expect(res.body.recentActivities).toEqual([]);
      expect(res.body.tasks).toEqual([]);
    });
  });
});
