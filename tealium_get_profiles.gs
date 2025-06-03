// 🔧 CONFIGURATION — Edit these values
const TEALIUM_ACCOUNT = 'esteelauder';
const TEALIUM_USERNAME = 'jmitchell@estee.com';
const TEALIUM_API_KEY = 'g$ipvYc,hut$z[Wp8fLDRsE3$%H!:(5,Gj=98m%dLgvx0*P[D5Cn,6U]VzPkB}cg';
const PROFILES_SHEET_NAME = 'profiles';
const LIBRARY_SHEET_NAME = 'Library';
const TAGS_SHEET_NAME = 'tags';
const LIBRARY_DETAILS_SHEET_NAME = 'library_details';

// 🔐 Auth helper
function getTealiumBearerToken(account, profile, username, apiKey) {
  Logger.log(`🔐 Attempting auth for profile: ${profile}`);
  const url = `https://platform.tealiumapis.com/v3/auth/accounts/${account}/profiles/${profile}`;
  const payload = { 'username': username, 'key': apiKey };
  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, options);
  const content = response.getContentText();
  const data = JSON.parse(content);
  if (response.getResponseCode() !== 200 || !data.token) {
    throw new Error(`❌ Failed to get bearer token for ${profile}: ${content}`);
  }
  return data.token;
}

// 📥 Read profile list
function getProfileListFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROFILES_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet '${PROFILES_SHEET_NAME}' not found.`);
  return sheet.getRange('A2:A').getValues().flat().filter(name => !!name);
}

// 📤 Export tag data from profiles to 'tags' sheet
function importCleanTagDetails() {
  const profiles = getProfileListFromSheet();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TAGS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TAGS_SHEET_NAME);
  } else {
    sheet.clearContents();
  }

  sheet.appendRow([
    'Profile', 'id', 'name', 'library', 'status',
    'selectedTargets: qa', 'selectedTargets: dev', 'selectedTargets: prod',
    'environmentVersions: qa', 'environmentVersions: dev', 'environmentVersions: prod',
    'tagTiming'
  ]);

  for (const profile of profiles) {
    try {
      const token = getTealiumBearerToken(TEALIUM_ACCOUNT, profile, TEALIUM_USERNAME, TEALIUM_API_KEY);
      const profileUrl = `https://platform.tealiumapis.com/v3/tiq/accounts/${TEALIUM_ACCOUNT}/profiles/${profile}?includes=tags`;
      const options = {
        method: 'get',
        headers: { 'Authorization': `Bearer ${token}` },
        muteHttpExceptions: true
      };
      const response = UrlFetchApp.fetch(profileUrl, options);
      const data = JSON.parse(response.getContentText());
      const tags = data.tags || [];

      tags.forEach(tag => {
        const adv = tag.advancedConfiguration || {};
        const targets = tag.selectedTargets || {};
        const versions = tag.environmentVersions || {};

        sheet.appendRow([
          profile,
          tag.id || '',
          tag.name || '',
          tag.library || '',
          tag.status || '',
          targets.qa ?? '',
          targets.dev ?? '',
          targets.prod ?? '',
          versions.qa ?? '',
          versions.dev ?? '',
          versions.prod ?? '',
          adv.tagTiming ?? ''
        ]);
      });

    } catch (e) {
      Logger.log(`⚠️ Error for ${profile}: ${e.message}`);
    }
  }
}

// 📤 Export library tag → mapping details to 'library_details'
function exportLibraryDetails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const librarySheet = ss.getSheetByName(LIBRARY_SHEET_NAME);
  if (!librarySheet) throw new Error(`Sheet '${LIBRARY_SHEET_NAME}' not found.`);

  const libraries = librarySheet.getRange('A2:A').getValues().flat().filter(name => !!name);
  let outputSheet = ss.getSheetByName(LIBRARY_DETAILS_SHEET_NAME);
  if (!outputSheet) {
    outputSheet = ss.insertSheet(LIBRARY_DETAILS_SHEET_NAME);
  } else {
    outputSheet.clearContents();
  }

  outputSheet.appendRow([
    'Library', 'Tag ID', 'Tag Name', 'Tag Type', 'Status',
    'Variable Name', 'Mapping Destination', 'Mapping Type'
  ]);

  for (const library of libraries) {
    try {
      const token = getTealiumBearerToken(TEALIUM_ACCOUNT, library, TEALIUM_USERNAME, TEALIUM_API_KEY);
      const url = `https://platform.tealiumapis.com/v3/tiq/accounts/${TEALIUM_ACCOUNT}/profiles/${library}?includes=tags`;
      const options = {
        method: 'get',
        headers: { 'Authorization': `Bearer ${token}` },
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response.getContentText());
      const tags = data.tags || [];

      for (const tag of tags) {
        const tagId = tag.id || '';
        const tagName = tag.name || '';
        const tagType = tag.tag_type || '';
        const status = tag.status || '';
        const dataMappings = tag.dataMappings || [];

        if (dataMappings.length === 0) {
          outputSheet.appendRow([library, tagId, tagName, tagType, status, '', '', '']);
        } else {
          for (const mapping of dataMappings) {
            const variableName = mapping.variable || '';
            const type = mapping.type || '';
            const destinations = mapping.mappings || [];

            destinations.forEach(destination => {
              outputSheet.appendRow([
                library,
                tagId,
                tagName,
                tagType,
                status,
                variableName,
                destination,
                type
              ]);
            });
          }
        }
      }

    } catch (e) {
      Logger.log(`❌ Failed for library '${library}': ${e.message}`);
    }
  }

  Logger.log('✅ Library tag-to-mapping export complete.');
}

// 🚀 Master runner
function runAllExports() {
  try {
    Logger.log('🚀 Starting full Tealium export process...');
    importCleanTagDetails();
    Logger.log('✅ Tag export complete.');
    exportLibraryDetails();
    Logger.log('✅ Library export complete.');
    Logger.log('🎉 All exports finished successfully.');
  } catch (e) {
    Logger.log(`❌ Error during export: ${e.message}`);
  }
}
