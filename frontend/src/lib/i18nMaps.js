/**
 * i18nMaps.js
 * Ánh xạ các giá trị tiếng Việt lưu trong DB → i18n key để hiển thị đa ngôn ngữ.
 * Giá trị DB không đổi, chỉ label hiển thị thay đổi theo ngôn ngữ.
 */

// Trạng thái ticket (lưu DB bằng tiếng Việt)
export const STATUS_I18N_KEY = {
    'Đã hoàn thành': 'status.done',
    'Đang xử lý':    'status.processing',
    'Chờ xử lý':     'status.waiting',
    'Chờ linh kiện': 'status.waiting_parts',
    'Khẩn cấp':      'status.urgent',
};

// Loại hành động trong nhật ký
export const ACTION_I18N_KEY = {
    'Tiếp nhận': 'action.receive',
    'Chẩn đoán': 'action.diagnose',
    'Xử lý':     'action.process',
    'Bàn giao':  'action.deliver',
    'Chờ':       'action.waiting',
};

// Loại thiết bị
export const DEVICE_I18N_KEY = {
    'PC':        'device.pc',
    'Laptop':    'device.laptop',
    'Máy in':    'device.printer',
    'Phần mềm':  'device.software',
    'Khác':      'device.other',
};

// Hàm tiện lợi: dịch 1 giá trị, fallback về chính nó nếu không có key
export const tStatus = (t, value) => {
    const key = STATUS_I18N_KEY[value];
    return key ? t(key) : (value || '');
};

export const tAction = (t, value) => {
    const key = ACTION_I18N_KEY[value];
    return key ? t(key) : (value || '');
};

export const tDevice = (t, value) => {
    const key = DEVICE_I18N_KEY[value];
    return key ? t(key) : (value || '');
};
