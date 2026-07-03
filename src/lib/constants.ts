export const JOB_CATEGORY_LABELS: Record<string, string> = {
  "lawn-mowing": "Lawn Mowing",
  gardening: "Gardening",
  "dog-walking": "Dog Walking",
  "snow-shoveling": "Snow Shoveling",
  "car-washing": "Car Washing",
  "leaf-raking": "Leaf Raking",
  "grocery-delivery": "Grocery Delivery",
  "furniture-moving": "Furniture Moving",
  "window-cleaning": "Window Cleaning",
  "bike-repair": "Bike Repair",
  "other-outdoor": "Other Outdoor",
};

export const JOB_CATEGORIES = [
  { value: "lawn-mowing", label: "Lawn Mowing" },
  { value: "gardening", label: "Gardening" },
  { value: "dog-walking", label: "Dog Walking" },
  { value: "snow-shoveling", label: "Snow Shoveling" },
  { value: "car-washing", label: "Car Washing" },
  { value: "leaf-raking", label: "Leaf Raking" },
  { value: "grocery-delivery", label: "Grocery Delivery" },
  { value: "furniture-moving", label: "Furniture Moving" },
  { value: "window-cleaning", label: "Window Cleaning" },
  { value: "bike-repair", label: "Bike Repair" },
  { value: "other-outdoor", label: "Other Outdoor" },
] as const;

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
