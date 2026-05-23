const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, Header, Footer, PageNumber
} = require('docx');
const fs = require('fs');

const BRAND   = "1E3A5F";
const ACCENT  = "2E75B6";
const MONO_BG = "F4F6F8";
const WHITE   = "FFFFFF";
const DARK_TXT= "1A1A2E";
const MED_TXT = "4A4A6A";
const BORDER_C= "C5CAD3";

const allBorders = (c=BORDER_C) => {
  const b = { style: BorderStyle.SINGLE, size: 1, color: c };
  return { top: b, bottom: b, left: b, right: b };
};

function headerCell(text, width) {
  return new TableCell({
    borders: allBorders(ACCENT),
    width: { size: width, type: WidthType.DXA },
    shading: { fill: ACCENT, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 18 })] })]
  });
}

function dataCell(text, width, mono=false, shade=WHITE) {
  return new TableCell({
    borders: allBorders(),
    width: { size: width, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, font: mono?"Courier New":"Arial", size: mono?16:17, color: mono?"1A4A6E":DARK_TXT })] })]
  });
}

function methodCell(method, width) {
  const C = { GET:{bg:"E8F5E9",txt:"1B5E20"}, POST:{bg:"E3F2FD",txt:"0D47A1"}, PATCH:{bg:"FFF3E0",txt:"E65100"}, DELETE:{bg:"FFEBEE",txt:"B71C1C"} };
  const c = C[method] || {bg:"F3E5F5",txt:"4A148C"};
  return new TableCell({
    borders: allBorders(), width: { size: width, type: WidthType.DXA },
    shading: { fill: c.bg, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text: method, bold: true, font: "Courier New", size: 16, color: c.txt })] })]
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
    spacing: { before: 0, after: 280 },
    border: { bottom: { style: BorderStyle.THICK, size: 8, color: ACCENT, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 36, bold: true, color: BRAND })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER_C, space: 2 } },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: ACCENT })]
  });
}
function body(text) {
  return new Paragraph({ spacing: { before: 0, after: 120 }, children: [new TextRun({ text, font: "Arial", size: 20, color: DARK_TXT })] });
}
function gap() { return new Paragraph({ children: [new TextRun("")], spacing: { before: 0, after: 80 } }); }

function codeBlock(text) {
  return text.split('\n').map(line => new Paragraph({
    children: [new TextRun({ text: line || " ", font: "Courier New", size: 16, color: "1A3A5C" })],
    spacing: { before: 0, after: 0, line: 240 },
    shading: { fill: MONO_BG, type: ShadingType.CLEAR },
    indent: { left: 240, right: 240 },
    border: {
      left: { style: BorderStyle.THICK, size: 12, color: ACCENT, space: 6 },
      top: { style: BorderStyle.NONE, size: 0, color: WHITE },
      bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
      right: { style: BorderStyle.NONE, size: 0, color: WHITE }
    }
  }));
}

function endpointTable(rows) {
  const [mW,pW,aW,dW] = [900,2900,1060,4500];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [mW,pW,aW,dW],
    rows: [
      new TableRow({ tableHeader:true, children:[headerCell("Method",mW),headerCell("Path",pW),headerCell("Auth",aW),headerCell("Description",dW)] }),
      ...rows.map((r,i)=>new TableRow({children:[
        methodCell(r[0],mW),
        dataCell(r[1],pW,true, i%2===0?WHITE:"F8F9FB"),
        dataCell(r[2],aW,false,i%2===0?WHITE:"F8F9FB"),
        dataCell(r[3],dW,false,i%2===0?WHITE:"F8F9FB"),
      ]}))
    ]
  });
}

function envTable(rows) {
  const [vW,eW,dW]=[2700,2460,4200];
  return new Table({
    width:{size:9360,type:WidthType.DXA}, columnWidths:[vW,eW,dW],
    rows:[
      new TableRow({tableHeader:true,children:[headerCell("Variable",vW),headerCell("Example Value",eW),headerCell("Description",dW)]}),
      ...rows.map((r,i)=>new TableRow({children:[
        dataCell(r[0],vW,true, i%2===0?WHITE:"F8F9FB"),
        dataCell(r[1],eW,true, i%2===0?WHITE:"F8F9FB"),
        dataCell(r[2],dW,false,i%2===0?WHITE:"F8F9FB"),
      ]}))
    ]
  });
}

function namingTable(rows) {
  const [lW,cW,eW]=[2400,2960,4000];
  return new Table({
    width:{size:9360,type:WidthType.DXA}, columnWidths:[lW,cW,eW],
    rows:[
      new TableRow({tableHeader:true,children:[headerCell("Layer",lW),headerCell("Convention",cW),headerCell("Example",eW)]}),
      ...rows.map((r,i)=>new TableRow({children:[
        dataCell(r[0],lW,false,i%2===0?WHITE:"F8F9FB"),
        dataCell(r[1],cW,true, i%2===0?WHITE:"F8F9FB"),
        dataCell(r[2],eW,true, i%2===0?WHITE:"F8F9FB"),
      ]}))
    ]
  });
}

// ── COVER ─────────────────────────────────────────────────────────────────────
const cover = [
  ...[1,2,3,4,5,6].map(()=>gap()),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:120},children:[new TextRun({text:"ShopApp",font:"Arial",size:80,bold:true,color:BRAND})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:120},
    border:{bottom:{style:BorderStyle.THICK,size:8,color:ACCENT,space:6}},
    children:[new TextRun({text:"Complete Architecture Reference",font:"Arial",size:40,color:ACCENT})]}),
  gap(),gap(),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:80},children:[new TextRun({text:"Full-Stack E-Commerce Web Application",font:"Arial",size:26,color:MED_TXT,italics:true})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:80},children:[new TextRun({text:"React + Vite  |  Node.js + Express  |  PostgreSQL + Prisma  |  Redis  |  Stripe  |  Cloudinary",font:"Arial",size:20,color:MED_TXT})]}),
  gap(),gap(),gap(),gap(),
  new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"Generated: May 2026",font:"Arial",size:20,color:MED_TXT})]}),
];

