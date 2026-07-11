# PROJECT CONTEXT — IT Helpdesk Ticketing System v2.0
> Dán file này làm tin nhắn đầu tiên trong bất kỳ chat AI nào để AI hiểu toàn bộ dự án ngay lập tức.

---

## 1. Danh tính dự án

- **Tên đề tài:** Nghiên cứu, thiết kế và xây dựng ứng dụng Web quản lý sự cố và hỗ trợ kỹ thuật (IT Helpdesk Ticketing System) tại MiT Group
- **Đơn vị thực tập:** Công ty TNHH Thương Mại Và Sản Xuất MiT (MiT Group) — 81 Cách Mạng Tháng Tám, Q.1, TP.HCM
- **Vị trí thực tập:** IT Support / Helpdesk Intern — Phòng Kỹ thuật
- **Môn học:** Thực tập Doanh nghiệp — Trường ĐH Thủ Dầu Một
- **Giảng viên hướng dẫn:** Thầy Nguyễn Thành Trung
- **Môi trường chạy:** Localhost + Supabase Cloud (không deploy lên Vercel/Render)

---

## 2. Tech Stack đầy đủ

### Frontend
- React 18 + Vite 5
- Tailwind CSS 3 (utility-first, không dùng component library)
- React Router DOM v6 (SPA routing)
- Supabase JS SDK v2 (DB + Auth + Realtime)
- Leaflet.js + OpenStreetMap + Nominatim API (bản đồ, geocoding)
- Ngôn ngữ: JavaScript ES2022+ (KHÔNG dùng TypeScript)

### Backend (MVC)
- Node.js LTS + Express 4
- Cấu trúc: controllers / routes / middleware / services
- `@google/genai` SDK (Gemini 2.5 Flash)
- dotenv, cors, express-rate-limit
- ES Modules (`"type": "module"` trong package.json)
- Ngôn ngữ: JavaScript

### Database & Auth
- Supabase: PostgreSQL + Auth (email/password + reset qua link email) + Realtime WebSocket
- Row Level Security (RLS) bật trên tất cả bảng
- Trigger tự tạo profile khi user đăng ký
- Quên mật khẩu: Link-based (resetPasswordForEmail) — KHÔNG dùng OTP (Supabase Free Plan hạn chế)

### AI
- Google Gemini 2.5 Flash
- Nhiều API key xoay vòng Round-Robin (tự động khi lỗi 429/403)
- Multi-turn conversation (gửi kèm history)
- Temperature: 0.1

---

## 3. Cấu trúc thư mục

```
D:\helpdesk-project\
├── package.json              <- root: concurrently (npm run dev = chạy cả 2)
├── backend\
│   ├── controllers\
│   │   ├── chatController.js     <- Gemini API + key rotation
│   │   ├── ticketController.js   <- CRUD phiếu sự cố, soft delete, stats
│   │   └── rentalController.js   <- quản lý hợp đồng cho thuê
│   ├── middleware\
│   │   ├── authMiddleware.js     <- xác thực JWT Supabase + phân quyền role
│   │   └── rateLimiter.js        <- global (200/15ph) + chat (15/1ph)
│   ├── routes\
│   │   ├── chatRoutes.js
│   │   ├── ticketRoutes.js
│   │   └── rentalRoutes.js
│   ├── services\
│   │   ├── supabaseAdmin.js      <- singleton service_role client (bypass RLS)
│   │   └── geminiService.js      <- Gemini SDK + key rotation
│   ├── .env
│   ├── server.js                 <- Express entry point, cổng 3001
│   └── package.json              <- type: module
│
├── frontend\
│   ├── public\
│   │   └── hinh-nen-thien-nhien-4k-yody-vn-11.jpg  <- ảnh nền login
│   ├── src\
│   │   ├── components\
│   │   │   ├── AddressWidget.jsx      <- autocomplete địa chỉ, lưu DB
│   │   │   ├── AIChatWidget.jsx       <- chat nổi góc phải, multi-turn
│   │   │   ├── AssignModal.jsx        <- phân công KTV
│   │   │   ├── CreateTicketModal.jsx  <- tạo phiếu (3 loại: repair/maintenance/rental)
│   │   │   ├── LangSwitcher.jsx       <- chỉ hiện với customer (VI/EN)
│   │   │   ├── MapWidget.jsx          <- Leaflet + OpenStreetMap
│   │   │   ├── NotificationBell.jsx   <- chuông Admin, realtime
│   │   │   ├── RatingWidget.jsx       <- đánh giá 1-5 sao
│   │   │   ├── RentalManagement.jsx   <- quản lý cho thuê (admin tab)
│   │   │   ├── StatsPanel.jsx         <- thống kê KTV (ngày/tuần/tháng/năm)
│   │   │   ├── StatusBadge.jsx        <- badge màu trạng thái
│   │   │   ├── TicketCard.jsx         <- thẻ phiếu danh sách trái
│   │   │   ├── TicketChat.jsx         <- chat realtime theo phiếu
│   │   │   └── TopNavbar.jsx          <- navbar ngang trên cùng
│   │   ├── context\
│   │   │   ├── AuthContext.jsx        <- user, role, session, profile
│   │   │   └── LanguageContext.jsx    <- VI/EN i18n provider
│   │   ├── i18n\
│   │   │   ├── vi.js                  <- chuỗi tiếng Việt có dấu
│   │   │   └── en.js
│   │   ├── lib\
│   │   │   ├── supabaseClient.js      <- singleton Supabase client
│   │   │   └── i18nMaps.js            <- map giá trị DB -> i18n key
│   │   ├── pages\
│   │   │   ├── AdminDashboard.jsx     <- 7 tab: Tổng quan/Phiếu/Tài khoản/Thiết bị/Cho thuê/Hỗ trợ/Đã xóa
│   │   │   ├── CustomerPortal.jsx     <- cổng khách hàng + sửa + xóa phiếu
│   │   │   ├── Login.jsx              <- email/password + reset qua link + ảnh nền rừng
│   │   │   └── TechnicianDashboard.jsx <- KTV xem phiếu được phân công
│   │   ├── styles\
│   │   │   └── index.css              <- Tailwind + animation + scrollbar
│   │   ├── App.jsx                    <- routing theo role (RoleRouter)
│   │   └── main.jsx
│   ├── .env
│   ├── vite.config.js                 <- proxy /api -> 127.0.0.1:3001
│   ├── tailwind.config.js
│   └── package.json
│
└── supabase\
    ├── schema.sql                     <- toàn bộ schema + RLS + seed data
    └── seed_rental.sql                <- dữ liệu mẫu hợp đồng cho thuê
```

