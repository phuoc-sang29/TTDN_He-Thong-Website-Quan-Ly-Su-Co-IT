# PROJECT CONTEXT — IT Helpdesk Ticketing System v2.0
> Dán file này làm tin nhắn đầu tiên trong bất kỳ chat AI nào để AI hiểu toàn bộ dự án ngay lập tức.

---

## 1. Danh tính dự án

- **Tên đề tài:** Nghiên cứu, thiết kế và xây dựng ứng dụng Web quản lý sự cố và hỗ trợ kỹ thuật (IT Helpdesk Ticketing System) tại MiT Group
- **Đơn vị thực tập:** Công ty TNHH Thương Mại Và Sản Xuất MiT
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

### Database & Auth
- Supabase: PostgreSQL + Auth + Realtime WebSocket
- Row Level Security (RLS) bật trên tất cả bảng
- Trigger tự tạo profile khi user đăng ký
- Quên mật khẩu: Link-based (resetPasswordForEmail) — KHÔNG dùng OTP

### AI
- Google Gemini 2.5 Flash
- Nhiều API key xoay vòng Round-Robin (tự động khi lỗi 429/403)
- Multi-turn conversation (gửi kèm history), Temperature: 0.1

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
│   ├── .env.example
│   ├── server.js                 <- Express entry point, cổng 3001
│   └── package.json
│
├── frontend\
│   ├── public\
│   │   └── hinh-nen-thien-nhien-4k-yody-vn-11.jpg
│   ├── src\
│   │   ├── components\
│   │   │   ├── AddressWidget.jsx      <- autocomplete địa chỉ, lưu DB
│   │   │   ├── AIChatWidget.jsx       <- chat nổi góc phải, multi-turn
│   │   │   ├── AssignModal.jsx        <- phân công KTV
│   │   │   ├── CreateTicketModal.jsx  <- tạo phiếu (3 loại)
│   │   │   ├── LangSwitcher.jsx       <- chỉ hiện với customer (VI/EN)
│   │   │   ├── MapWidget.jsx          <- Leaflet + OpenStreetMap
│   │   │   ├── NotificationBell.jsx   <- chuông Admin, realtime
│   │   │   ├── RatingWidget.jsx       <- đánh giá 1-5 sao
│   │   │   ├── RentalManagement.jsx   <- quản lý cho thuê (admin tab)
│   │   │   ├── StatsPanel.jsx         <- thống kê KTV
│   │   │   ├── StatusBadge.jsx        <- badge màu trạng thái
│   │   │   ├── TicketCard.jsx         <- thẻ phiếu danh sách trái
│   │   │   ├── TicketChat.jsx         <- chat realtime theo phiếu
│   │   │   ├── TopNavbar.jsx          <- navbar ngang trên cùng
│   │   │   └── WorkSchedule.jsx       <- lịch công việc tuần (Admin + KTV)
│   │   ├── context\
│   │   │   ├── AuthContext.jsx
│   │   │   └── LanguageContext.jsx
│   │   ├── i18n\
│   │   │   ├── vi.js
│   │   │   └── en.js
│   │   ├── lib\
│   │   │   ├── supabaseClient.js
│   │   │   └── i18nMaps.js
│   │   ├── pages\
│   │   │   ├── AdminDashboard.jsx     <- 8 tab: Tổng quan/Phiếu/Tài khoản/Thiết bị/Cho thuê/Hỗ trợ/Đã xóa/Lịch tuần
│   │   │   ├── CustomerPortal.jsx
│   │   │   ├── Login.jsx
│   │   │   └── TechnicianDashboard.jsx
│   │   ├── styles\
│   │   │   └── index.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── vite.config.js             <- proxy /api -> 127.0.0.1:3001
│   ├── tailwind.config.js
│   └── package.json
│
└── supabase\
    ├── schema.sql                 <- toàn bộ schema + RLS + seed data (chạy lần đầu)
    ├── seed_rental.sql            <- dữ liệu mẫu hợp đồng cho thuê
    └── add_schedule_sn.sql        <- migration: thêm S/N thiết bị + bảng lịch tuần
```

---

## 4. Database — 9 bảng Supabase

```sql
profiles         -> id (FK auth.users), role, full_name, phone, address, lat, lng, is_active
equipments       -> id, owner_id->profiles, device_type, brand, model,
                    serial_number, asset_code,
                    is_rentable, is_available, base_price_per_day
tickets          -> id, equipment_id, created_by, assigned_to, issue_summary, priority,
                    current_status, ticket_type, location, location_note,
                    deleted_at (soft delete), created_at, updated_at