// ── SECTION 1: DIRECTORY TREE ─────────────────────────────────────────────────
const dirTree = `shopapp/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json                     # root workspace config
├── README.md
│
├── client/                          # React + Vite frontend
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── public/
│   │   ├── favicon.ico
│   │   └── robots.txt
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── vite-env.d.ts
│       ├── api/                     # Axios instances & typed callers
│       │   ├── axiosClient.ts
│       │   ├── auth.api.ts
│       │   ├── cart.api.ts
│       │   ├── catalog.api.ts
│       │   ├── orders.api.ts
│       │   ├── payments.api.ts
│       │   ├── reviews.api.ts
│       │   ├── search.api.ts
│       │   └── users.api.ts
│       ├── assets/
│       │   ├── fonts/
│       │   └── images/
│       ├── components/              # Reusable UI components
│       │   ├── common/
│       │   │   ├── Avatar.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Button.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Dropdown.tsx
│       │   │   ├── ErrorBoundary.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Pagination.tsx
│       │   │   ├── Spinner.tsx
│       │   │   ├── StarRating.tsx
│       │   │   ├── Table.tsx
│       │   │   ├── Toast.tsx
│       │   │   └── Tooltip.tsx
│       │   ├── layout/
│       │   │   ├── AdminSidebar.tsx
│       │   │   ├── Footer.tsx
│       │   │   ├── Header.tsx
│       │   │   ├── MobileNav.tsx
│       │   │   └── Navbar.tsx
│       │   ├── product/
│       │   │   ├── ProductCard.tsx
│       │   │   ├── ProductFilters.tsx
│       │   │   ├── ProductGallery.tsx
│       │   │   ├── ProductGrid.tsx
│       │   │   ├── ProductVariantSelector.tsx
│       │   │   └── ReviewList.tsx
│       │   ├── cart/
│       │   │   ├── CartDrawer.tsx
│       │   │   ├── CartItem.tsx
│       │   │   └── CartSummary.tsx
│       │   ├── order/
│       │   │   ├── OrderCard.tsx
│       │   │   ├── OrderStatusBadge.tsx
│       │   │   └── OrderTimeline.tsx
│       │   └── admin/
│       │       ├── AnalyticsChart.tsx
│       │       ├── DataTable.tsx
│       │       ├── ProductForm.tsx
│       │       └── UserForm.tsx
│       ├── contexts/
│       │   ├── AuthContext.tsx
│       │   ├── CartContext.tsx
│       │   └── ThemeContext.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useCart.ts
│       │   ├── useDebounce.ts
│       │   ├── useInfiniteScroll.ts
│       │   ├── useLocalStorage.ts
│       │   ├── useOrders.ts
│       │   ├── useProducts.ts
│       │   └── useToast.ts
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── ForgotPasswordPage.tsx
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   └── ResetPasswordPage.tsx
│       │   ├── catalog/
│       │   │   ├── CategoryPage.tsx
│       │   │   ├── ProductDetailPage.tsx
│       │   │   └── ProductListPage.tsx
│       │   ├── cart/
│       │   │   └── CartPage.tsx
│       │   ├── checkout/
│       │   │   ├── CheckoutPage.tsx
│       │   │   ├── OrderConfirmationPage.tsx
│       │   │   └── PaymentCancelPage.tsx
│       │   ├── orders/
│       │   │   ├── OrderDetailPage.tsx
│       │   │   └── OrderHistoryPage.tsx
│       │   ├── user/
│       │   │   ├── AddressesPage.tsx
│       │   │   ├── ProfilePage.tsx
│       │   │   └── SettingsPage.tsx
│       │   ├── search/
│       │   │   └── SearchPage.tsx
│       │   ├── admin/
│       │   │   ├── AdminDashboardPage.tsx
│       │   │   ├── AdminOrdersPage.tsx
│       │   │   ├── AdminProductsPage.tsx
│       │   │   └── AdminUsersPage.tsx
│       │   ├── HomePage.tsx
│       │   └── NotFoundPage.tsx
│       ├── router/
│       │   ├── AppRouter.tsx
│       │   ├── AdminRoute.tsx
│       │   ├── ProtectedRoute.tsx
│       │   └── routes.ts
│       ├── store/                   # Zustand stores
│       │   ├── authStore.ts
│       │   ├── cartStore.ts
│       │   └── uiStore.ts
│       ├── styles/
│       │   ├── globals.css
│       │   └── tailwind.config.ts
│       ├── types/
│       │   ├── api.types.ts
│       │   ├── auth.types.ts
│       │   ├── cart.types.ts
│       │   ├── order.types.ts
│       │   ├── product.types.ts
│       │   └── user.types.ts
│       └── utils/
│           ├── currency.ts
│           ├── date.ts
│           ├── errorHandler.ts
│           └── validators.ts
│
└── server/                          # Node.js + Express backend
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    ├── jest.config.ts
    ├── nodemon.json
    ├── prisma/
    │   ├── schema.prisma
    │   ├── seed.ts
    │   └── migrations/
    └── src/
        ├── app.ts                   # Express app bootstrap
        ├── server.ts                # HTTP server entry point
        ├── config/
        │   ├── env.ts
        │   ├── cors.ts
        │   ├── logger.ts
        │   ├── prisma.ts
        │   ├── redis.ts
        │   ├── stripe.ts
        │   └── cloudinary.ts
        ├── api/v1/
        │   ├── index.ts
        │   ├── auth/
        │   │   ├── auth.routes.ts
        │   │   ├── auth.controller.ts
        │   │   ├── auth.service.ts
        │   │   ├── auth.repository.ts
        │   │   ├── auth.schema.ts
        │   │   └── auth.test.ts
        │   ├── users/
        │   │   ├── users.routes.ts
        │   │   ├── users.controller.ts
        │   │   ├── users.service.ts
        │   │   ├── users.repository.ts
        │   │   ├── users.schema.ts
        │   │   └── users.test.ts
        │   ├── addresses/
        │   │   ├── addresses.routes.ts
        │   │   ├── addresses.controller.ts
        │   │   ├── addresses.service.ts
        │   │   ├── addresses.repository.ts
        │   │   └── addresses.schema.ts
        │   ├── products/
        │   │   ├── products.routes.ts
        │   │   ├── products.controller.ts
        │   │   ├── products.service.ts
        │   │   ├── products.repository.ts
        │   │   ├── products.schema.ts
        │   │   └── products.test.ts
        │   ├── categories/
        │   │   ├── categories.routes.ts
        │   │   ├── categories.controller.ts
        │   │   ├── categories.service.ts
        │   │   ├── categories.repository.ts
        │   │   └── categories.schema.ts
        │   ├── variants/
        │   │   ├── variants.routes.ts
        │   │   ├── variants.controller.ts
        │   │   ├── variants.service.ts
        │   │   ├── variants.repository.ts
        │   │   └── variants.schema.ts
        │   ├── inventory/
        │   │   ├── inventory.routes.ts
        │   │   ├── inventory.controller.ts
        │   │   ├── inventory.service.ts
        │   │   └── inventory.repository.ts
        │   ├── cart/
        │   │   ├── cart.routes.ts
        │   │   ├── cart.controller.ts
        │   │   ├── cart.service.ts
        │   │   ├── cart.repository.ts
        │   │   ├── cart.schema.ts
        │   │   └── cart.test.ts
        │   ├── orders/
        │   │   ├── orders.routes.ts
        │   │   ├── orders.controller.ts
        │   │   ├── orders.service.ts
        │   │   ├── orders.repository.ts
        │   │   ├── orders.schema.ts
        │   │   └── orders.test.ts
        │   ├── payments/
        │   │   ├── payments.routes.ts
        │   │   ├── payments.controller.ts
        │   │   ├── payments.service.ts
        │   │   ├── payments.webhook.ts
        │   │   └── payments.schema.ts
        │   ├── reviews/
        │   │   ├── reviews.routes.ts
        │   │   ├── reviews.controller.ts
        │   │   ├── reviews.service.ts
        │   │   ├── reviews.repository.ts
        │   │   └── reviews.schema.ts
        │   ├── search/
        │   │   ├── search.routes.ts
        │   │   ├── search.controller.ts
        │   │   └── search.service.ts
        │   ├── uploads/
        │   │   ├── uploads.routes.ts
        │   │   ├── uploads.controller.ts
        │   │   └── uploads.service.ts
        │   └── admin/
        │       ├── admin.routes.ts
        │       ├── admin.controller.ts
        │       └── admin.service.ts
        ├── middleware/
        │   ├── authenticate.ts
        │   ├── authorize.ts
        │   ├── errorHandler.ts
        │   ├── notFound.ts
        │   ├── rateLimiter.ts
        │   ├── requestLogger.ts
        │   ├── validate.ts
        │   └── rawBody.ts
        ├── services/
        │   ├── email.service.ts
        │   ├── token.service.ts
        │   ├── cache.service.ts
        │   └── upload.service.ts
        ├── types/
        │   ├── express.d.ts
        │   ├── common.types.ts
        │   └── pagination.types.ts
        ├── utils/
        │   ├── ApiError.ts
        │   ├── ApiResponse.ts
        │   ├── asyncHandler.ts
        │   ├── hash.ts
        │   ├── pagination.ts
        │   └── slugify.ts
        └── __tests__/
            ├── setup.ts
            ├── helpers/
            │   ├── dbHelper.ts
            │   └── authHelper.ts
            └── fixtures/
                ├── users.fixture.ts
                └── products.fixture.ts`;