---

## 4. Database — 8 bảng Supabase

```sql
profiles        -> id (FK auth.users), role, full_name, phone, address, lat, lng, is_active
equipments      -> id, owner_id->profiles, device_type, brand, model,
                   is_rentable, is_available, base_price_per_day
tickets         -> id, equipment_id, created_by, assigned_to, issue_summary, priority,
                   current_status, ticket_type, location, location_note, expected_return_date,
                   deleted_at (soft delete), created_at, updated_at
ticket_logs     -> id, ticket_id, author_id->profiles, action_type, note, created_at
chat_messages   -> id, ticket_id, sender_id->profiles, content, created_at [Realtime ON]
ratings         -> id, ticket_id (UNIQUE), customer_id, score (1-5), comment, created_at
notifications   -> id, recipient_id, sender_id, ticket_id, type, title, body, is_read [Realtime ON]
rental_contracts-> id, equipment_id, customer_id, start_date, end_date, price_per_day,
                   deposit, status (pending/active/returned/overdue/cancelled),
                   approval_status (pending/approved/rejected),
                   approved_by, approved_at, returned_at, notes, created_by
```

### Quan hệ FK chính
- `tickets.created_by` -> `profiles.id`
- `tickets.assigned_to` -> `profiles.id`
- `tickets.equipment_id` -> `equipments.id`
- `ticket_logs.ticket_id` -> `tickets.id` ON DELETE CASCADE
- `chat_messages.ticket_id` -> `tickets.id` ON DELETE CASCADE
- `ratings.ticket_id` UNIQUE (1 đánh giá / phiếu)
- `rental_contracts.approved_by` -> `profiles.id`

### RLS Policy (tất cả bảng)
- SELECT: authenticated users đọc được hết (phù hợp dev)
- INSERT/UPDATE: authenticated, một số bảng kiểm tra auth.uid()
- Notification: chỉ đọc được của mình (auth.uid() = recipient_id)

---

## 5. Roles & Quyền hạn

### Admin (/admin)
- Xem tất cả phiếu sự cố
- Phân công KTV (AssignModal)
- Quản lý tài khoản + đổi role + kích hoạt/khóa
- Xem thống kê KTV (ngày/tuần/tháng/năm)
- Duyệt/từ chối hợp đồng cho thuê + định giá
- Chuông thông báo realtime khi có phiếu mới
- Khôi phục phiếu đã xóa mềm (tab "Đã xóa")
- Hỗ trợ / Chat trực tiếp với khách (tab "Hỗ trợ")

