---
name: Gemini provider fallback
description: How to handle Gemini access when managed Replit AI setup is unavailable.
---

Use the managed Gemini integration when it is available. If setup is blocked by account requirements and the user declines, use the secure secrets flow for their own Gemini key and keep a deterministic, non-diagnostic fallback in the application.

**Why:** The managed integration may require an account upgrade, but the product still needs a working triage path without exposing credentials or silently failing.

**How to apply:** Never ask for a provider key in chat; request it through workspace secrets, and preserve emergency keyword interception independently of model availability.