const section1 = [
  h1("1. Full Directory Tree"),
  body("Every folder and file from the monorepo root. /client = React + Vite frontend; /server = Node.js + Express backend."),
  gap(),
  ...codeBlock(dirTree),
];

// ── SECTION 2: API ENDPOINTS ──────────────────────────────────────────────────
const section2 = [
  h1("2. All API Endpoints"),

  h2("Auth — /api/v1/auth"),
  endpointTable([
    ["POST",  "/api/v1/auth/register",           "Public",       "Create account, send verification email"],
    ["POST",  "/api/v1/auth/login",              "Public",       "Validate credentials, return access + refresh token"],
    ["POST",  "/api/v1/auth/logout",             "Bearer",       "Revoke refresh token, clear Redis session"],
    ["POST",  "/api/v1/auth/refresh",            "Cookie/Bearer","Rotate refresh token, issue new access token"],
    ["POST",  "/api/v1/auth/forgot-password",    "Public",       "Send password-reset email with signed token"],
    ["POST",  "/api/v1/auth/reset-password",     "Public",       "Validate reset token, update hashed password"],
    ["GET",   "/api/v1/auth/verify-email/:token","Public",       "Confirm email address"],
    ["GET",   "/api/v1/auth/me",                 "Bearer",       "Return currently authenticated user"],
  ]), gap(),

  h2("Users — /api/v1/users"),
  endpointTable([
    ["GET",   "/api/v1/users/profile",          "Bearer",     "Get own profile"],
    ["PATCH", "/api/v1/users/profile",          "Bearer",     "Update name, phone, preferences"],
    ["POST",  "/api/v1/users/avatar",           "Bearer",     "Upload avatar to Cloudinary"],
    ["DELETE","/api/v1/users/avatar",           "Bearer",     "Remove avatar"],
    ["PATCH", "/api/v1/users/change-password",  "Bearer",     "Verify old password, set new one"],
    ["GET",   "/api/v1/users/:id",              "Admin",      "Get any user by ID"],
    ["GET",   "/api/v1/users",                  "Admin",      "List all users (paginated + filterable)"],
    ["PATCH", "/api/v1/users/:id/role",         "SuperAdmin", "Change user role"],
    ["DELETE","/api/v1/users/:id",              "Admin",      "Soft-delete user"],
  ]), gap(),

  h2("Addresses — /api/v1/addresses"),
  endpointTable([
    ["GET",   "/api/v1/addresses",              "Bearer","List own addresses"],
    ["POST",  "/api/v1/addresses",              "Bearer","Add new address"],
    ["PATCH", "/api/v1/addresses/:id",          "Bearer","Update address"],
    ["DELETE","/api/v1/addresses/:id",          "Bearer","Remove address"],
    ["PATCH", "/api/v1/addresses/:id/default",  "Bearer","Set address as default"],
  ]), gap(),

  h2("Products — /api/v1/products"),
  endpointTable([
    ["GET",   "/api/v1/products",                      "Public","List products (paginated, filterable, sortable)"],
    ["GET",   "/api/v1/products/:id",                  "Public","Get single product with variants & images"],
    ["GET",   "/api/v1/products/:id/reviews",          "Public","Paginated reviews for a product"],
    ["POST",  "/api/v1/products",                      "Admin", "Create product"],
    ["PATCH", "/api/v1/products/:id",                  "Admin", "Update product fields"],
    ["DELETE","/api/v1/products/:id",                  "Admin", "Soft-delete product"],
    ["POST",  "/api/v1/products/:id/images",           "Admin", "Upload product images (Cloudinary)"],
    ["DELETE","/api/v1/products/:id/images/:imageId",  "Admin", "Delete product image"],
  ]), gap(),

  h2("Categories — /api/v1/categories"),
  endpointTable([
    ["GET",   "/api/v1/categories",     "Public","List all categories (nested tree)"],
    ["GET",   "/api/v1/categories/:id", "Public","Get category + child categories"],
    ["POST",  "/api/v1/categories",     "Admin", "Create category"],
    ["PATCH", "/api/v1/categories/:id", "Admin", "Update category"],
    ["DELETE","/api/v1/categories/:id", "Admin", "Delete category"],
  ]), gap(),

  h2("Variants — /api/v1/products/:id/variants"),
  endpointTable([
    ["GET",   "/api/v1/products/:id/variants",           "Public","List variants for a product"],
    ["POST",  "/api/v1/products/:id/variants",           "Admin", "Add variant (size/color/etc.)"],
    ["PATCH", "/api/v1/products/:id/variants/:variantId","Admin", "Update variant"],
    ["DELETE","/api/v1/products/:id/variants/:variantId","Admin", "Delete variant"],
  ]), gap(),

  h2("Inventory — /api/v1/inventory"),
  endpointTable([
    ["GET",  "/api/v1/inventory",           "Admin","List all inventory records"],
    ["GET",  "/api/v1/inventory/:variantId","Admin","Stock level for a variant"],
    ["PATCH","/api/v1/inventory/:variantId","Admin","Adjust stock count"],
    ["GET",  "/api/v1/inventory/low-stock", "Admin","Items below threshold"],
  ]), gap(),

  h2("Cart — /api/v1/cart"),
  endpointTable([
    ["GET",   "/api/v1/cart",               "Public/Bearer","Get cart (guest by sessionId or user)"],
    ["POST",  "/api/v1/cart/items",         "Public/Bearer","Add item to cart"],
    ["PATCH", "/api/v1/cart/items/:itemId", "Public/Bearer","Update item quantity"],
    ["DELETE","/api/v1/cart/items/:itemId", "Public/Bearer","Remove item"],
    ["DELETE","/api/v1/cart",               "Public/Bearer","Clear entire cart"],
    ["POST",  "/api/v1/cart/merge",         "Bearer",       "Merge guest cart into user cart on login"],
  ]), gap(),

  h2("Orders — /api/v1/orders"),
  endpointTable([
    ["GET",  "/api/v1/orders",             "Bearer","List own orders (paginated)"],
    ["GET",  "/api/v1/orders/:id",         "Bearer","Get order detail"],
    ["POST", "/api/v1/orders",             "Bearer","Create order from cart"],
    ["POST", "/api/v1/orders/:id/cancel",  "Bearer","Cancel order if still pending"],
    ["GET",  "/api/v1/orders/admin",       "Admin", "List all orders"],
    ["PATCH","/api/v1/orders/:id/status",  "Admin", "Update order status"],
  ]), gap(),

  h2("Payments — /api/v1/payments"),
  endpointTable([
    ["POST", "/api/v1/payments/checkout-session", "Bearer",        "Create Stripe checkout session"],
    ["POST", "/api/v1/payments/webhook",           "None (raw sig)","Handle Stripe webhook events"],
    ["POST", "/api/v1/payments/:orderId/refund",   "Admin",         "Initiate full or partial refund"],
    ["GET",  "/api/v1/payments/:orderId",          "Bearer",        "Get payment record for an order"],
  ]), gap(),

  h2("Reviews — /api/v1/reviews"),
  endpointTable([
    ["POST",  "/api/v1/reviews",     "Bearer",             "Submit review (once per purchased product)"],
    ["PATCH", "/api/v1/reviews/:id", "Bearer (owner)",     "Edit own review"],
    ["DELETE","/api/v1/reviews/:id", "Bearer (owner/Admin)","Delete review"],
  ]), gap(),

  h2("Search — /api/v1/search"),
  endpointTable([
    ["GET","/api/v1/search",             "Public","Full-text + filtered product search"],
    ["GET","/api/v1/search/suggestions", "Public","Autocomplete suggestions (Redis cache)"],
  ]), gap(),

  h2("Uploads — /api/v1/uploads"),
  endpointTable([
    ["POST",  "/api/v1/uploads/image",           "Admin","Upload generic image to Cloudinary"],
    ["DELETE","/api/v1/uploads/image/:publicId",  "Admin","Delete image from Cloudinary"],
  ]), gap(),

  h2("Admin — /api/v1/admin"),
  endpointTable([
    ["GET","/api/v1/admin/analytics/overview",     "Admin","Revenue, orders, user counts"],
    ["GET","/api/v1/admin/analytics/sales",        "Admin","Sales over time (by day/week/month)"],
    ["GET","/api/v1/admin/analytics/top-products", "Admin","Best-selling products"],
  ]),
];