### Technician (/dashboard)
- Xem phiếu được phân công (assigned_to = userId)
- Cập nhật tiến độ + ghi ticket_log
- Đổi current_status
- Chat với khách qua TicketChat
- Tạo phiếu cho thuê (rental)
- Xem bản đồ địa chỉ khách (MapWidget)
- Hỏi AI chatbot (AIChatWidget)
- Tạo phiếu bảo trì (maintenance)

### Customer (/portal)
- Tạo phiếu sự cố mới (loại repair mặc định)
- Theo dõi trạng thái realtime (CustomerPortal)
- Chỉnh sửa mô tả phiếu khi còn "Chờ xử lý"
- Xóa phiếu khi còn "Chờ xử lý" (soft delete + ConfirmDeleteModal)
- Chat với KTV
- Đánh giá 1-5 sao sau khi hoàn thành
- Lưu địa chỉ lên bản đồ (AddressWidget)
- Chuyển ngôn ngữ VI/EN (LangSwitcher)

---

## 6. Loại phiếu (ticket_type)

| Loại | Ai tạo | Mô tả |
|------|--------|-------|
| repair | Customer + KTV | Sửa chữa sự cố (mặc định) |
| maintenance | KTV | Bảo trì định kỳ |
| rental | KTV | Cho thuê thiết bị (cần Admin duyệt) |

> Lưu ý: Loại `purchase_request` (đề xuất mua) đã bị xóa khỏi hệ thống.

---

## 7. Trạng thái phiếu (current_status)

```
Chờ xử lý -> Đang xử lý -> Chờ linh kiện -> Đã hoàn thành
                                           -> Khẩn cấp (override bất kỳ lúc nào)
```

### Mapping action_type -> status tự động
- Tiếp nhận -> Chờ xử lý
- Chẩn đoán / Xử lý -> Đang xử lý
- Bàn giao -> Đã hoàn thành
- Chờ -> Chờ linh kiện

---

## 8. Cách chạy dự án

### Chạy cả 2 cùng lúc (khuyến nghị)
```powershell
cd D:\helpdesk-project
npm run dev
# Backend: http://localhost:3001
# Frontend: http://127.0.0.1:5173
```

### Chạy riêng từng phần
```powershell
cd D:\helpdesk-project
npm run backend    # Terminal 1
npm run frontend   # Terminal 2
```

### Lần đầu cài đặt
```powershell
cd D:\helpdesk-project
npm install
cd backend && npm install
cd ..\frontend && npm install
```

### File .env cần có

**backend\.env**
```
PORT=3001
SUPABASE_URL=https://zmslcmylvtjbhksqvcrc.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
GEMINI_API_KEYS=key0,key1,key2,key3
```

**frontend\.env**
```
VITE_SUPABASE_URL=https://zmslcmylvtjbhksqvcrc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_BACKEND_URL=http://localhost:3001
```

### Supabase — URL Configuration (bắt buộc cho reset mật khẩu)
Vào: Authentication -> URL Configuration -> Redirect URLs, thêm:
- http://localhost:5173/login
- http://127.0.0.1:5173/login

---

## 9. Quy tắc code (bắt buộc — không được vi phạm)

### Tuyệt đối không
- Không dùng emoji trong code, console.log, comment, UI text
- Không dùng TypeScript
- Không dùng sidebar trái kiểu truyền thống
- Không deploy lên Vercel/Render (chỉ localhost)
- Không cài thêm thư viện nặng không cần thiết
- Không đặt file vào ổ C

### UI/UX
- Layout: Master-Detail split-pane (30% danh sách trái / 70% chi tiết phải)
- Theme: Comet Dark — `bg-zinc-900` nền chính, `bg-zinc-800` panel, `border-zinc-700` viền
- Accent: Teal/Cyan — `text-teal-400`, `bg-teal-600`
- Status colors: emerald (hoàn thành), amber (đang xử lý), zinc (chờ), red (khẩn cấp)
- Font: Times New Roman trong báo cáo Word; hệ thống dùng Tailwind default (Inter)
- Animation: slide-in, fade-in — có trong `index.css`
- Không padding quá lớn, không font quá to kiểu AI generate

### Backend
- Luôn dùng `import/export` (ES Modules), không dùng `require()`
- `dotenv/config` import đầu tiên trong server.js
- API key đọc lazy (trong function) để tránh lỗi ESM hoisting
- Log lỗi dạng: `[INFO]`, `[ERROR]`, `[SUCCESS]`, `[BUG LOGGER]`, `[FATAL]` — không emoji
- Singleton pattern cho Supabase client (cache, không tạo mới mỗi request)
- Search tickets: dùng `.ilike()` trên DB, KHÔNG filter in-memory

