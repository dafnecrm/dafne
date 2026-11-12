import { diffList, diffListElements, formatChangeValue } from "./values.ts";

describe("formatChangeValue", () => {
  it("shows a dash for empty values", () => {
    expect(formatChangeValue(null)).toBe("—");
    expect(formatChangeValue(undefined)).toBe("—");
    expect(formatChangeValue("")).toBe("—");
  });

  it("shows strings, numbers and booleans as they are", () => {
    expect(formatChangeValue("open")).toBe("open");
    expect(formatChangeValue(0)).toBe("0");
    expect(formatChangeValue(false)).toBe("false");
  });

  it("shows arrays and objects as JSON", () => {
    expect(formatChangeValue([1, 2])).toBe("[1,2]");
    expect(formatChangeValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe("diffList", () => {
  const item = (position: number, quantity: number) => ({ position, productId: 7, quantity });

  it("counts added, removed and changed elements by key", () => {
    expect(
      diffList([item(1, 1), item(2, 1), item(3, 1)], [item(1, 1), item(2, 5), item(4, 1)], "position"),
    ).toEqual({ added: 1, removed: 1, changed: 1 });
  });

  it("ignores the order of elements and of their keys", () => {
    expect(
      diffList([item(1, 1), item(2, 2)], [{ quantity: 2, productId: 7, position: 2 }, item(1, 1)], "position"),
    ).toEqual({ added: 0, removed: 0, changed: 0 });
  });

  it("takes a missing list as empty", () => {
    expect(diffList(null, [item(1, 1)], "position")).toEqual({ added: 1, removed: 0, changed: 0 });
    expect(diffList([item(1, 1)], undefined, "position")).toEqual({ added: 0, removed: 1, changed: 0 });
  });
});

describe("diffListElements", () => {
  it("gives each element that changed: added, changed fields, removed last", () => {
    const from = [
      { position: 10, productId: 2, quantity: 12 },
      { position: 20, productId: 3, quantity: 2 },
    ];
    const to = [
      { position: 10, productId: 2, quantity: 126 },
      { position: 30, productId: 4, quantity: 1 },
    ];
    expect(diffListElements(from, to, "position")).toEqual([
      { key: 10, kind: "changed", fields: [{ field: "quantity", from: 12, to: 126 }] },
      { key: 30, kind: "added", element: { position: 30, productId: 4, quantity: 1 } },
      { key: 20, kind: "removed", element: { position: 20, productId: 3, quantity: 2 } },
    ]);
  });

  it("leaves out the elements that didn't change", () => {
    expect(diffListElements([{ position: 1, quantity: 1 }], [{ quantity: 1, position: 1 }], "position")).toEqual([]);
  });
});
