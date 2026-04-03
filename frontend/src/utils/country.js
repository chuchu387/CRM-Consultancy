const flagMap = {
  australia: "🇦🇺",
  canada: "🇨🇦",
  china: "🇨🇳",
  france: "🇫🇷",
  germany: "🇩🇪",
  india: "🇮🇳",
  ireland: "🇮🇪",
  italy: "🇮🇹",
  japan: "🇯🇵",
  nepal: "🇳🇵",
  netherlands: "🇳🇱",
  newzealand: "🇳🇿",
  singapore: "🇸🇬",
  southkorea: "🇰🇷",
  spain: "🇪🇸",
  switzerland: "🇨🇭",
  uk: "🇬🇧",
  unitedkingdom: "🇬🇧",
  usa: "🇺🇸",
  unitedstates: "🇺🇸",
  unitedstatesofamerica: "🇺🇸",
};

export const getCountryFlag = (country) => {
  const key = (country || "").toLowerCase().replace(/[^a-z]/g, "");
  return flagMap[key] || "🌍";
};