### Frontend
- State dùng `useState` + `useEffect` thuần, Context cho global state
- Supabase query dùng `select('*, relation(...)')` — không liệt kê từng cột trừ khi cần
- Bỏ các cột chưa tồn tại trong select để tránh lỗi 400
- Vite proxy: `/api` -> `http://127.0.0.1:3001` (IPv4, không dùng localhost tránh IPv6)
- Tiếng Việt có dấu trong tất cả UI text, comment, log

### Realtime
- Dùng `supabase.channel().on('postgres_changes', ...)` cho ticket status + chat
- Notifications subscribe riêng cho Admin

---

## 10. Tính năng đã hoàn thành

| Tính năng | File chính | Trạng thái |
|-----------|-----------|-----------|
| Auth email/password | Login.jsx | Hoàn chỉnh |
| Quên mật khẩu (reset qua link email) | Login.jsx | Hoàn chỉnh |
| 3 roles + route guard | App.jsx + AuthContext | Hoàn chỉnh |
| Trigger tự tạo profile | schema.sql | Hoàn chỉnh |
| Tạo phiếu sự cố (3 loại) | CreateTicketModal.jsx | Hoàn chỉnh |
| Danh sách phiếu + filter | Dashboard các role | Hoàn chỉnh |
| Ghi log tiến độ | TechnicianDashboard | Hoàn chỉnh |
| Chat realtime KTV <-> Khách | TicketChat.jsx | Hoàn chỉnh |
| Realtime cập nhật CustomerPortal | CustomerPortal.jsx | Hoàn chỉnh |
| Đánh giá 1-5 sao | RatingWidget.jsx | Hoàn chỉnh |
| Customer sửa + xóa phiếu | CustomerPortal.jsx | Hoàn chỉnh |
| Modal xác nhận xóa | ConfirmDeleteModal (inline CustomerPortal) | Hoàn chỉnh |
| Phân công KTV | AssignModal.jsx | Hoàn chỉnh |
| Thống kê KTV | StatsPanel.jsx | Hoàn chỉnh |
| Quản lý tài khoản + role + kích hoạt | AdminDashboard.jsx | Hoàn chỉnh |
| Chuông thông báo realtime | NotificationBell.jsx | Hoàn chỉnh |
| Bản đồ địa chỉ | MapWidget.jsx | Hoàn chỉnh |
| Autocomplete địa chỉ | AddressWidget.jsx | Hoàn chỉnh |
| AI chatbot đa lượt | AIChatWidget + chatController | Hoàn chỉnh |
| API key xoay vòng | geminiService.js | Hoàn chỉnh |
| Đa ngôn ngữ VI/EN | LanguageContext + i18nMaps | Hoàn chỉnh |
| Ảnh nền rừng trang login | Login.jsx + public/ | Hoàn chỉnh |
| Quản lý cho thuê — Tạo hợp đồng | RentalManagement.jsx + CreateTicketModal | Hoàn chỉnh |
| Quản lý cho thuê — Duyệt/Từ chối | RentalManagement.jsx (ApproveModal) | Hoàn chỉnh |
| Quản lý cho thuê — Trả thiết bị | RentalManagement.jsx | Hoàn chỉnh |
| Admin — Tab hỗ trợ / Chat trực tiếp | AdminDashboard.jsx (tab support) | Hoàn chỉnh |
| Admin — Thùng rác (khôi phục phiếu) | AdminDashboard.jsx (tab trash) | Hoàn chỉnh |
| Rate limiting API | rateLimiter.js | Hoàn chỉnh |
| Search tickets trên DB (ilike) | ticketController.js | Hoàn chỉnh |

---

## 11. API Backend — các endpoint

```
POST  /api/chat                           <- AI chat (auth optional)
GET   /api/tickets                        <- lấy danh sách phiếu (auth, RBAC)
GET   /api/tickets/deleted                <- phiếu đã xóa (admin only)
GET   /api/tickets/stats                  <- thống kê dashboard (admin only)
PATCH /api/tickets/:id                    <- cập nhật phiếu (auth, RBAC)
DELETE /api/tickets/:id                   <- xóa mềm phiếu (auth, RBAC)
PATCH /api/tickets/:id/restore            <- khôi phục phiếu (admin only)
GET   /api/rental-contracts               <- danh sách hợp đồng (auth, RBAC)
POST  /api/rental-contracts               <- tạo hợp đồng (admin/technician)
POST  /api/rental-contracts/:id/approve   <- duyệt hợp đồng (admin only)
POST  /api/rental-contracts/:id/reject    <- từ chối hợp đồng (admin only)
PATCH /api/rental-contracts/:id/return    <- trả thiết bị (admin/technician)
GET   /api/health                         <- kiểm tra trạng thái server
```