// ── SECTION 3: MODULE DIAGRAM ─────────────────────────────────────────────────
const section3 = [
  h1("3. Atomic Module Connection Diagram"),
  body("Arrows show the direction of import/call dependency from HTTP entry point down to Prisma models."),
  gap(),
  ...codeBlock(`HTTP Request
     |
     v
[ app.ts (Express) ]
cors -> rawBody -> requestLogger -> rateLimiter -> json -> /api/v1 router
     |
     v
[ api/v1/index.ts ]  <-- aggregates all route files
     |
     |---> [Public Route]    validate(schema), rateLimiter
     |---> [Protected Route] authenticate, validate(schema)
     |---> [Admin Route]     authenticate, authorize([...]), validate

=== ROUTES --> CONTROLLERS ============================================

auth.routes.ts       -->  auth.controller.ts
users.routes.ts      -->  users.controller.ts
addresses.routes.ts  -->  addresses.controller.ts
products.routes.ts   -->  products.controller.ts
categories.routes.ts -->  categories.controller.ts
variants.routes.ts   -->  variants.controller.ts
inventory.routes.ts  -->  inventory.controller.ts
cart.routes.ts       -->  cart.controller.ts
orders.routes.ts     -->  orders.controller.ts
payments.routes.ts   -->  payments.controller.ts
reviews.routes.ts    -->  reviews.controller.ts
search.routes.ts     -->  search.controller.ts
uploads.routes.ts    -->  uploads.controller.ts
admin.routes.ts      -->  admin.controller.ts

=== CONTROLLERS --> SERVICES ==========================================

auth.controller      -->  auth.service
                     -->  token.service     (sign / verify JWT)
                     -->  email.service     (welcome, reset email)
users.controller     -->  users.service
                     -->  upload.service    (avatar -> Cloudinary)
products.controller  -->  products.service
                     -->  cache.service     (read-through cache)
                     -->  upload.service    (product images)
cart.controller      -->  cart.service
                     -->  cache.service     (guest cart in Redis)
orders.controller    -->  orders.service
                     -->  inventory.service (reserve/release stock)
                     -->  email.service     (order confirmation)
                     -->  cart.service      (clear cart on success)
payments.controller  -->  payments.service
                     -->  orders.service    (update status on webhook)
                     -->  email.service     (payment receipt)
                     -->  stripe SDK
reviews.controller   -->  reviews.service
                     -->  orders.service    (verify purchase)
search.controller    -->  search.service
                     -->  cache.service     (suggestion cache)
admin.controller     -->  admin.service
                     -->  cache.service

=== SERVICES --> REPOSITORIES =========================================

auth.service         -->  auth.repository
                     -->  users.repository (lookup by email)
cart.service         -->  cart.repository
                     -->  variants.repository (price / stock check)
orders.service       -->  orders.repository
                     -->  cart.repository
                     -->  inventory.repository
payments.service     -->  payments.repository
                     -->  orders.repository
reviews.service      -->  reviews.repository
                     -->  products.repository (update avg rating)
admin.service        -->  users.repository
                     -->  orders.repository
                     -->  products.repository

=== REPOSITORIES --> PRISMA MODELS ====================================

auth.repository      -->  prisma.User, prisma.RefreshToken
users.repository     -->  prisma.User
addresses.repository -->  prisma.Address
products.repository  -->  prisma.Product, prisma.ProductImage, prisma.Tag
categories.repository->  prisma.Category
variants.repository  -->  prisma.ProductVariant
inventory.repository -->  prisma.Inventory
cart.repository      -->  prisma.Cart, prisma.CartItem
orders.repository    -->  prisma.Order, prisma.OrderItem
payments.repository  -->  prisma.Payment
reviews.repository   -->  prisma.Review

=== CROSS-CUTTING SERVICES ============================================

token.service    -->  jsonwebtoken + cache.service (revocation)
cache.service    -->  redis (ioredis client)
email.service    -->  nodemailer + HTML templates
upload.service   -->  Cloudinary SDK

=== SHARED UTILITIES ==================================================

asyncHandler     -->  wraps all controllers (removes try/catch boilerplate)
ApiError         -->  thrown by services, caught by errorHandler middleware
ApiResponse      -->  standard { success, data, message } envelope
validate()       -->  Zod schemas (*.schema.ts per module)`),
];

