import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { RingProgress } from "../RingProgress";

describe("RingProgress", () => {
  it("renders at 0% without crashing", async () => {
    const { getByText } = await render(<RingProgress percent={0} />);
    expect(getByText("0%")).toBeTruthy();
  });

  it("renders at 100% without crashing", async () => {
    const { getByText } = await render(<RingProgress percent={100} />);
    expect(getByText("100%")).toBeTruthy();
  });

  it("clamps out-of-range percentages", async () => {
    const { getByText } = await render(<RingProgress percent={150} />);
    expect(getByText("100%")).toBeTruthy();
  });
});