---

## 12. Dữ liệu mẫu — 8 case thực tế

Đã insert vào DB qua `schema.sql`. Đây là context thực tế của AI chatbot:

1. PC Dell OptiPlex 3060 — Không lên nguồn -> xả điện, thay pin CMOS CR2032. Đã bàn giao.
2. PC Asus VivoPC M32CD — Treo Safe Mode -> MemTest86, nâng RAM 4->8GB. Đã bàn giao.
3. MicroSIP VoIP — Tự gọi đi -> tắt Auto Answer (xung đột CRM Auto-Dialer). Đã bàn giao.
4. Dell Latitude 3420 — Pin sụp cell 80%->6% -> powercfg /batteryreport, thay pin. Đã bàn giao.
5. Brother HL-L2321D — In mờ, vệt dọc -> nạp mực, vệ sinh corona wire drum. Đang chờ.
6. Brother HL-B2180DW — Offline -> DHCP trôi IP, set Static IP 192.168.1.45. Đã bàn giao.
7. HP EliteBook 840 G8 — Văng tác vụ (App crash) -> đang kiểm tra Event Log, RAM, SMART.
8. Lenovo ThinkPad E14 — Hư mic hardware -> đã đặt linh kiện. Chờ linh kiện.

---

## 13. Thông tin Supabase

- **Project URL:** `https://zmslcmylvtjbhksqvcrc.supabase.co`
- **SQL Editor:** `https://supabase.com/dashboard/project/zmslcmylvtjbhksqvcrc`
- **Auth -> Email:** Tắt "Confirm email" để đăng ký xong login luôn
- **Để đổi role thành admin:** Table Editor -> profiles -> sửa trường `role` = `admin`
- **Realtime đã bật:** bảng `notifications`, `chat_messages`

---

## 14. Cách sử dụng AI hỗ trợ

### Khi cần sửa/thêm code
```
Tôi cần [mô tả tính năng].
File cần sửa: [tên file].
Nội dung hiện tại của file: [paste code vào đây]
Yêu cầu: [chi tiết cụ thể]
Lưu ý: Không dùng emoji, giữ đúng Comet dark theme, không thêm thư viện mới.
```

### Khi gặp lỗi
```
Lỗi: [paste error message]
File: [tên file]
Dòng: [số dòng nếu biết]
Code liên quan: [paste đoạn code]
```

---

## 15. Các lỗi thường gặp và cách fix

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `npm error ENOENT package.json` | Chạy npm từ thư mục gốc (không có package.json riêng) | `cd frontend` hoặc `cd backend` trước |
| `Error: read ECONNRESET` | Backend restart khi đang xử lý AI request | Không dùng `node --watch` khi test AI |
| Supabase query lỗi 400 | Select cột chưa tồn tại (chưa chạy SQL) | Chạy SQL ALTER TABLE trước |
| AI chat không trả lời | Backend chưa chạy hoặc key hết quota | Kiểm tra terminal backend, thêm key vào .env |
| Map không load | Leaflet CSS chưa import | Import trong main.jsx: `import 'leaflet/dist/leaflet.css'` |
| Reset mật khẩu không redirect | Chưa thêm Redirect URL vào Supabase | Vào Auth -> URL Configuration -> thêm localhost:5173/login |
| Thông báo lỗi 403 từ backend | Token hết hạn hoặc role không đủ quyền | Đăng xuất và đăng nhập lại |

---

## 16. Kiến trúc tổng thể

```
Browser (React SPA)
    |_ supabase-js SDK
Supabase Cloud (PostgreSQL + Auth + WebSocket Realtime)
    |_ RLS kiểm tra mọi query

Browser (React) -> fetch('/api/...')
    |_ Vite proxy -> 127.0.0.1:3001
Node.js Express Backend (MVC)
    |_ authMiddleware (JWT verify + role check)
    |_ rateLimiter (global + chat)
    |_ controllers -> services -> Supabase Admin

Backend -> @google/genai SDK (key rotation)
    |_ Google Gemini 2.5 Flash API

Browser (React) -> Leaflet + Nominatim API
    |_ OpenStreetMap tiles + geocoding (miễn phí, không key)
```

**Mô hình kiến trúc:** SPA + BaaS + BFF Pattern + MVC Backend + Component-Based + RBAC + Soft Delete

---

*Cập nhật: 2026-07-10. Cập nhật lại khi có thay đổi lớn về schema hoặc tính năng.*