// ── SECTION 4: DATABASE SCHEMA ────────────────────────────────────────────────
const section4 = [
  h1("4. Database Schema"),
  body("Full Prisma schema for PostgreSQL. All monetary fields use Decimal(12,2). Soft deletes use deletedAt nullable timestamps."),
  gap(),
  ...codeBlock(`// prisma/schema.prisma

generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"; url = env("DATABASE_URL") }

// ── ENUMS ──────────────────────────────────────────────────────────
enum Role          { CUSTOMER  ADMIN  SUPER_ADMIN }
enum OrderStatus   { PENDING PAYMENT_PENDING PAYMENT_FAILED CONFIRMED
                     PROCESSING SHIPPED DELIVERED CANCELLED REFUNDED }
enum PaymentStatus { PENDING SUCCEEDED FAILED REFUNDED PARTIALLY_REFUNDED }
enum PaymentMethod { STRIPE }

// ── USER & AUTH ────────────────────────────────────────────────────
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  passwordHash   String
  firstName      String
  lastName       String
  phone          String?
  avatarUrl      String?
  avatarPublicId String?
  role           Role     @default(CUSTOMER)
  emailVerified  Boolean  @default(false)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
  refreshTokens  RefreshToken[]
  addresses      Address[]
  cart           Cart?
  orders         Order[]
  reviews        Review[]
  @@index([email])
  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields:[userId], references:[id], onDelete:Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  revokedAt DateTime?
  family    String
  @@index([userId])
  @@map("refresh_tokens")
}

// ── ADDRESS ────────────────────────────────────────────────────────
model Address {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields:[userId], references:[id], onDelete:Cascade)
  label      String?
  firstName  String
  lastName   String
  line1      String
  line2      String?
  city       String
  state      String
  postalCode String
  country    String
  phone      String?
  isDefault  Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  orders     Order[]  @relation("ShippingAddress")
  @@index([userId])
  @@map("addresses")
}

// ── CATALOG ────────────────────────────────────────────────────────
model Category {
  id          String     @id @default(uuid())
  name        String
  slug        String     @unique
  description String?
  imageUrl    String?
  parentId    String?
  parent      Category?  @relation("CategoryTree", fields:[parentId], references:[id])
  children    Category[] @relation("CategoryTree")
  products    Product[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  @@index([slug])
  @@map("categories")
}

model Tag {
  id       String    @id @default(uuid())
  name     String    @unique
  slug     String    @unique
  products Product[] @relation("ProductTags")
  @@map("tags")
}

model Product {
  id           String           @id @default(uuid())
  name         String
  slug         String           @unique
  description  String
  basePrice    Decimal          @db.Decimal(12,2)
  comparePrice Decimal?         @db.Decimal(12,2)
  categoryId   String
  category     Category         @relation(fields:[categoryId], references:[id])
  tags         Tag[]            @relation("ProductTags")
  images       ProductImage[]
  variants     ProductVariant[]
  reviews      Review[]
  isPublished  Boolean          @default(false)
  isFeatured   Boolean          @default(false)
  avgRating    Float            @default(0)
  reviewCount  Int              @default(0)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  deletedAt    DateTime?
  @@index([slug])
  @@map("products")
}

model ProductImage {
  id        String   @id @default(uuid())
  productId String
  product   Product  @relation(fields:[productId], references:[id], onDelete:Cascade)
  url       String
  publicId  String
  altText   String?
  position  Int      @default(0)
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())
  @@map("product_images")
}

model ProductVariant {
  id           String      @id @default(uuid())
  productId    String
  product      Product     @relation(fields:[productId], references:[id], onDelete:Cascade)
  sku          String      @unique
  name         String
  options      Json
  price        Decimal     @db.Decimal(12,2)
  comparePrice Decimal?    @db.Decimal(12,2)
  weight       Float?
  isActive     Boolean     @default(true)
  inventory    Inventory?
  cartItems    CartItem[]
  orderItems   OrderItem[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  @@index([productId])
  @@map("product_variants")
}

// ── INVENTORY ──────────────────────────────────────────────────────
model Inventory {
  id        String         @id @default(uuid())
  variantId String         @unique
  variant   ProductVariant @relation(fields:[variantId], references:[id], onDelete:Cascade)
  quantity  Int            @default(0)
  reserved  Int            @default(0)
  threshold Int            @default(5)
  updatedAt DateTime       @updatedAt
  @@map("inventory")
}

// ── CART ───────────────────────────────────────────────────────────
model Cart {
  id        String     @id @default(uuid())
  userId    String?    @unique
  user      User?      @relation(fields:[userId], references:[id], onDelete:Cascade)
  sessionId String?    @unique
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  @@map("carts")
}

model CartItem {
  id         String         @id @default(uuid())
  cartId     String
  cart       Cart           @relation(fields:[cartId], references:[id], onDelete:Cascade)
  variantId  String
  variant    ProductVariant @relation(fields:[variantId], references:[id])
  quantity   Int
  priceAtAdd Decimal        @db.Decimal(12,2)
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  @@unique([cartId, variantId])
  @@map("cart_items")
}

// ── ORDERS ─────────────────────────────────────────────────────────
model Order {
  id                String      @id @default(uuid())
  orderNumber       String      @unique
  userId            String
  user              User        @relation(fields:[userId], references:[id])
  shippingAddressId String
  shippingAddress   Address     @relation("ShippingAddress", fields:[shippingAddressId], references:[id])
  items             OrderItem[]
  status            OrderStatus @default(PENDING)
  subtotal          Decimal     @db.Decimal(12,2)
  shippingCost      Decimal     @db.Decimal(12,2) @default(0)
  taxAmount         Decimal     @db.Decimal(12,2) @default(0)
  discountAmount    Decimal     @db.Decimal(12,2) @default(0)
  total             Decimal     @db.Decimal(12,2)
  notes             String?
  payment           Payment?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  @@index([userId])
  @@index([orderNumber])
  @@map("orders")
}

model OrderItem {
  id         String         @id @default(uuid())
  orderId    String
  order      Order          @relation(fields:[orderId], references:[id], onDelete:Cascade)
  variantId  String
  variant    ProductVariant @relation(fields:[variantId], references:[id])
  quantity   Int
  unitPrice  Decimal        @db.Decimal(12,2)
  totalPrice Decimal        @db.Decimal(12,2)
  snapshot   Json
  @@map("order_items")
}

// ── PAYMENTS ───────────────────────────────────────────────────────
model Payment {
  id                    String        @id @default(uuid())
  orderId               String        @unique
  order                 Order         @relation(fields:[orderId], references:[id])
  method                PaymentMethod @default(STRIPE)
  status                PaymentStatus @default(PENDING)
  stripeSessionId       String?       @unique
  stripePaymentIntentId String?       @unique
  stripeChargeId        String?
  amount                Decimal       @db.Decimal(12,2)
  currency              String        @default("usd")
  refundedAmount        Decimal       @db.Decimal(12,2) @default(0)
  paidAt                DateTime?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
  @@map("payments")
}

// ── REVIEWS ────────────────────────────────────────────────────────
model Review {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields:[userId], references:[id])
  productId  String
  product    Product  @relation(fields:[productId], references:[id], onDelete:Cascade)
  rating     Int
  title      String?
  body       String?
  isVerified Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@unique([userId, productId])
  @@index([productId])
  @@map("reviews")
}`),
  gap(),
  h2("Entity Relationship Summary"),
  ...codeBlock(`User ──< RefreshToken
User ──< Address
User ──  Cart          (1:1)
User ──< Order
User ──< Review

Category   ──< Category        (self-referential tree)
Category   ──< Product
Tag        >──< Product        (many-to-many via _ProductTags)
Product    ──< ProductImage
Product    ──< ProductVariant
Product    ──< Review
ProductVariant ──  Inventory   (1:1)
ProductVariant ──< CartItem
ProductVariant ──< OrderItem

Cart      ──< CartItem
CartItem  --> ProductVariant

Order     ──< OrderItem
Order     ──  Payment          (1:1)
Order     --> Address          (shipping)
OrderItem --> ProductVariant`),
];

