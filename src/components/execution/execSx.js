import { alpha } from "@mui/material/styles";

// Theme tints for backgrounds and borders, so execution pages use the portal palette
// instead of fixed colours: sx={{ bgcolor: tint("primary") }}
export const tint = (color, amount = 0.08) => (theme) => alpha(theme.palette[color].main, amount);
