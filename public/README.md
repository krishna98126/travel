# Travel — Complete Frontend

Open `index.html` in a browser.

## Pages
- `index.html` — Travel homepage with the uploaded island/airplane image as the hero background.
- `login.html` — Login + Sign up UI.
- `ai.html` — Aira AI travel chatbot and trip workspace.

## Aira AI
This is a frontend demo, so it does not call a real AI/API. It accepts natural-language prompts and extracts a destination, number of days and travel group to build a dynamic itinerary. The UI also includes Flight, Hotel and Recommended Package tabs.

Examples:
- "Plan a 3 day trip to Jaipur for family"
- "Plan a 4 day trip to Goa with friends"
- "Find a budget trip to Manali for 5 days"
- "Plan 5 days in Jaipur for 2 people with a budget of ₹40000"

To connect a real AI, replace `sendChat()` in `app.js` with a fetch request to your backend/API and return the generated itinerary into the same UI.
