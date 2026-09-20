# Settings-page creation readiness

## Background

The system settings page hosts model providers, model routing, the knowledge base, the writing-style engine, Auto-Director authorization, and desktop maintenance. For a complete writing beginner, laying those controls out as technical modules makes it look as if every parameter must be understood before a novel can start.

The first job of Settings is not to show every parameter. It is to answer the question users care about: can creation start now, and if not, what is still missing.

## Decision

Settings uses a creation-readiness check as the first-screen core. The page should show the model and routing status required to start writing first, then the knowledge base, writing-style engine, Auto-Director advanced settings, and system maintenance.

The knowledge base, writing-style engine, and notification channels are enhancements or advanced capabilities. They must not block starting creation in layout or copy. Provider details stay quiet by default: available status, current model, a balance summary, and the primary action. Technical parameters belong in advanced details.

## Current Rule

- The first screen must make it clear whether the basic creation chain is available.
- If a prose model is missing, guide the user to configure a model provider first.
- If model routing is unhealthy, guide the user into model-routing management.
- If the knowledge base is off, say clearly that it is an optional enhancement and does not block creation.
- Describe the writing-style engine in user-task language such as “quick check / stable recommendation / long-text extraction”. Keep minute-level timing in advanced settings.
- Approval authorization, director follow-up channels, and desktop maintenance must not take the main attention before creation can start.

## Failure Modes

- If Settings becomes a long list of vendors, API URLs, model tags, and runtime parameters again, beginners cannot tell the next step and are more likely to abandon opening a book.
- If knowledge-base or writing-style copy implies “configure this first”, users will treat enhancements as creation prerequisites.
- If routing failures appear only on the model-routing page, Settings cannot diagnose the global creation entry.

## Related Modules

- `client/src/pages/settings/SettingsPage.tsx`
- `client/src/pages/settings/components/SettingsReadinessCard.tsx`
- `client/src/pages/settings/components/ProviderSettingsSection.tsx`
- `client/src/pages/settings/components/StyleEngineRuntimeSettingsCard.tsx`
