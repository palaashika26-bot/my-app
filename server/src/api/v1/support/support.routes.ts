import { Router } from "express";
import {
  createTicket,
  listTickets,
  getTicket,
  addMessage,
  updateStatus,
} from "./support.controller";
import { authenticate } from "../../../middleware/authenticate";
import { authorize } from "../../../middleware/authorize";
import { validate } from "../../../middleware/validate";
import { asyncHandler } from "../../../utils/asyncHandler";
import {
  createTicketSchema,
  ticketMessageSchema,
  ticketStatusSchema,
} from "./support.schema";

const router = Router();

router.use(authenticate);

// POST /api/v1/support/tickets — client opens a ticket
router.post(
  "/tickets",
  authorize(["CLIENT"]),
  validate(createTicketSchema),
  asyncHandler(createTicket)
);

// GET /api/v1/support/tickets — client sees own, admin/staff see all
router.get("/tickets", asyncHandler(listTickets));

// GET /api/v1/support/tickets/:id — detail + chat thread
router.get("/tickets/:id", asyncHandler(getTicket));

// POST /api/v1/support/tickets/:id/messages — append a chat message
router.post(
  "/tickets/:id/messages",
  validate(ticketMessageSchema),
  asyncHandler(addMessage)
);

// PATCH /api/v1/support/tickets/:id/status — admin/staff change status
router.patch(
  "/tickets/:id/status",
  authorize(["ADMIN", "STAFF"]),
  validate(ticketStatusSchema),
  asyncHandler(updateStatus)
);

export default router;
