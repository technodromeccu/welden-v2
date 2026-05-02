import assert from "node:assert/strict";

type Step = {
  name: string;
  run: () => Promise<void>;
};

type DashboardSnapshot = {
  dashboardSummary?: unknown;
  advisorSessions?: unknown[];
  products?: unknown[];
  productDrafts?: unknown[];
  siteSections?: unknown[];
  knowledgeDocuments?: unknown[];
  quotationTemplates?: unknown[];
  users?: unknown[];
  settings?: Record<string, unknown>;
};

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? "admin@welden.example";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? "WeldenAdmin!2026";

let sessionCookie = "";

function captureSessionCookie(response: Response) {
  const setCookieHeader = response.headers.get("set-cookie");
  if (!setCookieHeader) {
    return;
  }

  const cookiePair = setCookieHeader.split(";")[0]?.trim();
  if (cookiePair) {
    sessionCookie = cookiePair;
  }
}

async function request(path: string, init: RequestInit = {}, authenticated = false) {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (authenticated && sessionCookie) {
    headers.set("Cookie", sessionCookie);
  }

  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers,
    redirect: "manual"
  });

  captureSessionCookie(response);
  return response;
}

async function readJson<T>(response: Response) {
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error(`Expected JSON but received: ${body.slice(0, 200)}${body.length > 200 ? "..." : ""}`, { cause: error });
  }
}

const viewAssertions: Array<{
  view: string;
  assertSnapshot: (snapshot: DashboardSnapshot) => void;
}> = [
  {
    view: "dashboard",
    assertSnapshot: (snapshot) => {
      assert.ok(snapshot.dashboardSummary, "dashboardSummary should be present");
    }
  },
  {
    view: "leads",
    assertSnapshot: (snapshot) => {
      assert.ok(Array.isArray(snapshot.advisorSessions), "advisorSessions should be an array");
      assert.ok(Array.isArray(snapshot.users), "users should be available for leads");
    }
  },
  {
    view: "machines",
    assertSnapshot: (snapshot) => {
      assert.ok(Array.isArray(snapshot.products), "products should be an array");
      assert.ok(Array.isArray(snapshot.productDrafts), "productDrafts should be an array");
    }
  },
  {
    view: "site content",
    assertSnapshot: (snapshot) => {
      assert.ok(Array.isArray(snapshot.siteSections), "siteSections should be an array");
    }
  },
  {
    view: "quotation templates",
    assertSnapshot: (snapshot) => {
      assert.ok(Array.isArray(snapshot.quotationTemplates), "quotationTemplates should be an array");
      assert.ok(Array.isArray(snapshot.products), "products should be available for quotations");
    }
  },
  {
    view: "knowledge base",
    assertSnapshot: (snapshot) => {
      assert.ok(Array.isArray(snapshot.knowledgeDocuments), "knowledgeDocuments should be an array");
    }
  },
  {
    view: "users",
    assertSnapshot: (snapshot) => {
      assert.ok(Array.isArray(snapshot.users), "users should be an array");
    }
  },
  {
    view: "settings",
    assertSnapshot: (snapshot) => {
      assert.ok(snapshot.settings && typeof snapshot.settings === "object", "settings should be present");
      assert.ok(Array.isArray(snapshot.users), "users should be available for settings");
    }
  }
];

const steps: Step[] = [
  {
    name: "public home page responds",
    run: async () => {
      const response = await request("/", { headers: { Accept: "text/html" } });
      assert.equal(response.status, 200);
    }
  },
  {
    name: "unauthenticated dashboard api is blocked",
    run: async () => {
      const response = await request("/api/dashboard?view=dashboard");
      assert.equal(response.status, 401);
    }
  },
  {
    name: "admin login succeeds",
    run: async () => {
      const response = await request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword
        })
      });
      assert.equal(response.status, 200);
      assert.ok(sessionCookie, "login should set a session cookie");
      const payload = await readJson<{ user?: { email?: string; role?: string } }>(response);
      assert.equal(payload.user?.email, adminEmail);
      assert.equal(payload.user?.role, "admin");
    }
  },
  {
    name: "authenticated session endpoint returns the admin user",
    run: async () => {
      const response = await request("/api/auth/session", {}, true);
      assert.equal(response.status, 200);
      const payload = await readJson<{ user?: { email?: string; role?: string } | null }>(response);
      assert.equal(payload.user?.email, adminEmail);
      assert.equal(payload.user?.role, "admin");
    }
  },
  {
    name: "authenticated admin page loads",
    run: async () => {
      const response = await request("/admin", { headers: { Accept: "text/html" } }, true);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes("Welden Industries"), "admin html should include the admin shell");
    }
  },
  ...viewAssertions.map((entry) => ({
    name: `authenticated dashboard view "${entry.view}" loads`,
    run: async () => {
      const response = await request(`/api/dashboard?view=${encodeURIComponent(entry.view)}`, {}, true);
      assert.equal(response.status, 200);
      const payload = await readJson<DashboardSnapshot>(response);
      entry.assertSnapshot(payload);
    }
  }))
];

let failures = 0;

for (const step of steps) {
  try {
    await step.run();
    console.log(`PASS ${step.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${step.name}`);
    console.error(error instanceof Error ? error.stack ?? error.message : error);
  }
}

if (failures > 0) {
  console.error(`\n${failures} smoke step(s) failed against ${baseUrl}.`);
  process.exit(1);
}

console.log(`\n${steps.length} smoke step(s) passed against ${baseUrl}.`);