// ── SECTION 5: MIDDLEWARE ─────────────────────────────────────────────────────
const section5 = [
  h1("5. Middleware Chain"),

  h2("Global (applied to every request)"),
  ...codeBlock(`cors()
  └─ Allow origins from CLIENT_URL, credentials: true
rawBody()   <- POST /api/v1/payments/webhook only
  └─ Preserve Buffer for Stripe signature verification
requestLogger()
  └─ Morgan combined format -> Winston
express.json({ limit: '10kb' })
express.urlencoded({ extended: true })
rateLimiter()  <- Redis-backed, 100 req/15min per IP`),
  gap(),

  h2("Public Route Chain"),
  body("Example: GET /api/v1/products  or  POST /api/v1/auth/login"),
  ...codeBlock(`[global middlewares]
     |
     v
validate(schema)       <- Zod, 422 on failure
     |
     v
controller()           <- asyncHandler wrapped
     |
     v
ApiResponse.success(res, data)`),
  gap(),

  h2("Protected Route Chain"),
  body("Example: GET /api/v1/orders  or  POST /api/v1/cart/items"),
  ...codeBlock(`[global middlewares]
     |
     v
authenticate()
  └─ Extract Bearer from Authorization header
  └─ jwt.verify(token, ACCESS_TOKEN_SECRET)
  └─ Check not in Redis revocation list
  └─ Attach decoded payload to req.user
  └─ On fail -> 401 Unauthorized
     |
     v
validate(schema)       <- 422 on Zod failure
     |
     v
controller()           <- asyncHandler wrapped`),
  gap(),

  h2("Admin Route Chain"),
  body("Example: PATCH /api/v1/products/:id  or  GET /api/v1/admin/analytics"),
  ...codeBlock(`[global middlewares]
     |
     v
authenticate()                <- same as protected
     |
     v
authorize(['ADMIN', 'SUPER_ADMIN'])
  └─ Read req.user.role
  └─ Role not in allowlist -> 403 Forbidden
     |
     v
validate(schema)
     |
     v
controller()                  <- asyncHandler wrapped`),
  gap(),

  h2("Stripe Webhook Chain"),
  body("POST /api/v1/payments/webhook"),
  ...codeBlock(`cors()                <- no JSON parser (raw body needed)
     |
     v
rawBody()             <- must precede json parser in app.ts
     |
     v
payments.webhook.ts
  └─ stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)
  └─ On fail -> 400 Bad Request
  └─ Dispatch to payments.service by event type`),
  gap(),

  h2("Tail Middlewares (end of every chain)"),
  ...codeBlock(`notFound()     <- catches unmatched routes -> 404
errorHandler() <- catches all thrown errors
  └─ ApiError instance  -> use its statusCode + message
  └─ Zod error          -> 422 with field-level detail
  └─ Prisma known error -> 409/404 mapped codes
  └─ Unknown            -> 500 Internal Server Error
  └─ Never leak stack traces in production`),
];

