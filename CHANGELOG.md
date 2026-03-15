# Changelog

All notable changes to AirwayLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Device settings extraction status** — Track whether device settings were actually extracted or are fallback defaults (`settingsSource` field). Clear messaging when settings are unavailable instead of misleading zeros/dashes. (settings-extraction-fallback-ux)
- **Device diagnostic collection** — Automatically save unknown device STR.edf signal labels and identification text to Supabase when settings extraction fails, enabling future device support. (settings-extraction-fallback-ux)
- **Tonic desaturation insight** — New insight rule detects when T<94% is elevated with low ODI3, indicating baseline respiratory depression (e.g., alcohol) rather than obstructive events. (research-validation-fixes)

### Fixed

- **False EPAP mismatch insights** — Pressure comparison insights no longer fire when settings weren't extracted (prevented "delivered 10 cmH₂O differs from prescribed 0" false warnings). (settings-extraction-fallback-ux)
- **AI insights on unavailable settings** — Claude Haiku is now told when settings are unavailable instead of receiving zero pressure values. (settings-extraction-fallback-ux)
- **IFL Risk FI inversion** — Fixed critical bug where the Flatness Index component (20% weight) was inverted in the IFL Symptom Risk composite. Higher FI (more flow limitation) now correctly increases risk instead of decreasing it. (research-validation-fixes)
- **Brief obstruction EPAP recommendation** — Removed clinically incorrect recommendation to increase EPAP for brief obstructions. Research shows these events do not respond to pressure changes. (research-validation-fixes)
- **RERA FL criterion** — Replaced unreliable Tpeak/Ti > 0.40 with FI >= 0.85 in RERA detection. Tpeak/Ti is artifactually elevated on BiPAP (94% of breaths exceed threshold), inflating RERA counts. (research-validation-fixes)
- **EAI methodology description** — Corrected thresholds (35%/50% not 20%/30%), logic (AND not OR), and documented FL prerequisite and 30s refractory period to match actual algorithm. (research-validation-fixes)
- **Glasgow Index range** — Fixed CLAUDE.md documentation: Glasgow sums all 9 components (range 0-9), not 8 (range 0-8). (research-validation-fixes)
- **AI prompt pressure ceiling** — Added Jounieaux 1995 glottic narrowing constraint to prevent AI from recommending blanket pressure increases. Removed contradictory EPR adjustment example. (research-validation-fixes)
- **Coupled event insight** — Corrected overstated coupling mechanism description. In UARS, most HR surges and desaturations are independent. (research-validation-fixes)

### Security

- **AI prompt input sanitization** — User-controlled night notes are now sanitized before reaching the Claude API prompt. Strips control characters, zero-width chars, and URLs. Detects and blocks prompt injection patterns with Sentry monitoring. (ai-prompt-input-sanitization)
- **Persistent rate limiting** — Rate limiting now persists across Vercel cold starts via Upstash Redis. Falls back to in-memory when not configured. Fails open on Redis errors with Sentry logging. (persistent-rate-limiting)
