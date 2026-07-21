import { z } from "zod";

export const updateRecordSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  programId: z.string().min(1, "Program is required"),
  yearLevel: z.number().min(1).max(6, "Year level is out of range"),
});

export type UpdateRecordFormData = z.infer<typeof updateRecordSchema>;

export const YEAR_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export const formatYearLevel = (n: number) =>
  n === 1 ? "1st Year"
  : n === 2 ? "2nd Year"
  : n === 3 ? "3rd Year"
  : n === 4 ? "4th Year"
  : n === 5 ? "5th Year"
  : "6th Year";

export const lightInputClass =
  "!bg-white/50 !text-foreground placeholder:!text-muted-foreground !border-border focus-visible:!ring-primary/30 focus-visible:!ring-offset-2 rounded-full h-12 px-6";
export const lightSelectTriggerClass =
  "w-full !bg-white/50 !text-foreground !border-border hover:bg-accent/10 focus-visible:!ring-primary/30 focus-visible:!ring-offset-2 truncate rounded-full h-12 px-6";
export const lightSelectContentClass = "bg-card text-foreground !border-border rounded-xl";
export const lightSelectItemClass = "text-foreground focus:bg-primary/10 focus:text-foreground";
