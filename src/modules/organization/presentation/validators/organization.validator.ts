import { z } from "zod"

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(80, "Organization name must not exceed 80 characters"),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
