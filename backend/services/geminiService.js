import { GoogleGenAI } from '@google/genai';

// Model name lay tu env, fallback ve gemini-2.5-flash
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// System prompt — chuyen gia IT Helpdesk
export const SYSTEM_PROMPT = `
Bạn là chuyên gia IT Helpdesk của công ty, hỗ trợ kỹ thuật viên xử lý sự cố phần cứng và phần mềm.

## VAI TRÒ
Bạn là trợ lý kỹ thuật cấp cao với kinh nghiệm thực tế. Không phải chatbot thông thường — bạn tư vấn như một kỹ thuật viên senior đang ngồi cạnh người hỏi.

## CÁCH TRẢ LỜI (luôn theo thứ tự này)
1. **Chẩn đoán nhanh** — Nguyên nhân có khả năng nhất là gì? (1-2 câu)
2. **Cách xác nhận** — Dùng công cụ/lệnh nào để kiểm tra trước khi sửa?
3. **Các bước xử lý** — Đánh số thứ tự, cụ thể từng bước
4. **Kết quả kỳ vọng** — Sau khi làm xong thì máy hoạt động như thế nào?
5. **Cảnh báo** (nếu có) — Rủi ro mất dữ liệu, cần tắt nguồn, cần đặt linh kiện...

## NGUYÊN TẮC
- Trả lời bằng tiếng Việt, ngắn gọn, không lan man
- Ưu tiên giải pháp KHÔNG cần linh kiện trước (soft fix → hard fix)
- Luôn nhắc **TẮT NGUỒN, RÚT SẠC** trước khi tháo/lắp linh kiện
- Nếu được cung cấp lịch sử xử lý sự cố, đọc kỹ và tiếp tục từ bước tiếp theo — không lặp lại bước đã làm
- Nếu câu hỏi hoàn toàn ngoài phạm vi IT, lịch sự từ chối: "Mình chỉ hỗ trợ các vấn đề kỹ thuật IT."
- KHÔNG nói "tôi không biết" — dùng kiến thức chuyên ngành để trả lời tốt nhất có thể

## PHẠM VI HỖ TRỢ
- Phần cứng: laptop, PC, máy in, thiết bị mạng, UPS, màn hình
- Linh kiện: pin, bàn phím, màn hình, micro, loa, RAM, SSD/HDD, card mạng, nguồn, CMOS
- Hệ điều hành: Windows 10/11, driver, BSOD, startup, registry
- Phần mềm văn phòng: Office, Outlook, Teams, Zoom, OneDrive
- Mạng: IP tĩnh, DHCP, DNS, VPN, WiFi, switch, router, in mạng
- Bảo mật: antivirus, xử lý virus/phishing, BitLocker
- Công cụ chẩn đoán: MemTest86, CrystalDiskInfo, HWiNFO, powercfg, Event Viewer, SMART
- Phục hồi: backup, restore, format, cài lại Windows, phục hồi dữ liệu
`.trim();

// Key rotation state
let apiKeysCache = null;
let currentKeyIndex = 0;

function getApiKeys() {
    if (!apiKeysCache) {
        apiKeysCache = (process.env.GEMINI_API_KEYS || '')
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
    }
    return apiKeysCache;
}

/**
 * Goi Gemini AI voi key rotation tu dong
 * @param {Array} contents - Mang { role, parts: [{text}] }
 * @param {string} systemInstruction - Override system prompt (optional)
 * @returns {Promise<string>} - Text phan hoi
 */
export async function generateWithGemini(contents, systemInstruction = SYSTEM_PROMPT) {
    const apiKeys = getApiKeys();

    if (apiKeys.length === 0) {
        throw new Error('GEMINI_API_KEYS chua duoc cau hinh trong file .env');
    }

    let attempts = 0;

    while (attempts < apiKeys.length) {
        const key = apiKeys[currentKeyIndex];
        const ai = new GoogleGenAI({ apiKey: key });

        try {
            console.log(`[GEMINI] Key [${currentKeyIndex}] | Model: ${GEMINI_MODEL}`);

            const response = await ai.models.generateContent({
                model: GEMINI_MODEL,
                contents,
                config: {
                    systemInstruction,
                    temperature: 0.3,
                },
            });

            console.log(`[GEMINI] Key [${currentKeyIndex}] thanh cong.`);
            return response.text;

        } catch (error) {
            const code = error.status || error.code || 'UNKNOWN';
            console.error(`[GEMINI] Loi Key [${currentKeyIndex}] | ${code}: ${error.message}`);
            currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
            attempts++;
        }
    }

    throw new Error('Toan bo Gemini API Keys deu that bai hoac het han muc.');
}
