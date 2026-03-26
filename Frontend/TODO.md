# TODO: Fix Dashboard Counts Issue

## Completed Tasks
- [x] Update fetchCounts in src/services/api.js to fetch counts for patients, doctors, and receptionists using Promise.all
- [x] Add totalAppointments state in AdminDashboard.jsx
- [x] Update fetchAllData function to fetch and set today's appointment count
- [x] Update stats array to display totalAppointments instead of "Loading..." for "Today’s Appointments"
- [x] Update useMemo dependencies to include totalAppointments

## Summary
The issue was that fetchCounts only fetched doctor counts, and appointment counts were not being set. Now all counts should display correctly on the dashboard.
