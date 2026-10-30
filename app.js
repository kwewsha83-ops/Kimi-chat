
/* =========================================
   KIMI - Supabase Authentication & UI
   Phone OTP + Email OTP
   ========================================= */

const SUPABASE_URL = "https://hbnlizgkxysqkyjqkxhn.supabase.co";
const SUPABASE_KEY = "sb_publishable_kUuPY55JRHPtIMyZR5YAGQ_8klkwq1l";

let db = null;
let currentUser = null;
let authMethod = "phone";
let authStage = "identity";
let verifiedEmailUser = null;

const $ = (id) => document.getElementById(id);

const login = $("login");
const app = $("app");
const loginButton = $("loginButton");
const loginFields = $("loginFields");

function setStatus(message, error = false) {
  const status = $("authStatus");
  if (!status) return;
  status.textContent = message;
  status.style.color = error ? "#ff8585" : "#63e6b1";
}

function normalizePhone(value) {
  return value.trim().replace(/[\s()-]/g, "");
}

function validPhone(value) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function loadSupabase() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("بارگذاری کتابخانه Supabase ناموفق بود."));

    document.head.appendChild(script);
  });
}

function buildLoginUI() {
  if (!loginFields || !loginButton) {
    throw new Error("ساختار صفحه ورود کامل نیست.");
  }

  loginFields.innerHTML = `
    <label style="display:block;text-align:right;margin:12px 0 6px;color:#9bb0d0">
      روش ورود
    </label>

    <select id="authMethod"
      style="width:100%;padding:13px;border-radius:12px;
      background:#071329;color:white;border:1px solid #1d3b61">
      <option value="phone">شماره تلفن - کد پیامکی</option>
      <option value="email">ایمیل - کد تأیید ایمیل</option>
    </select>

    <input id="authIdentity"
      placeholder="شماره با کد کشور، مثل +491234567890"
      autocomplete="username"
      style="margin-top:12px">

    <input id="authCode"
      class="hidden"
      placeholder="کد تأیید"
      inputmode="numeric"
      autocomplete="one-time-code"
      style="margin-top:12px">

    <div id="emailPhoneBox" class="hidden">
      <input id="accountPhone"
        type="tel"
        placeholder="شماره تلفن اجباری، مثل +491234567890"
        autocomplete="tel"
        style="margin-top:12px">

      <p style="font-size:11px;color:#9bb0d0;line-height:1.8">
        این شماره ثبت می‌شود اما برای آن پیامک تأیید ارسال نمی‌شود.
        شماره تا زمان تأیید مستقل، تأییدنشده باقی می‌ماند.
      </p>
    </div>

    <p id="authHint"
      style="font-size:12px;color:#9bb0d0;line-height:1.8"
      aria-live="polite">
      کد ورود به شماره تلفن شما پیامک می‌شود.
    </p>

    <p id="authStatus"
      role="status"
      aria-live="polite"
      style="font-size:12px;line-height:1.8">
    </p>
  `;

  // ورود آزمایشی عمداً غیرفعال است.
  const demoButton = $("demoButton");
  if (demoButton) demoButton.remove();

  const registerButton = $("registerButton");
  if (registerButton) {
    registerButton.textContent = "تغییر روش ورود";
    registerButton.onclick = resetAuth;
  }

  $("authMethod").addEventListener("change", (event) => {
    authMethod = event.target.value;
    resetAuth();
  });

  loginButton.textContent = "ارسال کد تأیید";
  loginButton.onclick = handleAuth;
}

function resetAuth() {
  authStage = "identity";
  verifiedEmailUser = null;

  $("authCode").classList.add("hidden");
  $("emailPhoneBox").classList.add("hidden");

  $("authIdentity").disabled = false;
  $("authIdentity").value = "";
  $("authCode").value = "";

  $("authMethod").disabled = false;

  if (authMethod === "phone") {
    $("authIdentity").type = "tel";
    $("authIdentity").placeholder =
      "شماره با کد کشور، مثل +491234567890";

    $("authHint").textContent =
      "کد ورود به شماره تلفن شما پیامک می‌شود.";
  } else {
    $("authIdentity").type = "email";
    $("authIdentity").placeholder = "آدرس ایمیل شما";

    $("authHint").textContent =
      "کد تأیید فقط به ایمیل شما ارسال می‌شود.";
  }

  loginButton.textContent = "ارسال کد تأیید";
  setStatus("");
}

