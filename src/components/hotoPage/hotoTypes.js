// HOTO types as stored on records (`hotoType`) and how the portal labels them
export const HOTO_TYPES = [
  { value: "block", label: "Block" },
  { value: "gp", label: "GP" },
  { value: "ofc", label: "OFC" },
];

export const getHotoTypeLabel = (value) => HOTO_TYPES.find((type) => type.value === value)?.label || value;
