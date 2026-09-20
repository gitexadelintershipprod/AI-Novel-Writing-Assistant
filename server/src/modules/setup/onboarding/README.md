# Global Creation Setup and First-Book Wizard

## Module Boundary

- `QuickSetupService` decides whether the creation environment is usable, and after the user explicitly submits quick setup it probes the model, saves the provider, and initializes core task routing.
- `FirstNovelOnboardingService` only reads real novel, chapter, and auto-director state to produce a first-book milestone projection.
- The frontend must not tick or fabricate milestone completion itself; local storage is used only to remember whether a situational hint was dismissed.

## Runtime Rules

- Quick setup may be marked complete only after both ordinary text and structured-output probes succeed.
- First-time setup applies one text model to all core creation tasks; the user can later adjust each task in advanced model routing.
- The frontend opens quick setup automatically when no usable model is available; the top-bar model-settings entry can re-enter the same configuration flow at any time. Quick setup only handles provider, key, address, default model, and connectivity probe. Full system settings continue to own multi-provider, model routing, and other advanced maintenance.
- Only the result page after a successful first automatic configuration offers the first-book handoff, guiding the user from one-sentence inspiration into auto-director. Model settings opened from the top bar stay a pure maintenance flow so existing users are not interrupted.
- A project that already has a readable first chapter is treated as having graduated from the first-book wizard; it is not required to walk through onboarding again.
- This module does not manage novel production and does not modify auto-director checkpoints; it only provides start conditions and a read-only guidance projection.
