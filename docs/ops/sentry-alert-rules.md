# Sentry Alert Rules

Manual alert rules that must be configured in the Sentry UI.
No IaC for alert rules yet — track creation status in this file.

## Email send failure alert (AIR-1912)

Trigger: Sentry issue where tags.subsystem = "email-send" AND level = error
Threshold: 50+ events in 1 hour
Notification: #platform-health Discord channel + email to d.voorhagen@gmail.com
Note: manual creation in Sentry UI required (no IaC for alert rules yet)
Note: SENTRY_AUTH_TOKEN must be in `secret_ref` binding (per AIR-1516) before API-based rule creation
