import { z } from "zod";

// Types 
export interface ProgramOption {
  value: string;
  label: string;
}

// Schema 
export const selfRegisterSchema = z.object({
  studentId: z
    .string()
    .min(1, "Student ID is required")
    .regex(
      /^\d{2}-\d-\d{5}$/,
      "Student ID must follow format XX-X-XXXXX (e.g., 25-1-12345)"
    ),
  email: z.string().min(5, "Email is required").email("Invalid email"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  programId: z.string().min(1, "Program is required"),
  yearLevel: z.number().min(1).max(6, "Year level is out of range"),
});

export type SelfRegisterFormData = z.infer<typeof selfRegisterSchema>;

export const YEAR_LEVELS = [1, 2, 3, 4, 5, 6];

// Shared light/green field styling 
export const lightInputClass =
  "!bg-white/50 !text-foreground placeholder:!text-muted-foreground !border-border focus-visible:!ring-primary/30 focus-visible:!ring-offset-2 rounded-full h-12 px-6";
export const lightSelectTriggerClass =
  "w-full !bg-white/50 !text-foreground !border-border hover:bg-accent/10 focus-visible:!ring-primary/30 focus-visible:!ring-offset-2 truncate rounded-full h-12 px-6";
export const lightSelectContentClass = "bg-card text-foreground !border-border rounded-xl";
export const lightSelectItemClass = "text-foreground focus:bg-primary/10 focus:text-foreground";
