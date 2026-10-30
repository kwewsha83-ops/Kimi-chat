
// ======================================
// KIMI - Main Application JavaScript
// ======================================

let currentUser = "کاربر کیمی";
let registering = false;

// Elements
const login = document.getElementById("login");
const app = document.getElementById("app");
const loginButton = document.getElementById("loginButton");

// Registration
document.getElementById("registerButton").onclick = () => {
  registering = true;
  loginButton.textContent = "ثبت‌نام آزمایشی";
  document.getElementById("registerButton").classList.add("hidden");
};

// Login
loginButton.onclick = () => enterApp();

// Demo login
document.getElementById("demoButton").onclick = () => {
  currentUser = "مهمان کیمی";
  enterApp();
};

function enterApp() {
  const name = document.getElementById("username").value.trim();

  if (name) currentUser = name;

  if (!name && registering) {
    alert("لطفاً نام کاربری را وارد کنید");
    return;
  }

  login.classList.add("hidden");
  app.classList.remove("hidden");
}

// Open chat
function openChat(name, avatar) {
  document.getElementById("chatTitle").textContent = name;
  document.getElementById("chatAvatar").textContent = avatar;

  document.getElementById("chatPage").classList.remove("hidden");
  document.getElementById("otherPage").classList.add("hidden");

  document.querySelectorAll(".chat-preview").forEach(item => {
    item.classList.toggle("selected", item.dataset.name === name);
  });
}

// Application pages
function showPage(page, button) {
  document.getElementById("chatPage").classList.add("hidden");

  const other = document.getElementById("otherPage");
  other.classList.remove("hidden");

  const pages = {
    chats: [
      "گفتگوها",
      "گفتگوهای خود را از فهرست سمت راست انتخاب کنید."
    ],
    groups: [
      "گروه‌ها",
      "گروه‌های دوستانه و کاری خود را اینجا مدیریت کنید."
    ],
    channels: [
      "کانال‌ها",
      "کانال‌های مورد علاقه‌ات را دنبال کن."
    ],
    contacts: [
      "مخاطبین",
      "مخاطبین کیمی در این قسمت نمایش داده می‌شوند."
    ],
    profile: [
      "پروفایل کاربری",
      "نام کاربری: " + currentUser +
      " | وضعیت: آنلاین 🟢 | به KIMI خوش آمدی!"
    ],
    settings: [
      "تنظیمات",
      "حساب کاربری | حریم خصوصی 🔒 | اعلان‌ها 🔔 | ظاهر و تم 🌙 | زبان: فارسی"
    ]
  };

  const data = pages[page] || pages.chats;

  const heading = document.createElement("h2");
  heading.textContent = data[0];

  const description = document.createElement("p");
  description.style.cssText = "color:#9bb0d0;line-height:2";
  description.textContent = data[1];

  other.replaceChildren(heading, description);

  if (button) {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
  }
}

// Search conversations
document.getElementById("search").addEventListener("input", event => {
  const query = event.target.value.toLowerCase();

  document.querySelectorAll(".chat-preview").forEach(item => {
    const name = item.dataset.name.toLowerCase();
    item.classList.toggle("hidden", !name.includes(query));
  });
});

// Send message
document.getElementById("composer").addEventListener("submit", event => {
  event.preventDefault();

  const input = document.getElementById("message");
  const value = input.value.trim();

  if (!value) return;

  const bubble = document.createElement("div");
  bubble.className = "msg mine";
  bubble.textContent = value;

  const time = document.createElement("small");
  time.textContent = "اکنون ✓";

  bubble.appendChild(time);

  const messages = document.getElementById("messages");
  messages.appendChild(bubble);

  input.value = "";
  messages.scrollTop = messages.scrollHeight;
});

// Make functions available to HTML buttons
window.openChat = openChat;
window.showPage = showPage;

console.log("KIMI application initialized 💜");
    
