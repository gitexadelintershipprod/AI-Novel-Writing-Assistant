import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_DIRECTOR_EVENT_OPTIONS,
  buildAutoDirectorChannelDraft,
  summarizeSelectedAutoDirectorEvents,
} from "./autoDirectorEventOptions.ts";

test("auto director event options expose Chinese labels and preserve event codes in drafts", () => {
  assert.equal(AUTO_DIRECTOR_EVENT_OPTIONS[0]?.code, "auto_director.approval_required");
  assert.equal(AUTO_DIRECTOR_EVENT_OPTIONS[0]?.label, "Automatically continue to be processed");
  assert.equal(AUTO_DIRECTOR_EVENT_OPTIONS[1]?.code, "auto_director.auto_approved");
  assert.equal(AUTO_DIRECTOR_EVENT_OPTIONS[1]?.label, "AI has automatically passed");

  const draft = buildAutoDirectorChannelDraft({
    baseUrl: "https://book.example.com",
    dingtalk: {
      webhookUrl: "https://relay.example.test/dingtalk",
      callbackToken: "ding-token",
      operatorMapJson: "{\"ding_user_1\":\"user_1\"}",
      eventTypes: ["auto_director.approval_required", "auto_director.exception"],
    },
    wecom: {
      webhookUrl: "https://relay.example.test/wecom",
      callbackToken: "wecom-token",
      operatorMapJson: "{\"wecom_user_1\":\"user_1\"}",
      eventTypes: ["auto_director.completed"],
    },
  });

  assert.deepEqual(draft.dingtalk.eventTypes, [
    "auto_director.approval_required",
    "auto_director.exception",
  ]);
  assert.deepEqual(draft.wecom.eventTypes, ["auto_director.completed"]);
});

test("auto director event summary renders Chinese labels instead of raw codes", () => {
  assert.equal(summarizeSelectedAutoDirectorEvents([]), "Not subscribed to events");
  assert.equal(
    summarizeSelectedAutoDirectorEvents(["auto_director.approval_required"]),
    "Automatically continue to be processed",
  );
  assert.equal(
    summarizeSelectedAutoDirectorEvents([
      "auto_director.approval_required",
      "auto_director.exception",
      "auto_director.completed",
    ]),
    "Automatically continue to be processed, Abnormal operation, and 3 events total",
  );
});
