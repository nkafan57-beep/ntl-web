const { Client, GatewayIntentBits } = require("discord.js");

// هنا حط التوكن تبع البوت
const TOKEN = "MTM3NTE5MTU1MjUyNzQzMzc0OQ.Gdwz5m.t12HL0_nmQsi8fImui1odCmjSgKwTArfnQWcO0";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log(`✅ تم تسجيل الدخول باسم: ${client.user.tag}`);
  client.user.setActivity("شغال 24/7 🚀");
});

client.on("messageCreate", (message) => {
  if (message.content === "ping") {
    message.reply("🏓 pong");
  }
});

client.login(TOKEN);

// سيرفر بسيط يخلي البوت أونلاين على Render
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("البوت شغال ✅"));
app.listen(3000, () => console.log("🌐 السيرفر شغال على المنفذ 3000"));    .container {
      background: rgba(20, 0, 0, 0.7);
      padding: 40px 30px;
      border-radius: 18px;
      box-shadow: 0 0 25px #ff0000cc, 0 0 50px #8b0000aa;
      width: 320px;
      text-align: center;
      animation: fadeInUpSmooth 1.5s forwards;
    }
    .hidden {
      display: none;
    }
    h2 {
      margin-bottom: 30px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #ffffff;
      opacity: 0;
      transform: translateY(40px);
      animation: fadeInUpSmooth 1.5s forwards;
      animation-delay: 0.2s;
    }
    button {
      width: 100%;
      padding: 16px 0;
      margin: 12px 0;
      border: none;
      border-radius: 14px;
      font-size: 1.15rem;
      font-weight: 700;
      cursor: pointer;
      background: linear-gradient(45deg, #ff0000, #8b0000);
      color: #fff;
      box-shadow: 0 6px 20px #ff0000cc;
      transition: all 0.4s ease;
      text-transform: uppercase;
      position: relative;
      overflow: hidden;
      animation: fadeInUpSmooth 1.5s forwards;
    }
    button::before {
      content: "";
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: rgba(255, 255, 255, 0.2);
      transform: rotate(45deg);
      transition: all 0.7s ease;
      pointer-events: none;
      filter: blur(8px);
      opacity: 0;
    }
    button:hover::before {
      opacity: 1;
      left: 100%;
    }
    button:hover {
      background: linear-gradient(45deg, #ff4c4c, #aa0000);
      box-shadow: 0 8px 30px #ff1a1acc;
      transform: scale(1.07);
      animation: none;
    }
    #guestBtn {
      animation-delay: 0.5s;
    }
    #allowedBtn {
      animation-delay: 0.8s;
    }
    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 14px;
      margin: 10px 0;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
    }
    @keyframes fadeInUpSmooth {
      0% {
        opacity: 0;
        transform: translateY(40px);
      }
      60% {
        opacity: 1;
        transform: translateY(-10px);
      }
      80% {
        transform: translateY(5px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .main-buttons {
      display: flex;
      flex-direction: column;
      gap: 15px;
      background: rgba(20, 0, 0, 0.7);
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 0 20px #ff000066, 0 0 40px #8b000066;
      margin-top: 20px;
      width: 300px;
    }
    .publish-box {
      background: rgba(50, 0, 0, 0.7);
      padding: 25px;
      margin-top: 25px;
      border-radius: 18px;
      box-shadow: 0 0 25px #ff000055, 0 0 50px #8b000055;
      text-align: center;
      font-size: 1.3rem;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="tabs">
    <button id="guestBtn">geust</button>
    <button id="allowedBtn">المسموح بهم فقط</button>
  </div>  <div id="mainPage" class="container">
    <h2>تسجيل دخول</h2>
    <p>اختر أحد الخيارات بالأعلى</p>
  </div>  <div id="allowedPage" class="container hidden">
    <h2>المسموح بهم فقط</h2>
    <input type="text" id="username" placeholder="اسم المستخدم" autocomplete="off" />
    <input type="password" id="password" placeholder="كلمة المرور" autocomplete="off" />
    <button id="loginBtn">تأكيد</button>
    <div class="error-msg" id="errorMsg" style="display:none">الاسم أو كلمة المرور غير صحيحة!</div>
    <div class="success-msg" id="successMsg" style="display:none">تم تسجيل الدخول بنجاح! مرحباً عزوز.</div>
  </div>  <div id="mainInterface" class="container hidden">
    <h2>مرحباً بك في النظام</h2>
    <div class="main-buttons">
      <button>زر 1</button>
      <button>زر 2</button>
    </div>
    <div class="publish-box">نشر</div>
  </div><script>
  const mainPage = document.getElementById('mainPage');
  const allowedPage = document.getElementById('allowedPage');
  const allowedBtn = document.getElementById('allowedBtn');
  const loginBtn = document.getElementById('loginBtn');
  const errorMsg = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');
  const mainInterface = document.getElementById('mainInterface');
  const guestBtn = document.getElementById('guestBtn');

  allowedBtn.addEventListener('click', () => {
    mainPage.classList.add('hidden');
    allowedPage.classList.remove('hidden');
    mainInterface.classList.add('hidden');
  });

  guestBtn.addEventListener('click', () => {
    mainPage.classList.add('hidden');
    allowedPage.classList.add('hidden');
    mainInterface.classList.remove('hidden');
  });

  loginBtn.addEventListener('click', () => {
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if(username === 'aziz' && password === 'aziz900'){
      successMsg.style.display = 'block';
      setTimeout(() => {
        allowedPage.classList.add('hidden');
        mainInterface.classList.remove('hidden');
      }, 800);
    } else {
      errorMsg.style.display = 'block';
    }
  });
</script></body>
            </html>
