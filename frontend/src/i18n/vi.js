const vi = {
  'app.name': 'IT Helpdesk',
  'app.tagline': 'Quản lý sự cố kỹ thuật',

  // Common buttons
  'btn.save': 'Lưu', 'btn.cancel': 'Hủy', 'btn.create': 'Tạo mới',
  'btn.close': 'Đóng', 'btn.send': 'Gửi', 'btn.assign': 'Phân công',
  'btn.submit': 'Xác nhận', 'btn.logout': 'Đăng xuất',
  'btn.login': 'Đăng nhập', 'btn.register': 'Tạo tài khoản',
  'btn.refresh': 'Làm mới', 'btn.edit': 'Chỉnh sửa',
  'btn.delete': 'Xóa', 'btn.activate': 'Kích hoạt',
  'btn.deactivate': 'Khóa tài khoản', 'btn.change_role': 'Đổi vai trò',

  // Status
  'status.waiting': 'Chờ xử lý', 'status.processing': 'Đang xử lý',
  'status.waiting_parts': 'Chờ linh kiện', 'status.done': 'Đã hoàn thành',
  'status.urgent': 'Khẩn cấp', 'status.all': 'Tất cả',

  // Priority
  'priority.low': 'Thấp', 'priority.normal': 'Bình thường',
  'priority.high': 'Cao', 'priority.urgent': 'Khẩn cấp',

  // Device types
  'device.pc': 'Máy tính (PC)', 'device.laptop': 'Laptop',
  'device.printer': 'Máy in', 'device.software': 'Phần mềm',
  'device.other': 'Khác',

  // Action types
  'action.receive': 'Tiếp nhận', 'action.diagnose': 'Chẩn đoán',
  'action.process': 'Xử lý', 'action.deliver': 'Bàn giao',
  'action.waiting': 'Chờ',

  // Roles
  'role.admin': 'Quản trị viên', 'role.technician': 'Kỹ thuật viên',
  'role.customer': 'Khách hàng',

  // Nav
  'nav.dashboard': 'Bảng điều khiển', 'nav.admin': 'Quản trị',
  'nav.portal': 'Cổng khách hàng', 'nav.logout': 'Đăng xuất',

  // Login page
  'login.title': 'Đăng nhập hệ thống',
  'login.subtitle': 'Truy cập bằng tài khoản nội bộ',
  'login.tab.login': 'Đăng nhập', 'login.tab.register': 'Tạo tài khoản',
  'login.email': 'Email', 'login.password': 'Mật khẩu',
  'login.password.hint': '(ít nhất 6 ký tự)',
  'login.email.placeholder': 'email@congty.com',
  'login.password.placeholder': 'Nhập mật khẩu...',
  'login.or': 'hoặc đăng nhập với',
  'login.footer': 'Hệ thống nội bộ — Chỉ dành cho người được ủy quyền',
  'login.error.empty': 'Vui lòng nhập đầy đủ email và mật khẩu.',
  'login.error.wrong': 'Sai email hoặc mật khẩu. Vui lòng thử lại.',
  'login.error.short': 'Mật khẩu phải có ít nhất 6 ký tự.',
  'login.success.register': 'Tạo tài khoản thành công! Đăng nhập ngay.',
  'login.loading': 'Đang xử lý...',

  // Tickets general
  'ticket.list': 'Phiếu sự cố', 'ticket.count': 'phiếu',
  'ticket.new': 'Tạo phiếu mới', 'ticket.filter': 'Lọc trạng thái',
  'ticket.all_status': 'Tất cả trạng thái',
  'ticket.empty': 'Không có phiếu nào.',
  'ticket.select': 'Chọn một phiếu để xem chi tiết',
  'ticket.history': 'Lịch sử xử lý',
  'ticket.no_history': 'Chưa có nhật ký xử lý nào.',
  'ticket.loading': 'Đang tải...', 'ticket.device': 'Thiết bị',
  'ticket.customer': 'Khách hàng', 'ticket.return_date': 'Dự kiến trả',
  'ticket.created': 'Tạo ngày', 'ticket.technician': 'Kỹ thuật viên',
  'ticket.unassigned': 'Chưa phân công',
  'ticket.start_history': 'Bắt đầu phiếu',
  'ticket.priority': 'Độ ưu tiên',

  // Create ticket
  'create.title': 'Tạo phiếu sự cố mới',
  'create.device_type': 'Loại thiết bị',
  'create.brand': 'Hãng sản xuất',
  'create.brand.placeholder': 'VD: Dell, HP, Brother...',
  'create.model': 'Tên / Model',
  'create.model.placeholder': 'VD: Latitude 3420, HL-L2321D...',
  'create.location': 'Địa điểm / Nơi làm việc',
  'create.location.placeholder': 'VD: Tầng 3, Tòa nhà A, Công ty ABC...',
  'create.issue': 'Mô tả sự cố',
  'create.issue.placeholder': 'Mô tả chi tiết vấn đề đang gặp phải...',
  'create.submit': 'Tạo phiếu',
  'create.creating': 'Đang tạo...',
  'create.success': 'Phiếu đã được tạo thành công!',
  'create.error': 'Có lỗi xảy ra. Vui lòng thử lại.',

  // Log messages
  'log.created_by_customer': 'Phiếu được tạo bởi khách hàng. Đang chờ phân công kỹ thuật viên.',
  'log.location': 'Vị trí',

  // Stats
  'stats.title': 'Thống kê', 'stats.today': 'Hôm nay',
  'stats.week': 'Tuần này', 'stats.month': 'Tháng này',
  'stats.year': 'Năm nay', 'stats.total': 'Tổng phiếu',
  'stats.done': 'Hoàn thành', 'stats.processing': 'Đang xử lý',
  'stats.waiting': 'Chờ xử lý',
  'stats.per_tech': 'Thống kê theo kỹ thuật viên',
  'stats.tech_name': 'Tên KTV',
  'stats.tasks_today': 'Hôm nay', 'stats.tasks_week': 'Tuần này',
  'stats.tasks_month': 'Tháng này', 'stats.tasks_year': 'Năm nay',
  'stats.tasks_total': 'Tổng task',

  // Rating
  'rating.title': 'Đánh giá dịch vụ',
  'rating.subtitle': 'Phiếu đã được xử lý xong. Bạn cảm thấy thế nào?',
  'rating.placeholder': 'Nhận xét về chất lượng dịch vụ...',
  'rating.submit': 'Gửi đánh giá', 'rating.done': 'Cảm ơn bạn đã đánh giá!',
  'rating.already': 'Bạn đã đánh giá phiếu này.',
  'rating.score': 'Điểm đánh giá',

  // Chat
  'chat.title': 'Trao đổi với kỹ thuật viên',
  'chat.placeholder': 'Nhập tin nhắn...',
  'chat.empty': 'Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!',
  'chat.you': 'Bạn',

  // Admin
  'admin.title': 'Quản trị hệ thống',
  'admin.tab.overview': 'Tổng quan',
  'admin.tab.tickets': 'Phiếu sự cố',
  'admin.tab.accounts': 'Tài khoản',
  'admin.tab.equipment': 'Thiết bị',
  'admin.assign.title': 'Phân công kỹ thuật viên',
  'admin.assign.select': 'Chọn kỹ thuật viên',
  'admin.assign.none': 'Bỏ phân công',
  'admin.accounts.title': 'Quản lý tài khoản',
  'admin.accounts.name': 'Họ tên',
  'admin.accounts.email': 'Email',
  'admin.accounts.role': 'Vai trò',
  'admin.accounts.status': 'Trạng thái',
  'admin.accounts.actions': 'Thao tác',
  'admin.accounts.active': 'Hoạt động',
  'admin.accounts.inactive': 'Đã khóa',
  'admin.accounts.no_users': 'Không có tài khoản nào.',
  'admin.accounts.no_name': 'Chưa đặt tên',

  // Equipment table
  'eq.type':  'Loại thiết bị',
  'eq.brand': 'Hãng',
  'eq.model': 'Model',
  'eq.owner': 'Chủ sở hữu',
  'eq.date':  'Ngày nhập',
  'eq.empty': 'Chưa có thiết bị nào.',

  // Customer Portal
  'portal.title': 'Phiếu sự cố của tôi',
  'portal.subtitle': 'Theo dõi trạng thái và trao đổi với kỹ thuật viên',
  'portal.new': 'Tạo phiếu mới',
  'portal.empty': 'Bạn chưa có phiếu sự cố nào.',
  'portal.empty.hint': 'Bấm "Tạo phiếu mới" để gửi yêu cầu hỗ trợ.',
  'portal.technician': 'Kỹ thuật viên phụ trách',

  // Technician progress update
  'tech.update_progress': 'Cập nhật tiến độ xử lý',
  'tech.action_type': 'Loại hành động',
  'tech.new_status': 'Trạng thái mới',
  'tech.note': 'Ghi chú',
  'tech.note.placeholder': 'Mô tả chi tiết công việc đã thực hiện...',
  'tech.save_progress': 'Lưu tiến độ',
  'tech.saving': 'Đang lưu...',
  'tech.saved': 'Đã cập nhật!',

  // Misc
  'loading': 'Đang tải...', 'loading.connecting': 'Đang kết nối...',
  'error.unknown': 'Đã xảy ra lỗi không xác định.',
  'error.no_access': 'Bạn không có quyền truy cập trang này.',
};

export default vi;
