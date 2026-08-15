import { describe, expect, it } from "vitest";
import { filterNavForUser, NAV_ITEMS } from "@/config/nav";
import type { CurrentUser } from "@/lib/session";

function makeUser(permissions: string[]): CurrentUser {
  return {
    id: "u-1",
    email: "user@example.com",
    name: "User",
    image: null,
    kind: "USER",
    status: "ACTIVE",
    roleKeys: [],
    permissions: new Set(permissions),
  };
}

function labels(user: CurrentUser): string[] {
  return filterNavForUser(user).map((i) => i.label);
}

describe("filterNavForUser", () => {
  it("exposes every module to a user with all permissions", () => {
    const all = NAV_ITEMS.map((i) => i.label);
    const user = makeUser([
      "clients.view",
      "leads.view",
      "employees.view",
      "projects.view",
      "tasks.view",
      "time.view",
      "calendar.view",
      "messages.view",
      "approvals.view",
      "invoices.view",
      "reports.view",
      "settings.manage",
    ]);
    expect(labels(user)).toEqual(all);
  });

  it("hides modules the employee cannot access", () => {
    const employee = makeUser(["tasks.view"]);
    expect(labels(employee)).toEqual(["Dashboard", "Tasks"]);
  });

  it("shows billing when the user has any billing permission", () => {
    const withInvoices = makeUser(["invoices.view"]);
    expect(labels(withInvoices)).toContain("Billing");

    const withExpenses = makeUser(["expenses.view"]);
    expect(labels(withExpenses)).toContain("Billing");
  });

  it("hides settings without settings.manage", () => {
    const noSettings = makeUser(["clients.view", "projects.view", "tasks.view"]);
    expect(labels(noSettings)).not.toContain("Settings");
  });

  it("always includes the dashboard", () => {
    const user = makeUser([]);
    expect(labels(user)).toEqual(["Dashboard"]);
  });

  it("shows leads only with the leads.view permission", () => {
    const noLeads = makeUser(["clients.view"]);
    expect(labels(noLeads)).not.toContain("Leads");

    const withLeads = makeUser(["leads.view"]);
    expect(labels(withLeads)).toContain("Leads");
  });

  it("shows employees only with the employees.view permission", () => {
    const noEmployees = makeUser(["clients.view"]);
    expect(labels(noEmployees)).not.toContain("Employees");

    const withEmployees = makeUser(["employees.view"]);
    expect(labels(withEmployees)).toContain("Employees");
  });

  it("shows messages only with the messages.view permission", () => {
    const noMessages = makeUser(["tasks.view"]);
    expect(labels(noMessages)).not.toContain("Messages");

    const withMessages = makeUser(["messages.view"]);
    expect(labels(withMessages)).toContain("Messages");
  });

  it("shows time only with the time.view permission", () => {
    const noTime = makeUser(["tasks.view"]);
    expect(labels(noTime)).not.toContain("Time");

    const withTime = makeUser(["time.view"]);
    expect(labels(withTime)).toContain("Time");
  });

  it("shows calendar only with the calendar.view permission", () => {
    const noCalendar = makeUser(["tasks.view"]);
    expect(labels(noCalendar)).not.toContain("Calendar");

    const withCalendar = makeUser(["calendar.view"]);
    expect(labels(withCalendar)).toContain("Calendar");
  });

  it("shows approvals only with the approvals.view permission", () => {
    const noApprovals = makeUser(["tasks.view"]);
    expect(labels(noApprovals)).not.toContain("Approvals");

    const withApprovals = makeUser(["approvals.view"]);
    expect(labels(withApprovals)).toContain("Approvals");
  });
});
