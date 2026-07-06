export const JOB_CATEGORY_LABELS: Record<string, string> = {
  "lawn-mowing": "Græsslåning",
  gardening: "Havearbejde",
  "dog-walking": "Luftning af hund",
  "snow-shoveling": "Snerydning",
  "car-washing": "Bilvask",
  "leaf-raking": "Løvrivning",
  "outdoor-help": "Udendørs småhjælp",
  "other-outdoor": "Andet udendørs",
};

export const JOB_CATEGORIES = [
  { value: "lawn-mowing", label: "Græsslåning" },
  { value: "gardening", label: "Havearbejde" },
  { value: "dog-walking", label: "Luftning af hund" },
  { value: "snow-shoveling", label: "Snerydning" },
  { value: "car-washing", label: "Bilvask" },
  { value: "leaf-raking", label: "Løvrivning" },
  { value: "outdoor-help", label: "Udendørs småhjælp" },
  { value: "other-outdoor", label: "Andet udendørs" },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  open: "Åben",
  assigned: "Tildelt",
  in_progress: "I gang",
  completed: "Fuldført",
  cancelled: "Annulleret",
  pending: "Afventer",
  accepted: "Accepteret",
  disputed: "Omtvistet",
};

export const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  disputed: "bg-red-200 text-red-900",
};