async function handleAuth() {
  if (!db) {
    setStatus("اتصال به سرویس آماده نیست.", true);
    return;
  }

  loginButton.disabled = true;

  try {
    if (authStage === "identity") {
      await sendOtp();
    } else if (
      authStage === "verify" &&
      authMethod === "phone"
    ) {
      await verifyPhone();
    } else if (
      authStage === "verify" &&
      authMethod === "email"
    ) {
      await verifyEmail();
    } else if (authStage === "phone-required") {
      await saveEmailAccountPhone();
    }
  } catch (error) {
    console.error("KIMI authentication error:", error);
    setStatus(error.message || "خطایی رخ داد.", true);
  } finally {
    loginButton.disabled = false;
  }
}

async function sendOtp() {
  const identity = $("authIdentity").value.trim();

  if (authMethod === "phone") {
    const phone = normalizePhone(identity);

    if (!validPhone(phone)) {
      throw new Error(
        "شماره را با کد کشور وارد کن؛ مانند +491234567890"
      );
    }

    const { error } = await db.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true
      }
    });

    if (error) throw error;

    $("authIdentity").value = phone;
    $("authIdentity").disabled = true;
  } else {
    if (!validEmail(identity)) {
      throw new Error("ایمیل معتبر وارد کن.");
    }

    const { error } = await db.auth.signInWithOtp({
      email: identity,
      options: {
        shouldCreateUser: true
      }
    });

    if (error) throw error;

    $("authIdentity").disabled = true;
  }

  authStage = "verify";
  $("authMethod").disabled = true;
  $("authCode").classList.remove("hidden");

  $("authHint").textContent =
    authMethod === "phone"
      ? "کد پیامکی را وارد کن."
      : "کد ارسال‌شده به ایمیلت را وارد کن.";

  loginButton.textContent = "تأیید کد";
  setStatus("کد تأیید درخواست شد.");
}

async function verifyPhone() {
  const phone = normalizePhone($("authIdentity").value);
  const token = $("authCode").value.trim();

  if (!token) throw new Error("کد پیامکی را وارد کن.");

  const { data, error } = await db.auth.verifyOtp({
    phone,
    token,
    type: "sms"
  });

  if (error) throw error;

  if (!data.user) {
    throw new Error("حساب کاربری دریافت نشد.");
  }

  currentUser = data.user;
  await enterApp();
}

async function verifyEmail() {
  const email = $("authIdentity").value.trim();
  const token = $("authCode").value.trim();

  if (!token) throw new Error("کد ایمیل را وارد کن.");

  const { data, error } = await db.auth.verifyOtp({
    email,
    token,
    type: "email"
  });

  if (error) throw error;

  if (!data.user) {
    throw new Error("حساب کاربری دریافت نشد.");
  }

  verifiedEmailUser = data.user;

  // شماره برای حساب ایمیلی اجباری است.
  // در این مرحله هیچ SMS ارسال نمی‌شود.
  authStage = "phone-required";

  $("authCode").classList.add("hidden");
  $("authIdentity").classList.add("hidden");
  $("emailPhoneBox").classList.remove("hidden");

  $("authHint").textContent =
    "ایمیل تأیید شد. اکنون شماره تلفنت را وارد کن.";

  loginButton.textContent = "ثبت شماره و ورود";
  setStatus("ایمیل با موفقیت تأیید شد.");
}

async function saveEmailAccountPhone() {
  if (!verifiedEmailUser) {
    throw new Error("ابتدا باید ایمیل را تأیید کنی.");
  }

  const phone = normalizePhone($("accountPhone").value);

  if (!validPhone(phone)) {
    throw new Error(
      "شماره را با کد کشور وارد کن؛ مانند +491234567890"
    );
  }

  const { error } = await db
    .from("account_contacts")
    .upsert(
      {
        user_id: verifiedEmailUser.id,
        phone_e164: phone,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "user_id"
      }
    );

  if (error) throw error;

  currentUser = verifiedEmailUser;
  await enterApp();
}

