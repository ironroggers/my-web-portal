// Equipment sheets filled after a block is created: Block_eqpt once per block, gp_eqpt
// once per GP, misc_eqpt once per block and once per GP. The server checks the same fields
// (execution-service/src/config/infraEquipment.js); keys and options must match it.
// State, district and block names and codes come from the block profile.

const opts = (map) => Object.entries(map).map(([value, label]) => ({ value, label }));

const PHASE = { key: "phase", label: "Phase", type: "enum", options: opts({ 1: "Phase 1", 2: "Phase 2", ABP: "ABP" }), required: true };
const PROJECT_STATUS = { key: "projectStatus", label: "Project status", type: "enum", options: opts({ DESIGNED: "Designed", EXECUTED: "Executed" }), required: true };
const BACKHAUL = { key: "backhaul", label: "Backhaul", type: "enum", options: opts({ F: "OFC", S: "Satellite", R: "Radio" }) };
const REMARKS = { key: "remarks", label: "Remarks", type: "text", multiline: true, full: true };
const ASSET_CODE = { key: "assetCode", label: "Asset code", type: "assetCode", required: true, full: true };
const GP_SITE_TYPES = opts({ SCHOOL: "School", COLLEGE: "College", AANGANWADI: "Aanganwadi", GRAM_PANCHAYAT_BHAVAN: "Gram Panchayat Bhavan" });

export const MISC_TYPE_TAGS = { RACK: "RA", FDMS: "FD", FTB: "FT", CCU: "CC", SPV: "SP" };

const pad = (value, length) => {
  const text = String(value ?? "").trim();
  return text ? text.padStart(length, "0") : "";
};

// SS (state LGD) + DDD (district Census) + BBBB (block LGD); empty if a code is missing
export const assetPrefix = (geo = {}) => {
  const parts = [pad(geo.stateCode, 2), pad(geo.districtCensusCode, 3), pad(geo.blockCode, 4)];
  return parts.every(Boolean) ? parts.join("") : "";
};

