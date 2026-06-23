const axios = require("axios");

const normalizeText = (value = "") => {
  return value.toString().trim().replace(/\s+/g, " ").toLowerCase();
};

const removeLargeSensitiveFields = (voterData = {}) => {
  const cleaned = { ...voterData };

  /**
   * Do not store or return base64 image by default.
   * It makes DB heavy and may expose unnecessary personal data.
   */
  delete cleaned.imageUrl;

  return cleaned;
};

const verifyVoterFromElectionApi = async ({ voterNo, dob }) => {
  try {
    const apiUrl =
      process.env.ECN_VOTER_SEARCH_API ||
      "https://voterlist.election.gov.np/api/voters/search";

    if (!voterNo || !dob) {
      return {
        success: false,
        verified: false,
        status: "missing_fields",
        message: "Voter number and date of birth are required",
      };
    }

    const cleanedVoterNo = voterNo.toString().trim();
    const cleanedDob = dob.toString().trim();

    const response = await axios.post(
      apiUrl,
      {
        form_no: cleanedVoterNo,
        dob_loc: cleanedDob,
      },
      {
        timeout: 15000,
        headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-App-Handshake": "VoterrollSecure",

        /**
         * Some public APIs reject server-side requests unless these browser-like
         * headers are present.
         */
        Origin: "https://voterlist.election.gov.np",
        Referer: "https://voterlist.election.gov.np/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/148.0.0.0"
        },
      }
    );

    const responseData = response.data;

    if (!responseData?.found || !responseData?.voterData) {
      return {
        success: true,
        verified: false,
        status: "not_found",
        message:
          "Voter record not found. Please check voter number and date of birth.",
        data: responseData,
      };
    }

    const voterData = removeLargeSensitiveFields(responseData.voterData);

    /**
     * Extra safety check:
     * The API should return the same voter number and DOB we requested.
     */
    const apiVoterNumber = voterData.voterNumber?.toString().trim();
    const apiDob = voterData.dob?.toString().trim();

    if (apiVoterNumber !== cleanedVoterNo || apiDob !== cleanedDob) {
      return {
        success: true,
        verified: false,
        status: "mismatch",
        message:
          "Voter details returned from server did not match the entered voter number and date of birth.",
        data: voterData,
      };
    }

    return {
      success: true,
      verified: true,
      status: "verified",
      message: "Voter verified successfully",
      data: voterData,
      raw: {
        found: responseData.found,
        voterData,
      },
    };
  } catch (error) {
    console.error(
      "Election voter API error:",
      error.response?.data || error.message
    );
    console.error("Election voter API error details:");
    console.error("Status:", error.response?.status);
    console.error("Response:", error.response?.data);
    console.error("Message:", error.message);

    return {
      success: false,
      verified: false,
      status: "api_error",
      message:
        "Unable to verify voter from Election Commission server at this time",
      error: error.response?.data || error.message,
        /**
       * Only expose debug info during development.
       * Do not expose this in production.
       */
      debug:
        process.env.NODE_ENV !== "production"
          ? {
              statusCode: error.response?.status || null,
              response: error.response?.data || null,
              errorMessage: error.message,
            }
          : undefined,
    };
  }
};

module.exports = {
  verifyVoterFromElectionApi,
  normalizeText,
};