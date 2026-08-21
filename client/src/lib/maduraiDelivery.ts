/** Madurai city delivery pincodes (core Madurai Corporation / city areas) */
export const MADURAI_CITY = "Madurai";
export const MADURAI_STATE = "Tamil Nadu";

export const MADURAI_PINCODES = [
  "625001",
  "625002",
  "625003",
  "625004",
  "625005",
  "625006",
  "625007",
  "625008",
  "625009",
  "625010",
  "625011",
  "625012",
  "625014",
  "625015",
  "625016",
  "625017",
  "625018",
  "625019",
  "625020",
  "625021",
  "625022",
  "625023"
] as const;

export const MADURAI_DELIVERY_MESSAGE =
  "Delivery is only available in Madurai city. Please enter a Madurai address and a valid Madurai pincode.";

export const isMaduraiCity = (city: string) =>
  city.trim().toLowerCase() === MADURAI_CITY.toLowerCase();

export const isMaduraiPincode = (pincode: string) =>
  MADURAI_PINCODES.includes(pincode.trim() as (typeof MADURAI_PINCODES)[number]);

export const isMaduraiDeliveryAllowed = (city: string, pincode: string) =>
  isMaduraiCity(city) && isMaduraiPincode(pincode);