ticket_logs      -> id, ticket_id, author_id->profiles, action_type, note, created_at
chat_messages    -> id, ticket_id, sender_id->profiles, content, created_at [Realtime ON]
ratings          -> id, ticket_id (UNIQUE), customer_id, score (1-5), comment, created_at
notifications    -> id, recipient_id, sender_id, ticket_id, type, title, body, is_read [Realtime ON]
rental_contracts -> id, equipment_id, customer_id, start_date, end_date, price_per_day,
                    deposit, status (pending/active/returned/overdue/cancelled),
                    approval_status (pending/approved/rejected),
                    approved_by, approved_at, notes, created_by
task_schedules   -> id, title, description, technician_id->profiles,
                    scheduled_date, start_time, end_time,
                    status (pending/in_progress/done/cancelled),
                    created_by->profiles, created_at
```

### SQL cần chạy theo thứ tự trong Supabase SQL Editor
1. `schema.sql` — tạo toàn bộ cấu trúc DB (lần đầu)
2. `seed_rental.sql` — dữ liệu mẫu (tuỳ chọn)
3. `add_schedule_sn.sql` — thêm cột S/N và bảng lịch tuần

---

## 5. Roles & Quyền hạn

### Admin (/admin) — 8 tab
- Tổng quan: thống kê dashboard
- Phiếu: tất cả phiếu sự cố, tìm kiếm theo khách hàng
- Tài khoản: quản lý user, đổi role, kích hoạt/khóa
- Thiết bị: danh sách + cột S/N + mã tài sản, toggle cho thuê
- Cho thuê: duyệt/từ chối hợp đồng, định giá, theo dõi trạng thái
- Hỗ trợ: chat trực tiếp với khách, phân công KTV
- Đã xóa: thùng rác, khôi phục phiếu
- Lịch tuần: thêm/sửa/xóa lịch cho KTV, xuất Excel (CSV)

### Technician (/dashboard)
- Xem phiếu được phân công, cập nhật tiến độ + ghi log
- Xem S/N thiết bị trong chi tiết phiếu
- Lịch tuần: xem lịch công việc của mình trong tuần
- Chat với khách, tạo phiếu cho thuê/bảo trì
- Xem bản đồ địa chỉ, hỏi AI chatbot

### Customer (/portal)
- Tạo/xem/sửa/xóa phiếu của mình (không thấy S/N)
- Đánh giá 1-5 sao sau khi hoàn thành
- Chat với KTV, chuyển ngôn ngữ VI/EN

---

## 6. Loại phiếu (ticket_type)

| Loại | Ai tạo | Mô tả |
|------|--------|-------|
| repair | Customer + KTV | Sửa chữa sự cố (mặc định) |
| maintenance | KTV | Bảo trì định kỳ |
| rental | KTV | Cho thuê thiết bị (cần Admin duyệt) |

---

## 7. Trạng thái phiếu (current_status)

```
Chờ xử lý -> Đang xử lý -> Chờ linh kiện -> Đã hoàn thành
                                           -> Khẩn cấp (override bất kỳ lúc nào)
```

---

## 8. Cách chạy dự án

```powershell
# Chạy cả 2 cùng lúc (khuyến nghị)
cd D:\helpdesk-project
npm run dev

# Chạy riêng
npm run backend    # http://localhost:3001
npm run frontend   # http://127.0.0.1:5173
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

---

## 9. Quy tắc code (bắt buộc)

- Không dùng emoji trong code, comment, UI text, log
- Không dùng TypeScript
- Không dùng sidebar trái kiểu truyền thống
- Không deploy lên Vercel/Render (chỉ localhost)
- Không cài thêm thư viện nặng không cần thiết
- ES Modules (`import/export`), không dùng `require()`
- Tiếng Việt có dấu trong tất cả UI text
- Log dạng: `[INFO]`, `[ERROR]`, `[SUCCESS]`, `[FATAL]`
- Search tickets: dùng `.ilike()` trên DB, không filter in-memory
- Vite proxy: `/api` -> `http://127.0.0.1:3001` (IPv4)
- Theme: Comet Dark — `bg-zinc-900/950`, accent `teal-400/600`

---

## 10. Tính năng đã hoàn thành

