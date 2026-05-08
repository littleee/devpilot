import test from "node:test";
import assert from "node:assert/strict";

import {
  isDevPilotClientRequest,
  startAutoObservation,
} from "../packages/devpilot/dist/observation/collectors.js";
import { resolveDevPilotFeatures } from "../packages/devpilot/dist/types/common.js";

test("resolveDevPilotFeatures requires explicit mcp opt-in even when endpoint is present", () => {
  assert.deepEqual(resolveDevPilotFeatures(undefined, "http://127.0.0.1:5213"), {
    stability: false,
    mcp: false,
  });

  assert.deepEqual(
    resolveDevPilotFeatures({ stability: true }, "http://127.0.0.1:5213"),
    {
      stability: true,
      mcp: false,
    },
  );

  assert.deepEqual(
    resolveDevPilotFeatures({ mcp: true }, "http://127.0.0.1:5213"),
    {
      stability: false,
      mcp: true,
    },
  );

  assert.deepEqual(resolveDevPilotFeatures({ mcp: true }, undefined), {
    stability: false,
    mcp: false,
  });
});

test("startAutoObservation can ignore DevPilot internal bridge fetch failures", async () => {
  const observed = [];
  const originalWindow = global.window;
  const originalXMLHttpRequest = global.XMLHttpRequest;
  const listeners = new Map();

  const baseFetch = async () => {
    throw new Error("connect refused");
  };

  global.window = {
    location: { href: "http://app.local/dashboard" },
    fetch: baseFetch,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) {
        listeners.delete(type);
      }
    },
  };
  global.XMLHttpRequest = undefined;

  try {
    const stop = startAutoObservation({
      isWithinDevPilotTarget: () => false,
      shouldIgnoreNetworkRequest: ({ url, headers }) =>
        isDevPilotClientRequest(headers) || url.startsWith("http://127.0.0.1:5213"),
      recordObservedStabilityItem: (item) => {
        observed.push(item);
      },
    });

    await assert.rejects(
      window.fetch("http://127.0.0.1:5213/sessions/ensure", {
        method: "POST",
        headers: {
          "X-DevPilot-Client-Id": "cli_test",
        },
      }),
    );
    assert.equal(observed.length, 0);

    await assert.rejects(
      window.fetch("https://api.example.com/search?q=devpilot", {
        method: "GET",
      }),
    );
    assert.equal(observed.length, 1);
    assert.match(observed[0].fingerprint, /^fetch-network:/);
    assert.match(observed[0].symptom, /api\.example\.com/);

    stop();
  } finally {
    if (originalWindow === undefined) {
      delete global.window;
    } else {
      global.window = originalWindow;
    }

    if (originalXMLHttpRequest === undefined) {
      delete global.XMLHttpRequest;
    } else {
      global.XMLHttpRequest = originalXMLHttpRequest;
    }
  }
});