async function enterApp() {
  if (!currentUser) {
    throw new Error("کاربر واردشده مشخص نیست.");
  }

  const displayName =
    currentUser.user_metadata?.display_name ||
    currentUser.user_metadata?.username ||
    currentUser.email ||
    currentUser.phone ||
    "کاربر کیمی";

  window.currentKimiUser = currentUser;
  window.kimiSupabase = db;

  login.classList.add("hidden");
  app.classList.remove("hidden");

  console.log("KIMI authenticated:", currentUser.id);
}

// خروج از حساب
async function logoutKimi() {
  const { error } = await db.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = null;
  window.currentKimiUser = null;

  app.classList.add("hidden");
  login.classList.remove("hidden");

  resetAuth();
}

// باز کردن گفتگو
function openChat(name, avatar) {
  $("chatTitle").textContent = name;
  $("chatAvatar").textContent = avatar;

  $("chatPage").classList.remove("hidden");
  $("otherPage").classList.add("hidden");

  document.querySelectorAll(".chat-preview").forEach(item => {
    item.classList.toggle(
      "selected",
      item.dataset.name === name
    );
  });
}

// صفحات برنامه
function showPage(page, button) {
  $("chatPage").classList.add("hidden");

  const other = $("otherPage");
  other.classList.remove("hidden");

  const pages = {
    chats: [
      "گفتگوها",
      "گفتگوهای خود را از فهرست انتخاب کنید."
    ],
    groups: [
      "گروه‌ها",
      "بخش گروه‌ها؛ اتصال به دیتابیس در مرحله بعد."
    ],
    channels: [
      "کانال‌ها",
      "بخش کانال‌ها؛ اتصال به دیتابیس در مرحله بعد."
    ],
    contacts: [
      "مخاطبین",
      "مخاطبین KIMI در این قسمت نمایش داده می‌شوند."
    ],
    profile: [
      "پروفایل کاربری",
      "حساب کاربری واردشده به KIMI"
    ],
    settings: [
      "تنظیمات",
      "تنظیمات حساب و حریم خصوصی"
    ]
  };

  const data = pages[page] || pages.chats;

  const heading = document.createElement("h2");
  heading.textContent = data[0];

  const description = document.createElement("p");
  description.style.cssText =
    "color:#9bb0d0;line-height:2;margin-top:12px";
  description.textContent = data[1];

  other.replaceChildren(heading, description);

  if (page === "profile" && currentUser) {
    const account = document.createElement("p");
    account.style.cssText =
      "color:#9bb0d0;line-height:2;margin-top:12px";

    account.textContent =
      currentUser.email || currentUser.phone || "";

    other.appendChild(account);

    const logoutButton = document.createElement("button");
    logoutButton.className = "primary";
    logoutButton.textContent = "خروج از حساب";
    logoutButton.style.marginTop = "20px";
    logoutButton.onclick = logoutKimi;

    other.appendChild(logoutButton);
  }

  if (button) {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
  }
}

// جستجوی گفتگوها
$("search").addEventListener("input", event => {
  const query = event.target.value.toLowerCase();

  document.querySelectorAll(".chat-preview").forEach(item => {
    const name = item.dataset.name.toLowerCase();
    item.classList.toggle(
      "hidden",
      !name.includes(query)
    );
  });
});

// ارسال پیام تا زمان اتصال رمزگذاری و دیتابیس غیرفعال است.
$("composer").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("message");

  if (!input.value.trim()) return;

  alert(
    "ارسال پیام واقعی هنوز فعال نشده است. " +
    "ابتدا اتصال امن پیام‌رسان و رمزگذاری سرتاسری باید تکمیل شود."
  );
});

window.openChat = openChat;
window.showPage = showPage;
window.logoutKimi = logoutKimi;

// راه‌اندازی
async function initializeKimi() {
  try {
    buildLoginUI();

    setStatus("در حال اتصال به KIMI...");

    await loadSupabase();

    db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      currentUser = data.session.user;
      await enterApp();
    } else {
      resetAuth();
      setStatus("آماده ورود به KIMI.");
    }

    db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        currentUser = null;
      }
    });

    console.log("KIMI initialized successfully.");
  } catch (error) {
    console.error(error);
    setStatus(
      "اتصال برقرار نشد: " + error.message,
      true
    );
  }
}

initializeKimi();
