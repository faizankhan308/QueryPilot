import { describe, it, expect } from "vitest";
import { validateReadOnlySql } from "../../src/database/safety.js";
import { UnsafeQueryError } from "../../src/database/exceptions.js";

describe("SQL Safety Validation", () => {
  it("allows safe SELECT queries", () => {
    expect(() => validateReadOnlySql("SELECT * FROM employees;")).not.toThrow();
    expect(() =>
      validateReadOnlySql("SELECT name, salary FROM employees ORDER BY salary DESC")
    ).not.toThrow();
    expect(() =>
      validateReadOnlySql("SELECT e.name, d.name FROM employees e JOIN departments d ON e.department_id = d.id")
    ).not.toThrow();
  });

  it("blocks DELETE queries", () => {
    expect(() => validateReadOnlySql("DELETE FROM employees;")).toThrow(UnsafeQueryError);
    expect(() => validateReadOnlySql("DELETE FROM employees;")).toThrow(
      "Only SELECT statements are allowed"
    );
  });

  it("blocks DROP queries", () => {
    expect(() => validateReadOnlySql("DROP TABLE employees;")).toThrow(UnsafeQueryError);
    expect(() => validateReadOnlySql("DROP TABLE employees;")).toThrow(
      "Only SELECT statements are allowed"
    );
  });

  it("blocks INSERT queries", () => {
    expect(() => validateReadOnlySql("INSERT INTO employees (name) VALUES ('Test');")).toThrow(
      UnsafeQueryError
    );
  });

  it("blocks UPDATE queries", () => {
    expect(() => validateReadOnlySql("UPDATE employees SET salary = 100;")).toThrow(
      UnsafeQueryError
    );
  });

  it("blocks stacked / multiple statements", () => {
    expect(() =>
      validateReadOnlySql("SELECT * FROM employees; DROP TABLE employees;")
    ).toThrow(UnsafeQueryError);
    expect(() =>
      validateReadOnlySql("SELECT * FROM employees; DROP TABLE employees;")
    ).toThrow("Multiple SQL statements are not allowed");
  });

  it("blocks empty or whitespace queries", () => {
    expect(() => validateReadOnlySql("")).toThrow(UnsafeQueryError);
    expect(() => validateReadOnlySql("   ")).toThrow("Empty SQL query");
  });

  it("blocks invalid SQL syntax", () => {
    expect(() => validateReadOnlySql("NOT VALID SQL STATEMENT ???")).toThrow(UnsafeQueryError);
    expect(() => validateReadOnlySql("NOT VALID SQL STATEMENT ???")).toThrow(
      "Unable to parse SQL query"
    );
  });
});
