# 🐺 MA SÓI ONLINE — 30 NGƯỜI

Một website chơi Ma Sói thời gian thực với giao diện tiếng Việt, tối đa **30 người / phòng**. Chủ phòng chủ động chọn số lượng quân bài, chia vai và điều khiển nhịp ngày – đêm.

## Yêu cầu

- **Node.js 18+** (khuyến nghị Node.js 22).
- Không cần cài package ngoài; không cần database, không cần `npm install`.

## Chạy trên máy tính

```bash
node server.js
```

Mở http://localhost:3000 trên trình duyệt. **Nếu dùng Windows**, có thể nhấp đúp `CHAY-WINDOWS.bat` sau khi đã cài Node.js để khởi động nhanh.

### Để các máy / điện thoại cùng mạng Wi-Fi tham gia

1. Khởi chạy trên máy chủ bằng `node server.js`.
2. Tìm địa chỉ IP mạng LAN của máy chủ: Windows dùng `ipconfig`, macOS/Linux dùng `ip addr`.
3. Người chơi mở `http://<IP-LAN-CUA-MAY-CHU>:3000`, ví dụ `http://192.168.1.10:3000`.
4. **Chủ phòng cũng mở website bằng địa chỉ IP LAN** (thay vì `localhost`) rồi bấm **CHIA SẺ** để sao chép liên kết dùng được trên thiết bị khác; hoặc gửi mã phòng cùng địa chỉ IP LAN.
5. Nếu không kết nối được, hãy cho phép cổng 3000 qua tường lửa của máy chủ.

**Người chơi ở xa, khác Wi-Fi:** triển khai project này trên máy chủ Node.js có HTTPS (Render, Railway, VPS, v.v.). Gói mã nguồn đã hỗ trợ biến môi trường `PORT`; khi triển khai, dùng lệnh khởi động `node server.js`. Máy chủ cần duy trì tiến trình liên tục. Dữ liệu phòng đang lưu trong RAM, nên khởi động lại máy chủ sẽ mất phòng và ván hiện tại.

## Cách chơi

1. Một người tạo phòng và trở thành **chủ phòng**.
2. Tối đa 29 người khác vào phòng bằng mã 6 ký tự.
3. Chủ phòng tùy chỉnh từng loại vai (có thể dùng bộ bài mẫu). Tổng lá bài phải bằng số người chơi.
4. Mỗi người nhận một vai bí mật sau khi chủ phòng **CHIA BÀI**.
5. **Ban đêm:** Ma Sói chọn người, Tiên Tri soi, Phù Thủy cứu/đầu độc, Bảo Vệ chọn người che chở.
6. Chủ phòng nhấn **KẾT THÚC ĐÊM**, công bố những người bị loại.
7. **Ban ngày:** những người còn sống trò chuyện và bỏ phiếu. Chủ phòng nhấn **CÔNG BỐ KẾT QUẢ**.
8. Nếu Thợ Săn bị loại, Thợ Săn được bắn thêm một người hoặc bỏ qua.
9. Dân Làng thắng khi hết Ma Sói. Ma Sói thắng khi số Sói bằng hoặc nhiều hơn số người không phải Sói còn sống.
10. Sau khi ván kết thúc, chủ phòng có thể chơi lại với cùng phòng.

## Quy tắc phiên bản này

- Cần ít nhất **5 người** và nhiều nhất **30 người** để chơi.
- Có 6 loại vai: **Ma Sói, Tiên Tri, Phù Thủy, Bảo Vệ, Thợ Săn, Dân Làng**. Chủ phòng chọn được cả số lượng mỗi vai (không bắt buộc 1 vai đặc biệt / ván).
- Ma Sói: người nhận nhiều phiếu Sói nhất bị chọn; nếu phiếu cao nhất hòa nhau, không ai bị Sói hạ.
- Bảo Vệ: có thể tự bảo vệ, nhưng không được bảo vệ cùng một người hai đêm liên tiếp.
- Phù Thủy: một bình cứu, một bình độc (mỗi bình dùng một lần/ván). Phù Thủy nhìn được **mục tiêu Sói tạm thời** dựa trên các phiếu đã chọn. Chỉ khi chủ phòng kết thúc đêm, thuốc mới thực sự sử dụng.
- Tiên Tri: soi một người mỗi đêm; biết người đó có phải Sói hay không (không biết vai cụ thể).
- Thợ Săn: khi chết vì bất kỳ nguyên nhân nào sẽ được quyền bắn trả một người còn sống hoặc bỏ qua. Nếu người giữ vai Thợ Săn bị mất kết nối, chủ phòng có thể bỏ qua lượt để không làm kẹt ván.
- Biểu quyết: mỗi người sống bỏ một phiếu, được thay đổi trước khi khóa. Nếu hòa phiếu cao nhất thì không ai bị loại.
- **Chat Làng**: mở ở phòng chờ và ban ngày, chỉ người còn sống được chat trong ván. **Chat Sói**: chỉ thành viên phe Sói còn sống thấy và sử dụng trong đêm.
- Không có cơ chế tự chạy đồng hồ: chủ phòng chủ động kết thúc đêm / biểu quyết.
- Người đã vào phòng có thể kết nối lại từ cùng trình duyệt nếu không xóa dữ liệu trình duyệt. Người mới không thể vào giữa ván.

## Cấu trúc

```text
ma-soi-online/
├── server.js         # HTTP + Server-Sent Events realtime + luật chơi
├── package.json
├── CHAY-WINDOWS.bat # Khởi chạy nhanh trên Windows
├── README.md
└── public/
    ├── index.html   # Trang web
    ├── style.css    # Giao diện responsive
    └── app.js       # Logic tương tác và render giao diện
└── test/            # Kiểm thử luật chơi, API, 30 người
```

## Lưu ý khi sử dụng

Đây là bản chơi nhóm không tài khoản. Dữ liệu chỉ nằm trong bộ nhớ máy chủ; không phải hệ thống production có xác thực / quản trị / lưu trữ cơ sở dữ liệu. Để vận hành công khai lâu dài, nên bổ sung cơ sở dữ liệu, rate limiting, cấu hình proxy/HTTPS, và giám sát máy chủ.
