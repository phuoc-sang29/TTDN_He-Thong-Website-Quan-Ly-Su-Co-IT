# IT Helpdesk System v2.0

Hệ thống quản lý sự cố và hỗ trợ kỹ thuật nội bộ — hỗ trợ đa vai trò, chat AI tích hợp, lịch công việc tuần và quản lý hợp đồng cho thuê thiết bị.

---

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Backend | Node.js + Express 4 (MVC: controllers/routes/middleware/services) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (Email/Password + reset mật khẩu qua link) |
| AI | Google Gemini 2.5 Flash (xoay vòng đa API key) |
| Bản đồ | Leaflet.js + OpenStreetMap + Nominatim API |
| i18n | Tiếng Việt / English (chuyển đổi real-time) |

---

## Cấu trúc thư mục

```
helpdesk-project/
├── package.json                 <- root: concurrently (npm run dev = chạy cả 2)
├── backend/
│   ├── controllers/
│   │   ├── chatController.js    <- Xử lý AI chat
│   │   ├── ticketController.js  <- CRUD phiếu sự cố
│   │   └── rentalController.js  <- Quản lý hợp đồng cho thuê
│   ├── middleware/
│   │   ├── authMiddleware.js    <- Xác thực JWT + phân quyền role
│   │   └── rateLimiter.js       <- Giới hạn request (global + chat)
│   ├── routes/
│   │   ├── chatRoutes.js
│   │   ├── ticketRoutes.js
│   │   └── rentalRoutes.js
│   ├── services/
│   │   ├── supabaseAdmin.js     <- Supabase service_role client (bypass RLS)
│   │   └── geminiService.js     <- Gemini AI với xoay vòng API key
│   ├── .env.example
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddressWidget.jsx    <- Autocomplete địa chỉ, lưu DB
│   │   │   ├── AIChatWidget.jsx     <- Chat AI nổi (có thể thu nhỏ)
│   │   │   ├── AssignModal.jsx      <- Phân công kỹ thuật viên
│   │   │   ├── CreateTicketModal.jsx <- Tạo phiếu (3 loại)
│   │   │   ├── LangSwitcher.jsx     <- Chuyển ngôn ngữ VI/EN
│   │   │   ├── MapWidget.jsx        <- Bản đồ Leaflet
│   │   │   ├── NotificationBell.jsx <- Thông báo real-time cho admin
│   │   │   ├── RatingWidget.jsx     <- Đánh giá 1-5 sao
│   │   │   ├── RentalManagement.jsx <- Quản lý cho thuê thiết bị
│   │   │   ├── StatsPanel.jsx       <- Thống kê theo kỹ thuật viên
│   │   │   ├── StatusBadge.jsx      <- Badge trạng thái phiếu
│   │   │   ├── TicketCard.jsx       <- Thẻ phiếu trong danh sách
│   │   │   ├── TicketChat.jsx       <- Chat realtime theo phiếu
│   │   │   ├── TopNavbar.jsx        <- Thanh điều hướng
│   │   │   └── WorkSchedule.jsx     <- Lịch công việc tuần (Admin + KTV)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      <- Quản lý session, role, profile
│   │   │   └── LanguageContext.jsx  <- i18n provider
│   │   ├── i18n/
│   │   │   ├── vi.js               <- Chuỗi tiếng Việt có dấu
│   │   │   └── en.js
│   │   ├── lib/
│   │   │   ├── supabaseClient.js
│   │   │   └── i18nMaps.js
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx  <- 8 tab: Tổng quan/Phiếu/Tài khoản/Thiết bị/Cho thuê/Hỗ trợ/Đã xóa/Lịch tuần
│   │   │   ├── CustomerPortal.jsx  <- Cổng khách hàng
│   │   │   ├── Login.jsx           <- Đăng nhập / Đăng ký / Quên mật khẩu
│   │   │   └── TechnicianDashboard.jsx <- Dashboard kỹ thuật viên
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   └── hinh-nen-thien-nhien-4k-yody-vn-11.jpg
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
└── supabase/
    ├── schema.sql               <- Toàn bộ schema DB (chạy lần đầu)
    ├── seed_rental.sql          <- Dữ liệu mẫu hợp đồng cho thuê
    └── add_schedule_sn.sql      <- Migration: thêm S/N thiết bị + bảng lịch tuần
```