export const EQUIPMENT_FORMS = {
  block: {
    title: "Block equipment",
    sheet: "Block_eqpt",
    assetFormat: "SSDDDBBBB BH LL (LL: block router code L1, L2…)",
    suggestAssetCode: (prefix) => `${prefix}BHL1`,
    sections: [
      {
        title: "Site",
        fields: [
          PHASE,
          { key: "siteType", label: "Site type", type: "enum", options: opts({ BSNL_OWNED: "BSNL owned", BSNL_RENTED: "BSNL rented", OTHERS: "Others" }) },
        ],
      },
      {
        title: "Router",
        fields: [
          ASSET_CODE,
          { key: "routerType", label: "Router type", type: "enum", options: opts({ A: "A", B: "B" }) },
          PROJECT_STATUS,
          { key: "make", label: "Make", type: "text" },
          { key: "model", label: "Model", type: "text" },
          { key: "managementIp", label: "Management IP", type: "ip" },
          { key: "macId", label: "MAC ID", type: "mac" },
          { key: "serialNo", label: "Serial no.", type: "text" },
        ],
      },
      {
        title: "Ports",
        fields: [
          { key: "ports100g", label: "100G ports", type: "int" },
          { key: "ports10g", label: "10G ports", type: "int" },
          { key: "ports10g1g", label: "10G/1G ports", type: "int" },
          REMARKS,
        ],
      },
    ],
  },
  gp: {
    title: "GP equipment",
    sheet: "gp_eqpt",
    assetFormat: "SSDDDBBBB GP PPPPPP (six-character location code)",
    suggestAssetCode: (prefix, v) => (v.locationCode ? `${prefix}GP${pad(v.locationCode, 6)}` : ""),
    sections: [
      {
        title: "Location",
        fields: [
          PHASE,
          { key: "locationType", label: "Location type", type: "enum", options: opts({ GP: "GP", VILLAGE: "Village", SEMI_URBAN: "Semi-urban" }) },
          { key: "locationName", label: "Location name", type: "text" },
          { key: "locationCode", label: "Location code", type: "text", helper: "Block / GP / village code" },
          { key: "siteType", label: "Site type", type: "enum", options: GP_SITE_TYPES },
          BACKHAUL,
        ],
      },
      {
        title: "Router",
        fields: [
          ASSET_CODE,
          { key: "routerType", label: "Router type", type: "enum", options: opts({ C: "C", D: "D" }) },
          PROJECT_STATUS,
          { key: "make", label: "Make", type: "text" },
          { key: "model", label: "Model", type: "text" },
          { key: "managementIp", label: "Management IP", type: "ip" },
          { key: "macId", label: "MAC ID", type: "mac" },
          { key: "serialNo", label: "Serial no.", type: "text" },
          { key: "ports1g", label: "1G ports available", type: "int" },
          { key: "ports10g", label: "10G ports available", type: "int" },
          { key: "ports10g1g", label: "10G/1G ports available", type: "int" },
        ],
      },
      {
        title: "Ring",
        subtitle: "Previous and next node on the primary ring, clockwise",
        fields: [
          { key: "ringCount", label: "No. of rings", type: "int", helper: "Rings this GP is part of" },
          { key: "ringCode", label: "Ring code", type: "text", upper: true, helper: "SSDDDBBBBAAA or SSDDDBBBBAAABBB.C" },
          { key: "prevNode", label: "Previous node", type: "node" },
          { key: "prevNodeDistanceM", label: "Distance to previous node", type: "metres", helper: "Optical length" },
          { key: "nextNode", label: "Next node", type: "node" },
          { key: "nextNodeDistanceM", label: "Distance to next node", type: "metres", helper: "Optical length" },
          REMARKS,
        ],
      },
    ],
  },
  misc: {
    title: "Misc equipment",
    sheet: "misc_eqpt",
    assetFormat: "SSDDDBBBB XX PPPPPP (XX: RA rack, FD FDMS, FT FTB, CC CCU, SP SPV · PPPPPP: LGD code)",
    suggestAssetCode: (prefix, v) =>
      MISC_TYPE_TAGS[v.equipmentType] && v.lgdCode ? `${prefix}${MISC_TYPE_TAGS[v.equipmentType]}${pad(v.lgdCode, 6)}` : "",
    sections: [
      {
        title: "Equipment",
        fields: [
          PHASE,
          { key: "equipmentType", label: "Type", type: "enum", options: opts({ FDMS: "FDMS", RACK: "Rack", FTB: "FTB", CCU: "CCU", SPV: "SPV" }), required: true },
          { key: "lgdCode", label: "LGD code", type: "text", helper: "The GP's; the block's for block-level equipment" },
          { key: "locationType", label: "Location type", type: "enum", options: GP_SITE_TYPES },
          ASSET_CODE,
          PROJECT_STATUS,
          { key: "model", label: "Model", type: "text" },
          { key: "serialNo", label: "Serial no.", type: "text" },
          BACKHAUL,
          REMARKS,
        ],
      },
    ],
  },
};

export const formFields = (formKey) => EQUIPMENT_FORMS[formKey].sections.flatMap((s) => s.fields);

const MAC = /^([0-9A-F]{2}[:-]?){5}[0-9A-F]{2}$|^[0-9A-F]{4}\.[0-9A-F]{4}\.[0-9A-F]{4}$/i;
const IPV4 = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

// Quick checks before saving; the server has the final say
export const validateEquipment = (formKey, values) => {
  const errors = {};
  for (const f of formFields(formKey)) {
    const text = String(values[f.key] ?? "").trim();
    if (!text) {
      if (f.required) errors[f.key] = "Required";
      continue;
    }
    if (f.type === "int" && !/^\d+$/.test(text)) errors[f.key] = "Enter a whole number";
    if (f.type === "metres" && !(Number(text) >= 0)) errors[f.key] = "Enter the length in metres";
    if (f.type === "ip" && !IPV4.test(text) && !text.includes(":")) errors[f.key] = "Enter a valid IP address";
    if (f.type === "mac" && !MAC.test(text)) errors[f.key] = "Enter a MAC like AA:BB:CC:DD:EE:FF";
  }
  const lat = Number(values.latitude);
  const lng = Number(values.longitude);
  if (values.latitude === "" || values.longitude === "" || !(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) {
    errors.location = "Enter a valid latitude and longitude";
  }
  return errors;
};
