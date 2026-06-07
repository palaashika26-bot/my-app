import { Request, Response } from "express";
import { parse } from "csv-parse/sync";
import { productsService } from "./products.service";
import { ApiResponse } from "../../../utils/ApiResponse";
import { ApiError } from "../../../utils/ApiError";
import prisma from "../../../config/prisma";
import { CreateProductInput, UpdateProductInput } from "./products.schema";

export const getProducts = async (req: Request, res: Response) => {
  const { page, limit, categorySlug, supplierId, search } = req.query as Record<string, string>;

  const { products, pagination } = await productsService.getProducts({
    page,
    limit,
    categorySlug,
    supplierId,
    search,
  });

  return ApiResponse.success(
    res,
    products,
    "Products fetched successfully",
    200,
    pagination
  );
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await productsService.getProductById(id);
  return ApiResponse.success(res, product, "Product fetched successfully");
};

export const createProduct = async (req: Request, res: Response) => {
  const data = req.body as CreateProductInput;
  const product = await productsService.createProduct(data);
  return ApiResponse.success(res, product, "Product created successfully", 201);
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body as UpdateProductInput;
  const product = await productsService.updateProduct(id, data);
  return ApiResponse.success(res, product, "Product updated successfully");
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  await productsService.deleteProduct(id);
  return ApiResponse.success(res, null, "Product deleted successfully");
};

export const importProductsFromCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const csvText = req.file.buffer.toString("utf-8");

    const rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: "CSV file is empty" });
    }

    const imported: string[] = [];
    const skipped: { row: string; reason: string }[] = [];

    for (const row of rows) {
      if (!row.name || !row.basePrice || !row.unit) {
        skipped.push({ row: row.name || "(unnamed)", reason: "Missing required fields: name, basePrice, or unit" });
        continue;
      }

      const basePrice = parseFloat(row.basePrice);
      if (isNaN(basePrice)) {
        skipped.push({ row: row.name, reason: "basePrice must be a number" });
        continue;
      }

      const productData: Record<string, unknown> = {
        name: row.name,
        slug: row.slug || row.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        description: row.description || null,
        unit: row.unit,
        moq: row.moq ? parseInt(row.moq, 10) : 1,
        basePrice,
        currency: row.currency || "CNY",
        isActive: row.isActive === "false" ? false : true,
        images: row.images ? [row.images] : [],
      };

      // Look up supplier by companyName
      if (row.supplierName && row.supplierName.trim() !== "") {
        const supplier = await prisma.supplier.findFirst({
          where: {
            companyName: {
              equals: row.supplierName.trim(),
              mode: "insensitive",
            },
          },
        });
        if (supplier) {
          productData.supplierId = supplier.id;
        } else {
          skipped.push({ row: row.name, reason: `Supplier "${row.supplierName}" not found in system` });
          continue;
        }
      }

      // Look up category by name
      if (row.categoryName && row.categoryName.trim() !== "") {
        const category = await prisma.productCategory.findFirst({
          where: {
            name: {
              equals: row.categoryName.trim(),
              mode: "insensitive",
            },
          },
        });
        if (category) {
          productData.categoryId = category.id;
        } else {
          skipped.push({ row: row.name, reason: `Category "${row.categoryName}" not found in system` });
          continue;
        }
      }

      try {
        const created = await prisma.product.create({ data: productData as Parameters<typeof prisma.product.create>[0]["data"] });
        imported.push(created.name);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Database error";
        skipped.push({ row: row.name, reason: message });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        imported: imported.length,
        skipped: skipped.length,
        importedNames: imported,
        skippedDetails: skipped,
      },
    });
  } catch (err: unknown) {
    console.error("[importProductsFromCSV]", err);
    return res.status(500).json({ success: false, error: "Failed to process CSV file" });
  }
};
