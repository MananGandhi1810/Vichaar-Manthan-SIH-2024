import { send } from "../../../utils/queue-manager";
import { test, expect } from "vitest";

test("Send Message to Queue", () => {
  send("file-uploads", "Test Message");
});
