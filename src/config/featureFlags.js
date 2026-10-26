// Feature switches. Disabled pages keep their code; set a flag to true to bring one back.

// Help Center (/help) and About (/about): off means no routes (the URLs redirect
// to the dashboard) and no entries in the user menu.
export const SUPPORT_PAGES_ENABLED = false;

// Locations (/map, /location/*) and Surveys (/surveys), off for now while work moves to
// Block Profile: no routes (the URLs redirect to the dashboard) and no sidebar entries.
// The section, subsection and trenching pages stay, since block profiles use them too.
export const LOCATIONS_ENABLED = false;
export const SURVEYS_ENABLED = false;
