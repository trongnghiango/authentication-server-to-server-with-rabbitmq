# README
Dưới đây là mô tả chi tiết về flow hoạt động của việc sử dụng `replyTo` và `correlationId` trong một kịch bản giao tiếp giữa hai server thông qua RabbitMQ.

### Kịch Bản: Xác Thực Người Dùng

Giả sử chúng ta có hai server:
- **Server A**: Chịu trách nhiệm xác thực người dùng và trả về JWT.
- **Server B**: Gửi yêu cầu xác thực đến Server A và nhận phản hồi.

### Flow Hoạt Động

1. **Bắt Đầu Gửi Yêu Cầu Từ Server B**:
   - Server B tạo một yêu cầu xác thực với thông tin người dùng (username, password).
   - Server B tạo một `correlationId` duy nhất để theo dõi yêu cầu này.

2. **Gửi Yêu Cầu Đến RabbitMQ**:
   - Server B gửi tin nhắn đến một queue (ví dụ: `auth_queue`) trên RabbitMQ với payload chứa thông tin người dùng và `correlationId`.
   - Nếu sử dụng `replyTo`, Server B sẽ chỉ định một queue cụ thể (ví dụ: `response_queue`) để nhận phản hồi.

   ```javascript
   const correlationId = generateUuid();
   channel.sendToQueue('auth_queue', Buffer.from(JSON.stringify({ username, password })), {
       replyTo: 'response_queue', // Để nhận phản hồi
       correlationId: correlationId, // Để theo dõi yêu cầu
   });
   ```

3. **Server A Nhận Yêu Cầu**:
   - Server A lắng nghe trên `auth_queue` và nhận tin nhắn từ Server B.
   - Server A xử lý yêu cầu xác thực, ví dụ: kiểm tra tên người dùng và mật khẩu.

4. **Xử Lý Yêu Cầu và Tạo Phản Hồi**:
   - Nếu xác thực thành công, Server A tạo một JWT và trả về một đối tượng JSON bao gồm `success: true` và token.
   - Nếu xác thực thất bại, Server A trả về một đối tượng JSON bao gồm `success: false` và thông điệp lỗi.
   - Server A gửi phản hồi trở lại queue mà Server B đã chỉ định trong `replyTo`, đồng thời bao gồm `correlationId`.

   ```javascript
   const response = { success: true, token: 'jwt_token_here' }; // Hoặc thông báo lỗi
   channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(response)), {
       correlationId: msg.properties.correlationId,
   });
   ```

5. **Server B Nhận Phản Hồi**:
   - Server B lắng nghe trên `response_queue` (nếu được chỉ định) và nhận phản hồi từ Server A.
   - Khi nhận được phản hồi, Server B kiểm tra `correlationId` để xác định phản hồi này tương ứng với yêu cầu nào.
   - Nếu `success` là `true`, Server B có thể sử dụng token. Nếu không, Server B có thể xử lý thông báo lỗi.

   ```javascript
   channel.consume('response_queue', (msg) => {
       if (msg.properties.correlationId === correlationId) {
           const response = JSON.parse(msg.content.toString());
           if (response.success) {
               console.log('Authentication successful, token:', response.token);
           } else {
               console.log('Authentication failed:', response.message);
           }
           // Đóng channel và connection
       }
   });
   ```

### Tóm Tắt Flow Hoạt Động

1. **Gửi yêu cầu** từ Server B đến Server A qua RabbitMQ.
2. **Server A nhận yêu cầu** và thực hiện xác thực.
3. **Server A gửi phản hồi** trở lại Server B, sử dụng queue được chỉ định trong `replyTo` và bao gồm `correlationId`.
4. **Server B nhận phản hồi** và kiểm tra `correlationId` để xác định phản hồi nào tương ứng với yêu cầu nào.

### Kết Luận

- **`replyTo`**: Giúp xác định nơi gửi phản hồi.
- **`correlationId`**: Giúp liên kết yêu cầu với phản hồi, cho phép xử lý đúng phản hồi cho từng yêu cầu.

Nếu bạn có bất kỳ câu hỏi nào hoặc cần làm rõ điều gì khác, hãy cho tôi biết!