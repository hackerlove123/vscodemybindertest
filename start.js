const { exec, spawn } = require("child_process");
const axios = require("axios");

// Cấu hình
const BOT_TOKEN = "7828296793:AAEw4A7NI8tVrdrcR0TQZXyOpNSPbJmbGUU"; // Thay bằng token bot Telegram của bạn
const CHAT_ID = "7371969470"; // Thay bằng chat ID của bạn
const NGROK_AUTH_TOKEN = "2tYhiPUn9AjgGNWUJFRFBGqZqRm_3y9JovAeKK6q8Q9BdsvYr"; // Thay bằng token Ngrok của bạn
const CODE_SERVER_PORT = "9999"; // Port cho code-server

// Hàm gửi tin nhắn qua Telegram
const sendTelegramMessage = async (message) => {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
    });
    console.log("✅ Tin nhắn đã gửi!");
  } catch (error) {
    console.error("❌ Lỗi gửi Telegram:", error.message);
  }
};

// Hàm kiểm tra code-server đã sẵn sàng chưa
const waitForCodeServer = async () => {
  await sendTelegramMessage("🔄 Đang kiểm tra code-server...");
  return new Promise((resolve, reject) => {
    const check = setInterval(() => {
      exec(`curl -s http://localhost:${CODE_SERVER_PORT}`, (error) => {
        if (!error) {
          clearInterval(check);
          resolve();
        }
      });
    }, 1000); // Kiểm tra mỗi 1 giây
    setTimeout(() => {
      clearInterval(check);
      reject(new Error("❌ Không kết nối được code-server sau 30s"));
    }, 30000); // Timeout sau 30 giây
  });
};

// Hàm lấy URL Ngrok
const getNgrokUrl = async () => {
  try {
    const response = await axios.get("http://127.0.0.1:4040/api/tunnels");
    const publicUrl = response.data.tunnels[0]?.public_url;
    if (!publicUrl) throw new Error("❌ Không tìm thấy tunnel");
    return publicUrl;
  } catch (error) {
    throw new Error(`❌ Lỗi lấy URL Ngrok: ${error.message}`);
  }
};

// Hàm khởi động Ngrok
const startNgrok = async (port) => {
  await sendTelegramMessage("🔄 Thêm authtoken Ngrok...");
  exec(`ngrok config add-authtoken ${NGROK_AUTH_TOKEN}`, async (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Lỗi thêm authtoken: ${stderr}`);
      await sendTelegramMessage(`❌ Lỗi thêm authtoken: ${stderr}`);
      return;
    }
    console.log(`✅ Authtoken thành công: ${stdout}`);
    await sendTelegramMessage("✅ Authtoken thành công!");

    const ngrok = spawn("ngrok", ["http", port]);
    ngrok.stderr.on("data", (data) => {
      console.error(`[ngrok] ${data}`);
    });

    // Đợi 5 giây để Ngrok khởi động hoàn toàn
    setTimeout(async () => {
      try {
        const url = await getNgrokUrl();
        await sendTelegramMessage(
          `🌐 Public URL: ${url}/?folder=/NeganServer\n👉 Truy cập URL và bấm [Visit] để truy cập Server.`
        );
      } catch (error) {
        await sendTelegramMessage(`❌ Lỗi lấy URL Ngrok: ${error.message}`);
      }
    }, 5000);

    ngrok.on("close", (code) => {
      sendTelegramMessage(`🔴 Ngrok đóng với mã ${code}`);
    });
  });
};

// Hàm khởi động code-server
const startCodeServer = async () => {
  await sendTelegramMessage("🔄 Khởi động code-server...");
  const codeServer = spawn("code-server", ["--bind-addr", `0.0.0.0:${CODE_SERVER_PORT}`, "--auth", "none"]);

  codeServer.stderr.on("data", (data) => {
    console.error(`[code-server] ${data}`);
  });

  codeServer.stdout.on("data", (data) => {
    console.log(`[code-server] ${data}`);
  });

  await waitForCodeServer();
  await sendTelegramMessage("✅ Code-server sẵn sàng!");
};

// Hàm chính
(async () => {
  try {
    await startCodeServer();
    await startNgrok(CODE_SERVER_PORT);
  } catch (error) {
    await sendTelegramMessage(`❌ Lỗi: ${error.message}`);
  }
})();
