// GST Number validation and auto-fetch utilities

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory"
};

export interface GSTValidationResult {
  isValid: boolean;
  error?: string;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  entityCode?: string;
}

export const validateGSTNumber = (gstin: string): GSTValidationResult => {
  if (!gstin) {
    return { isValid: false, error: "GST number is required" };
  }

  const upperGstin = gstin.toUpperCase().trim();

  if (upperGstin.length !== 15) {
    return { isValid: false, error: "GST number must be exactly 15 characters" };
  }

  if (!GST_REGEX.test(upperGstin)) {
    return { isValid: false, error: "Invalid GST number format" };
  }

  const stateCode = upperGstin.substring(0, 2);
  const stateName = STATE_CODES[stateCode];

  if (!stateName) {
    return { isValid: false, error: "Invalid state code in GST number" };
  }

  const pan = upperGstin.substring(2, 12);
  const entityCode = upperGstin.substring(12, 13);

  return {
    isValid: true,
    stateCode,
    stateName,
    pan,
    entityCode
  };
};

export const getStateFromGST = (gstin: string): string | null => {
  if (!gstin || gstin.length < 2) return null;
  const stateCode = gstin.substring(0, 2);
  return STATE_CODES[stateCode] || null;
};

export const formatGSTNumber = (gstin: string): string => {
  return gstin.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 15);
};

export { STATE_CODES };
