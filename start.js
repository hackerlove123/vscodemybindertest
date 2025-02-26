const { exec, spawn } = require("child_process");
const axios = require("axios");

const BOT_TOKEN = "7828296793:AAEw4A7NI8tVrdrcR0TQZXyOpNSPbJmbGUU";
const CHAT_ID = "7371969470";

// Hàm gửi tin nhắn qua Telegram
const sendTelegramMessage = async (message) => {
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, { chat_id: CHAT_ID, text: message });
        console.log("Tin nhắn đã được gửi thành công!");
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn:", error);
    }
};

// Hàm kiểm tra xem code-server đã sẵn sàng chưa
const waitForCodeServer = () => new Promise((resolve, reject) => {
    const checkServer = setInterval(() => {
        exec("curl -s http://localhost:9999", (error) => {
            if (!error) {
                clearInterval(checkServer);
                resolve();
            }
        });
    }, 1000);

    // Timeout sau 30 giây nếu code-server không khởi động được
    setTimeout(() => {
        clearInterval(checkServer);
        reject(new Error("Không thể kết nối đến code-server sau 30 giây."));
    }, 30000);
});

// Hàm khởi chạy LocalTunnel
const startLocalTunnel = (port) => {
    const ltProcess = spawn("lt", ["--port", port.toString()]);

    ltProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log(`[localtunnel] ${output}`);

        const urlMatch = output.match(/https:\/\/[^\s]+/);
        if (urlMatch) {
            const tunnelUrl = urlMatch[0].trim();
            console.log(`🌐 URL: ${tunnelUrl}`);
            sendTelegramMessage(`🌐 LocalTunnel đang chạy:\n${tunnelUrl}`);
        }
    });

    ltProcess.stderr.on("data", (data) => {
        console.error(`[localtunnel] ${data.toString()}`);
    });

    ltProcess.on("close", (code) => {
        console.log(`LocalTunnel đã đóng với mã ${code}`);
        sendTelegramMessage(`🔴 LocalTunnel đã đóng với mã ${code}`);
    });
};

// Hàm khởi chạy code-server và LocalTunnel
const startCodeServerAndLocalTunnel = async () => {
    try {
        console.log("Đang khởi chạy code-server...");
        await sendTelegramMessage("🔄 Đang khởi chạy code-server...");

        const codeServerProcess = exec("code-server --bind-addr 0.0.0.0:9999 --auth none");

        // Bỏ qua các lỗi từ code-server
        codeServerProcess.stderr.on("data", () => {}); // Không xử lý lỗi

        // Đợi code-server khởi động thành công
        await waitForCodeServer();
        console.log("✅ code-server đã sẵn sàng!");
        await sendTelegramMessage("✅ code-server đã sẵn sàng!");

        console.log("Đang khởi chạy LocalTunnel...");
        await sendTelegramMessage("🔄 Đang khởi chạy LocalTunnel...");

        startLocalTunnel(9999);
    } catch (error) {
        console.error("Lỗi trong quá trình khởi chạy:", error);
        sendTelegramMessage(`❌ Lỗi trong quá trình khởi chạy: ${error.message}`);
    }
};

// Khởi chạy mọi thứ
startCodeServerAndLocalTunnel();
