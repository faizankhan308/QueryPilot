import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("GET /  (health route)", () => {
  it("returns 200 with status ok and service name", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "QueryPilot",
    });
  });

  it("returns Content-Type application/json", async () => {
    const response = await request(app).get("/");

    expect(response.headers["content-type"]).toMatch(/application\/json/);
  });

  it("returns 404 for unknown routes", async () => {
    const response = await request(app).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("detail");
  });
});
