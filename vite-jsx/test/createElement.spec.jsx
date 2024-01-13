import { it, expect, describe } from "vitest";
import React from "../core/React.js";

describe("createElement", () => {
  it("test no props", () => {
    const el = <div>hi</div>;
    expect(el).toMatchInlineSnapshot(`
      {
        "props": {
          "children": [
            {
              "props": {
                "children": [],
                "nodeValue": "hi",
              },
              "type": "TEXT_ELEMENT",
            },
          ],
        },
        "type": "div",
      }
    `);
  });

  it("test with props", () => {
    const el = <div id="testId">hi</div>;
    expect(el).toMatchInlineSnapshot(`
      {
        "props": {
          "children": [
            {
              "props": {
                "children": [],
                "nodeValue": "hi",
              },
              "type": "TEXT_ELEMENT",
            },
          ],
          "id": "testId",
        },
        "type": "div",
      }
    `);
  });
});