// ── SECTION 6: ENV VARS ───────────────────────────────────────────────────────
const section6 = [
  h1("6. Environment Variables"),

  h2("Server — server/.env"),
  envTable([
    ["NODE_ENV",                    "development",                           "Runtime environment: development | production | test"],
    ["PORT",                        "4000",                                  "HTTP port the Express server binds to"],
    ["API_VERSION",                 "v1",                                    "Used in route prefixes (/api/v1)"],
    ["DATABASE_URL",                "postgresql://user:pass@localhost/shopapp","Full Prisma PostgreSQL connection string"],
    ["REDIS_URL",                   "redis://localhost:6379",                "ioredis connection string"],
    ["REDIS_PASSWORD",              "(blank for local)",                     "Optional Redis password"],
    ["CACHE_TTL_SECONDS",           "300",                                   "Default cache TTL in seconds (5 min)"],
    ["ACCESS_TOKEN_SECRET",         "(long random string)",                  "Signs JWT access tokens"],
    ["ACCESS_TOKEN_EXPIRES_IN",     "15m",                                   "Access token lifetime (short-lived)"],
    ["REFRESH_TOKEN_SECRET",        "(different random string)",             "Signs JWT refresh tokens"],
    ["REFRESH_TOKEN_EXPIRES_IN",    "7d",                                    "Refresh token lifetime (long-lived)"],
    ["EMAIL_VERIFY_TOKEN_SECRET",   "(random string)",                       "Signs email verification JWTs"],
    ["RESET_PASSWORD_TOKEN_SECRET", "(random string)",                       "Signs password reset JWTs"],
    ["RESET_PASSWORD_EXPIRES_IN",   "1h",                                    "Reset link TTL"],
    ["STRIPE_SECRET_KEY",           "sk_test_...",                           "Stripe secret key (use live key in prod)"],
    ["STRIPE_WEBHOOK_SECRET",       "whsec_...",                             "From Stripe dashboard webhook endpoint"],
    ["CLOUDINARY_CLOUD_NAME",       "(your cloud name)",                     "Your Cloudinary cloud name"],
    ["CLOUDINARY_API_KEY",          "(your api key)",                        "Cloudinary API key"],
    ["CLOUDINARY_API_SECRET",       "(your api secret)",                     "Cloudinary API secret"],
    ["CLOUDINARY_UPLOAD_PRESET",    "(optional)",                            "Optional unsigned upload preset"],
    ["SMTP_HOST",                   "smtp.gmail.com",                        "SMTP server host"],
    ["SMTP_PORT",                   "587",                                   "587 (STARTTLS) or 465 (SSL)"],
    ["SMTP_USER",                   "(email address)",                       "SMTP username / email address"],
    ["SMTP_PASS",                   "(password)",                            "SMTP password or app password"],
    ["EMAIL_FROM",                  "ShopApp <no-reply@shopapp.com>",        "Sender name + address in outbound emails"],
    ["CLIENT_URL",                  "http://localhost:5173",                 "Allowed CORS origin (React dev server)"],
    ["RATE_LIMIT_WINDOW_MS",        "900000",                                "Rate limit window: 15 minutes in ms"],
    ["RATE_LIMIT_MAX_REQUESTS",     "100",                                   "Max requests per window per IP"],
    ["LOG_LEVEL",                   "debug",                                 "Winston log level: debug|info|warn|error"],
    ["BCRYPT_ROUNDS",               "12",                                    "bcrypt cost factor (use 4 for tests)"],
    ["LOW_STOCK_THRESHOLD",         "5",                                     "Default inventory low-stock alert threshold"],
  ]),
  gap(),

  h2("Client — client/.env"),
  envTable([
    ["VITE_API_BASE_URL",           "http://localhost:4000/api/v1","Backend base URL for Axios client"],
    ["VITE_STRIPE_PUBLISHABLE_KEY", "pk_test_...",                 "Stripe.js public key (safe to expose)"],
    ["VITE_APP_NAME",               "ShopApp",                     "Displayed in <title> and meta tags"],
    ["VITE_APP_URL",                "http://localhost:5173",       "Self-URL used in canonical links"],
    ["VITE_ENABLE_GUEST_CART",      "true",                        "Allow unauthenticated cart usage"],
    ["VITE_ENABLE_REVIEWS",         "true",                        "Toggle review submission UI"],
  ]),
];

