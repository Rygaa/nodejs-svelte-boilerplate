import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../index";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { catchErrors } from "../../utils/catchErrors";
import fs from "fs";
import path from "path";

export const getIcons = protectedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/user/get-icons",
      tags: ["user"],
      summary: "Get SVG icons",
      description: "Get all available SVG icons (ADMIN only)",
      protect: true,
    },
  })
  .input(z.object({}))
  .query(async ({ ctx }) => {
    return await catchErrors(async (globalTx) => {
      // Check if user is ADMIN
      const iconsDir = path.join(__dirname, "../../storage/icons");

      // Check if icons directory exists
      if (!fs.existsSync(iconsDir)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Icons directory not found",
        });
      }

      const icons = fs.readdirSync(iconsDir);

      const iconsContent = icons.map((icon) => {
        const iconPath = path.join(iconsDir, icon);
        const readFile = fs.readFileSync(iconPath);
        const readFileAsSvg = readFile.toString();
        return {
          name: icon,
          content: readFileAsSvg,
        };
      });

      return {
        success: true,
        icons: iconsContent,
      };
    });
  });
