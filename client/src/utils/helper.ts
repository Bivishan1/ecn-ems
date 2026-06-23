 // office name from office name - helper function

  export const getOfficeNameWithoutAddress = (officeName = "") => {
  const parts = officeName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[0] || "";
};
  
  // address from office name - helper function
  
  export const getOfficeAddressFromOfficeName = (officeName = "") => {
  const parts = officeName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts[parts.length - 1] : "";
};

// converting to unicode helper functions


