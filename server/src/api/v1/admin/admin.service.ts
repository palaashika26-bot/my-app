import bcrypt from "bcryptjs";
import { adminRepository } from "./admin.repository";
import { getPagination, buildPaginationMeta } from "../../../utils/pagination";
import { ApiError } from "../../../utils/ApiError";
import type { CreateStaffInput, UpdateStaffInput } from "./admin.schema";

interface ClientsQuery {
  page?: string;
  limit?: string;
  search?: string;
  isActive?: string;
}

export const adminService = {
  async getStats() {
    return adminRepository.getStats();
  },

  async getClients(query: ClientsQuery) {
    const { page, limit, skip, take } = getPagination(query);

    const isActive =
      query.isActive === "true"
        ? true
        : query.isActive === "false"
        ? false
        : undefined;

    const { clients, total } = await adminRepository.getClients({
      search: query.search,
      isActive,
      skip,
      take,
    });

    const pagination = buildPaginationMeta(total, page, limit);
    return { clients, pagination };
  },

  async getClientById(id: string) {
    return adminRepository.getClientById(id);
  },

  async getStaffUsers(includeInactive = false) {
    return adminRepository.getStaffUsers({ includeInactive });
  },

  async createStaff(data: CreateStaffInput) {
    const existing = await adminRepository.findUserByEmail(data.email);
    if (existing) {
      throw ApiError.badRequest("A user with this email already exists");
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    return adminRepository.createStaffUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      phone: data.phone,
      staffRole: data.staffRole,
    });
  },

  async updateStaff(id: string, data: UpdateStaffInput) {
    const staff = await adminRepository.findStaffById(id);
    if (!staff) throw ApiError.notFound("Staff member not found");

    const updateData: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      staffRole?: string;
      passwordHash?: string;
      isActive?: boolean;
    } = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.staffRole !== undefined) updateData.staffRole = data.staffRole;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return adminRepository.updateStaffUser(id, updateData);
  },

  async deleteStaff(id: string) {
    const staff = await adminRepository.findStaffById(id);
    if (!staff) throw ApiError.notFound("Staff member not found");
    await adminRepository.softDeleteStaffUser(id);
    return { id };
  },
};
