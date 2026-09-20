# Workspace Page Composition Boundary

This directory only provides the visual contract shared by workbench pages: page header, recommended actions, and status feedback.

- Components do not read APIs, interpret business state, or execute task actions.
- The page must first decide `tone`, title, and consequence copy from structured fields, then hand them here for rendering.
- Status color uses only global semantic tokens: `danger` means blocked or failed, `warning` means a reminder that can still be handled, and `info` means in progress or waiting for action.