| Tính năng | File chính | Trạng thái |
|-----------|-----------|-----------|
| Auth email/password + reset qua link | Login.jsx | Hoàn chỉnh |
| 3 roles + route guard | App.jsx + AuthContext | Hoàn chỉnh |
| Tạo phiếu sự cố (3 loại) | CreateTicketModal.jsx | Hoàn chỉnh |
| Ghi log tiến độ | TechnicianDashboard | Hoàn chỉnh |
| Chat realtime KTV <-> Khách | TicketChat.jsx | Hoàn chỉnh |
| Đánh giá 1-5 sao | RatingWidget.jsx | Hoàn chỉnh |
| Customer sửa + xóa phiếu mềm | CustomerPortal.jsx | Hoàn chỉnh |
| Phân công KTV | AssignModal.jsx | Hoàn chỉnh |
| Thống kê KTV | StatsPanel.jsx | Hoàn chỉnh |
| Quản lý tài khoản + role | AdminDashboard.jsx | Hoàn chỉnh |
| Chuông thông báo realtime | NotificationBell.jsx | Hoàn chỉnh |
| Bản đồ + Autocomplete địa chỉ | MapWidget + AddressWidget | Hoàn chỉnh |
| AI chatbot đa lượt + xoay key | AIChatWidget + geminiService | Hoàn chỉnh |
| Đa ngôn ngữ VI/EN | LanguageContext + i18nMaps | Hoàn chỉnh |
| Quản lý cho thuê (duyệt, định giá, trả) | RentalManagement.jsx | Hoàn chỉnh |
| Admin hỗ trợ / chat trực tiếp | AdminDashboard (tab support) | Hoàn chỉnh |
| Thùng rác + khôi phục phiếu | AdminDashboard (tab trash) | Hoàn chỉnh |
| Rate limiting API | rateLimiter.js | Hoàn chỉnh |
| **Lịch công việc tuần** | WorkSchedule.jsx | Hoàn chỉnh |
| **Cột S/N + mã tài sản thiết bị** | AdminDashboard + TechnicianDashboard | Hoàn chỉnh |

---

## 11. API Backend — các endpoint

```
POST  /api/chat
GET   /api/tickets                         (auth, RBAC)
GET   /api/tickets/deleted                 (admin only)
GET   /api/tickets/stats                   (admin only)
PATCH /api/tickets/:id
DELETE /api/tickets/:id
PATCH /api/tickets/:id/restore             (admin only)
GET   /api/rental-contracts               (auth, RBAC)
POST  /api/rental-contracts
POST  /api/rental-contracts/:id/approve   (admin only)
POST  /api/rental-contracts/:id/reject    (admin only)
PATCH /api/rental-contracts/:id/return
GET   /api/health
```

---

## 12. Dữ liệu mẫu — 8 case thực tế

1. PC Dell OptiPlex 3060 — Không lên nguồn -> xả điện, thay pin CMOS CR2032. Đã bàn giao.
2. PC Asus VivoPC M32CD — Treo Safe Mode -> MemTest86, nâng RAM 4->8GB. Đã bàn giao.
3. MicroSIP VoIP — Tự gọi đi -> tắt Auto Answer (xung đột CRM). Đã bàn giao.
4. Dell Latitude 3420 — Pin sụp cell 80%->6% -> powercfg /batteryreport, thay pin. Đã bàn giao.
5. Brother HL-L2321D — In mờ, vệt dọc -> nạp mực, vệ sinh corona wire drum. Đang chờ.
6. Brother HL-B2180DW — Offline -> DHCP trôi IP, set Static IP 192.168.1.45. Đã bàn giao.
7. HP EliteBook 840 G8 — Văng tác vụ -> đang kiểm tra Event Log, RAM, SMART.
8. Lenovo ThinkPad E14 — Hư mic hardware -> đã đặt linh kiện. Chờ linh kiện.

---

## 13. Thông tin Supabase

- **Project URL:** `https://zmslcmylvtjbhksqvcrc.supabase.co`
- **SQL Editor:** `https://supabase.com/dashboard/project/zmslcmylvtjbhksqvcrc`
- **Realtime đã bật:** bảng `notifications`, `chat_messages`
- **Để đổi role thành admin:** Table Editor -> profiles -> sửa trường `role` = `admin`

---

## 14. Các lỗi thường gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Supabase query lỗi 400 | Select cột chưa tồn tại | Chạy `add_schedule_sn.sql` trong SQL Editor |
| Lịch tuần không load | Bảng `task_schedules` chưa tạo | Chạy `add_schedule_sn.sql` trong SQL Editor |
| S/N hiển thị "undefined" | Cột chưa migrate | Chạy `add_schedule_sn.sql` trong SQL Editor |
| AI chat không trả lời | Backend chưa chạy hoặc key hết quota | Kiểm tra terminal backend |
| Reset mật khẩu không redirect | Chưa thêm Redirect URL vào Supabase | Auth -> URL Configuration -> thêm localhost:5173/login |
| Map không load | Leaflet CSS chưa import | `import 'leaflet/dist/leaflet.css'` trong main.jsx |

---

## 15. Kiến trúc tổng thể

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
    |_ OpenStreetMap tiles + geocoding (miễn phí)
```

**Mô hình:** SPA + BaaS + BFF Pattern + MVC Backend + RBAC + Soft Delete

---

*Cập nhật: 2026-07-14. Cập nhật lại khi có thay đổi lớn về schema hoặc tính năng.*
