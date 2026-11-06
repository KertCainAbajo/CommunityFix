/** Real photos from Wikimedia Commons, one for each type of problem. */
export const categoryPhoto = (category: string) => `/photos/${["streetlight", "road", "drainage", "waste", "water", "sidewalk"].includes(category) ? category : "other"}.jpg`;

// These licenses require the credit to stay visible while the photo is used.
export const PHOTO_CREDITS = [
  {
    "title": "Barangay Hall of Poblacion, Alubijid",
    "author": "Ahri.boy",
    "license": "CC BY 4.0",
    "href": "https://commons.wikimedia.org/wiki/File:Barangay_Hall_of_Poblacion,_Alubijid.jpg"
  },
  {
    "title": "Philippines - Siay, Zamboanga Sibugay - Zamboanga-Pagadian Road in Barangay Kimos (2019-10-22)",
    "author": "Jayvee Enaguas (The Harvett Vault)",
    "license": "CC BY 4.0",
    "href": "https://commons.wikimedia.org/wiki/File%3APhilippines_-_Siay%2C_Zamboanga_Sibugay_-_Zamboanga-Pagadian_Road_in_Barangay_Kimos_(2019-10-22).jpg"
  },
  {
    "title": "Philippines - Siay, Zamboanga Sibugay - Siay-Payao Road in Barangay Balucanan (2023-12-16)",
    "author": "Jayvee Enaguas (The Harvett Vault)",
    "license": "CC BY 4.0",
    "href": "https://commons.wikimedia.org/wiki/File%3APhilippines_-_Siay%2C_Zamboanga_Sibugay_-_Siay-Payao_Road_in_Barangay_Balucanan_(2023-12-16).jpg"
  },
  {
    "title": "Trash in the sidewalks of the Sanciangko Street (2025-05-17)",
    "author": "Wide Awake!",
    "license": "CC BY 4.0",
    "href": "https://commons.wikimedia.org/wiki/File%3ATrash_in_the_sidewalks_of_the_Sanciangko_Street_(2025-05-17).jpg"
  },
  {
    "title": "Water coming from punched pipe (7415072368)",
    "author": "SuSanA Secretariat",
    "license": "CC BY 2.0",
    "href": "https://commons.wikimedia.org/wiki/File%3AWater_coming_from_punched_pipe_(7415072368).jpg"
  }
];
