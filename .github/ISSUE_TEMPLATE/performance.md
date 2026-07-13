---
name: Performance Issue
about: Report slow page loads, slow API responses, or slow campaign delivery
title: "[Performance]: "
labels: performance
assignees: ''
---

## Summary

<!-- What is slow, and how slow (numbers help — page load time, response time, etc.)? -->

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

<!-- What response/load time would be acceptable? -->

## Actual Behavior

<!-- Measured timing, screenshots of DevTools/Network tab, or API response times. -->

## Environment

- **App/Area**: <!-- Storefront / Admin Portal / API / Campaign Delivery Worker -->
- **Environment**: <!-- Local / Vercel Production / Render Production -->
- **Scale at time of issue**: <!-- e.g. number of products, subscribers, or recipients in the campaign being sent -->
- **Browser/device** (if frontend):

## Screenshots

<!-- DevTools Network/Performance tab, Lighthouse report, or log timestamps. -->

## Additional Notes

<!--
For campaign delivery specifically: check CampaignDelivery:BatchSize and
CampaignDelivery:PollingIntervalSeconds (docs/ARCHITECTURE.md#background-worker)
before assuming a code-level bottleneck — these are configurable.
-->
