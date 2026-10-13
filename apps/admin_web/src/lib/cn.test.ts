import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });

  it("lets later Tailwind utilities win", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });

  it("keeps a text color alongside a custom type-scale size", () => {
    expect(cn("text-white", "text-body")).toBe("text-white text-body");
  });

  it("resolves conflicts within the custom type scale", () => {
    expect(cn("text-body", "text-dense")).toBe("text-dense");
  });
});