// ── NAMING CONVENTIONS ────────────────────────────────────────────────────────
const sectionNaming = [
  h1("Naming Conventions"),
  body("Consistent naming conventions used throughout the entire codebase."),
  gap(),
  namingTable([
    ["Files",               "module.layer.ts",      "auth.service.ts"],
    ["DB tables",           "snake_case",            "order_items"],
    ["Prisma models",       "PascalCase",            "OrderItem"],
    ["API paths",           "kebab-case",            "/api/v1/checkout-session"],
    ["Env vars",            "SCREAMING_SNAKE_CASE",  "STRIPE_SECRET_KEY"],
    ["TS types/interfaces", "PascalCase",            "CreateOrderDto"],
    ["Zod schemas",         "camelCase + Schema",    "createOrderSchema"],
    ["React components",    "PascalCase",            "ProductCard.tsx"],
    ["React hooks",         "camelCase + use",       "useCart.ts"],
  ]),
];

// ── BUILD DOCUMENT ────────────────────────────────────────────────────────────
const doc = new Document({
  title: "ShopApp - Complete Architecture Reference",
  styles: {
    default: { document: { run: { font: "Arial", size: 20, color: DARK_TXT } } },
    paragraphStyles: [
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ font:"Arial", size:36, bold:true, color:BRAND },
        paragraph:{ spacing:{ before:480, after:280 }, outlineLevel:0 } },
      { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ font:"Arial", size:26, bold:true, color:ACCENT },
        paragraph:{ spacing:{ before:320, after:160 }, outlineLevel:1 } },
    ],
  },
  numbering: { config: [] },
  sections: [
    {
      properties: { page: { size:{ width:12240, height:15840 }, margin:{ top:1440, right:1440, bottom:1440, left:1440 } } },
      children: cover,
    },
    {
      properties: { page: { size:{ width:12240, height:15840 }, margin:{ top:1080, right:1080, bottom:1080, left:1080 } } },
      headers: {
        default: new Header({ children: [
          new Paragraph({
            spacing:{ before:0, after:0 },
            border:{ bottom:{ style:BorderStyle.SINGLE, size:1, color:BORDER_C, space:2 } },
            children:[
              new TextRun({ text:"ShopApp — Complete Architecture Reference", font:"Arial", size:16, color:MED_TXT }),
              new TextRun({ text:"\t", font:"Arial", size:16 }),
              new TextRun({ children:[PageNumber.CURRENT], font:"Arial", size:16, color:MED_TXT }),
            ],
            tabStops:[{ type:"right", position:9360 }],
          })
        ]})
      },
      footers: {
        default: new Footer({ children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing:{ before:0, after:0 },
            border:{ top:{ style:BorderStyle.SINGLE, size:1, color:BORDER_C, space:2 } },
            children:[new TextRun({ text:"ShopApp Architecture Reference  |  May 2026", font:"Arial", size:14, color:MED_TXT, italics:true })]
          })
        ]})
      },
      children: [
        ...section1, ...section2, ...section3,
        ...section4, ...section5, ...section6,
        ...sectionNaming,
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("ShopApp_Architecture_Reference.docx", buf);
  console.log("SUCCESS: ShopApp_Architecture_Reference.docx written (" + (buf.length/1024).toFixed(1) + " KB)");
}).catch(e => { console.error("FAILED:", e.message); process.exit(1); });