---

## Hướng dẫn cài đặt

### Bước 1 — Thiết lập Supabase

1. Tạo tài khoản tại https://supabase.com và tạo project mới
2. Vào SQL Editor, chạy theo thứ tự:
   - `supabase/schema.sql` — tạo toàn bộ bảng và RLS
   - `supabase/seed_rental.sql` — dữ liệu mẫu (tuỳ chọn)
   - `supabase/add_schedule_sn.sql` — thêm cột S/N và bảng lịch tuần
3. Lấy thông tin kết nối: Project Settings -> API
4. Vào Authentication -> URL Configuration -> Redirect URLs, thêm:
   ```
   http://localhost:5173/login
   http://127.0.0.1:5173/login
   ```

### Bước 2 — Cấu hình Backend

```powershell
cd helpdesk-project\backend
npm install
```

Sao chép `.env.example` thành `.env` và điền:

```env
PORT=3001
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEYS=key1,key2,key3
```

### Bước 3 — Cấu hình Frontend

```powershell
cd helpdesk-project\frontend
npm install
```

Sao chép `.env.example` thành `.env` và điền:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_BACKEND_URL=http://localhost:3001
```

### Bước 4 — Chạy dự án

Cách 1 — Chạy cả hai cùng lúc (khuyến nghị):

```powershell
cd D:\helpdesk-project
npm run dev
```

Cách 2 — Chạy riêng từng phần:

```powershell
npm run backend    # Terminal 1 — http://localhost:3001
npm run frontend   # Terminal 2 — http://127.0.0.1:5173
```

---

## Phân quyền người dùng

| Role | Quyền |
|------|-------|
| Admin | Quản lý toàn bộ phiếu, tài khoản, thiết bị (S/N), hợp đồng cho thuê, thùng rác, hỗ trợ chat, lịch công việc tuần (nhập/xuất Excel) |
| Technician | Xử lý phiếu được phân công, xem S/N thiết bị, tạo hợp đồng cho thuê, bảo trì, xem lịch tuần của mình |
| Customer | Tạo/xem/sửa/xóa phiếu của mình, đánh giá sau khi xử lý xong |

---

## Các tính năng chính

- Quản lý phiếu sự cố — Tạo, phân công, cập nhật tiến độ, xóa mềm, khôi phục
- Chat AI tích hợp — Gemini 2.5 Flash với xoay vòng đa key tự động
- Module cho thuê thiết bị — Tạo hợp đồng, duyệt/từ chối, theo dõi trạng thái, đánh dấu trả
- Lịch công việc tuần — Calendar grid 7 ngày, Admin nhập/sửa/xóa, xuất Excel (CSV), KTV xem lịch của mình
- Quản lý S/N và mã tài sản — Cột serial_number và asset_code trong bảng thiết bị, hiển thị cho Admin và KTV
- Thống kê — Theo kỹ thuật viên, theo khoảng thời gian (ngày/tuần/tháng/năm)
- Thông báo real-time — Supabase Realtime cho admin
- Đa ngôn ngữ — Tiếng Việt / English
- Quên mật khẩu — Gửi link đặt lại qua email (Supabase Auth)
- Bản đồ địa chỉ — Leaflet + OpenStreetMap (không cần API key)
- Chat realtime — Kỹ thuật viên và khách hàng trao đổi theo phiếu
- Admin hỗ trợ trực tiếp — Tab chat dành cho admin theo dõi và phân công
- Đánh giá dịch vụ — Khách hàng cho điểm 1-5 sao sau khi hoàn thành

---

## Xử lý lỗi AI (log backend)

| Mã lỗi | Nguyên nhân | Xử lý |
|--------|-------------|-------|
| 429 | Hết hạn mức API (quota) | Tự động chuyển sang key tiếp theo |
| 403 | API Key bị khóa/sai | Xóa key đó trong .env, thêm key mới |
| 400 | Request bị lỗi định dạng | Kiểm tra nội dung prompt gửi lên |
| 503 | Server Google quá tải | Thử lại sau vài phút |
