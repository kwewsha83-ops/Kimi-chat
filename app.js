
/* =====================================================
   KIMI CHAT - COMPLETE APP.JS
   Authentication | Profiles | User Search
   Direct Messages | Encryption | Realtime + Polling
   ===================================================== */

"use strict";

/* -------------------- CONFIG -------------------- */

const KIMI_CONFIG = {
  url: "https://hbnlizgkxysqkyjqkxhn.supabase.co",
  key: "sb_publishable_kUuPY55JRHPtIMyZR5YAGQ_8klkwq1l"
};

let kimiDB = null;
let kimiUser = null;
let kimiProfile = null;
let kimiPrivateKey = null;
let kimiConversation = null;
let kimiPeer = null;
let kimiMessages = [];
let kimiRealtime = null;
let kimiPoller = null;
let kimiAuthMode = "phone";
let kimiIdentity = "";
let kimiBusy = false;

/* -------------------- HELPERS -------------------- */

const K = id => document.getElementById(id);

function kimiEscape(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function kimiNotice(message) {
  const box = K("kimiNotice");
  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.classList.add("show");

  clearTimeout(box._timer);
  box._timer = setTimeout(() => {
    box.classList.remove("show");
  }, 3500);
}

function kimiHandleError(error, fallback = "خطایی رخ داد.") {
  console.error("KIMI ERROR:", error);
  kimiNotice(error?.message || fallback);
}

function kimiSetBusy(button, busy, label = "لطفاً صبر کن...") {
  if (!button) return;

  if (busy) {
    button.dataset.oldText = button.textContent;
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.oldText || "ادامه";
  }
}

function kimiBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function kimiUnbase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function kimiParsePublicKey(value) {
  if (!value) return null;
  return typeof value === "string" ? JSON.parse(value) : value;
}

/* -------------------- USER INTERFACE -------------------- */

function kimiInstallUI() {
  if (K("kimiRoot")) return;

  const root = document.createElement("div");
  root.id = "kimiRoot";

  root.innerHTML = `
  <style>
    #kimiRoot {
      direction:rtl;
      min-height:100vh;
      background:#10111b;
      color:#f7f7fb;
      font-family:Tahoma,Arial,sans-serif;
      padding:14px;
      box-sizing:border-box;
    }

    #kimiRoot * { box-sizing:border-box; }

    .k-wrap { max-width:850px; margin:auto; }

    .k-logo {
      text-align:center;
      color:#a18cff;
      font-size:34px;
      font-weight:bold;
      padding:20px;
    }

    .k-card {
      background:#1b1d2b;
      border:1px solid #303247;
      border-radius:18px;
      padding:18px;
      margin:12px 0;
    }

    .k-title {
      font-size:21px;
      margin:0 0 10px;
    }

    .k-muted {
      color:#a7a8ba;
      font-size:13px;
      line-height:1.8;
    }

    .k-input {
      display:block;
      width:100%;
      margin:9px 0;
      padding:14px;
      border-radius:12px;
      border:1px solid #3a3d54;
      outline:none;
      background:#111321;
      color:white;
      font-size:15px;
    }

    .k-input:focus { border-color:#9d8cff; }

    .k-btn {
      width:100%;
      padding:14px;
      margin-top:9px;
      border:0;
      border-radius:12px;
      background:#8874f5;
      color:white;
      font-size:15px;
      font-weight:bold;
      cursor:pointer;
    }

    .k-btn:disabled { opacity:.5; }

    .k-btn.secondary { background:#303247; }
    .k-btn.danger { background:#923b54; }

    .k-tabs {
      display:flex;
      gap:8px;
      margin:14px 0;
    }

    .k-tabs button {
      flex:1;
      padding:12px;
      border:0;
      border-radius:10px;
      color:white;
      background:#303247;
    }

    .k-tabs button.active { background:#8874f5; }

    .k-hidden { display:none !important; }

    .k-top {
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
    }

    .k-smallbtn {
      background:#303247;
      color:white;
      border:0;
      border-radius:9px;
      padding:10px;
    }

    .k-user {
      display:flex;
      align-items:center;
      gap:12px;
      padding:12px;
      border-bottom:1px solid #303247;
      cursor:pointer;
    }

    .k-user:hover { background:#25283a; }

    .k-avatar {
      width:44px;
      height:44px;
      flex-shrink:0;
      border-radius:50%;
      background:#8874f5;
      display:grid;
      place-items:center;
      font-weight:bold;
    }

    .k-user-info { min-width:0; flex:1; }
    .k-user-info strong { display:block; }
    .k-user-info small { color:#a7a8ba; }

    .k-chat {
      height:52vh;
      min-height:280px;
      overflow-y:auto;
      padding:12px;
      background:#111321;
      border-radius:14px;
    }

    .k-message {
      max-width:82%;
      width:fit-content;
      padding:11px 14px;
      border-radius:14px;
      margin:8px 0;
      overflow-wrap:anywhere;
      background:#303247;
      white-space:pre-wrap;
    }

    .k-message.mine {
      background:#51459c;
      margin-right:auto;
    }

    .k-message small {
      display:block;
      opacity:.65;
      font-size:10px;
      margin-top:5px;
    }

    .k-empty {
      text-align:center;
      padding:28px;
      color:#a7a8ba;
    }

    .k-message-form {
      display:flex;
      gap:8px;
      margin-top:10px;
    }

    .k-message-form input {
      flex:1;
      min-width:0;
    }

    .k-message-form button {
      width:85px;
      margin:9px 0;
    }

    #kimiNotice {
      position:fixed;
      z-index:99999;
      bottom:15px;
      left:15px;
      right:15px;
      max-width:520px;
      margin:auto;
      padding:14px;
      border-radius:12px;
      background:#34364c;
      text-align:center;
      display:none;
    }

    #kimiNotice.show { display:block; }
  </style>

  <div class="k-wrap">
    <div class="k-logo">KIMI</div>
    <div id="kimiNotice"></div>

    <section id="kimiAuth" class="k-card">
      <h2 class="k-title">ورود به KIMI</h2>
      <p class="k-muted">با شماره تلفن یا ایمیل وارد حساب خود شو.</p>

      <div class="k-tabs">
        <button id="kimiPhoneTab" class="active" type="button">
          شماره تلفن
        </button>
        <button id="kimiEmailTab" type="button">
          ایمیل
        </button>
      </div>

      <input id="kimiIdentity" class="k-input"
        placeholder="شماره با کد کشور، مانند +49123456789">

      <button id="kimiSendCode" class="k-btn" type="button">
        ارسال کد تأیید
      </button>

      <div id="kimiOtpArea" class="k-hidden">
        <input id="kimiOtp" class="k-input"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="کد تأیید">

        <button id="kimiVerifyCode" class="k-btn" type="button">
          تأیید و ورود
        </button>
      </div>
    </section>

    <section id="kimiPhoneSetup" class="k-card k-hidden">
      <h2 class="k-title">ثبت شماره تلفن</h2>
      <p class="k-muted">
        برای تکمیل حساب، شماره تلفنت را وارد کن.
        در ورود ایمیلی برای این شماره پیامک ارسال نمی‌شود.
      </p>

      <input id="kimiRequiredPhone" class="k-input"
        placeholder="+49123456789">

      <button id="kimiSavePhone" class="k-btn" type="button">
        ثبت شماره و ادامه
      </button>
    </section>

    <section id="kimiProfileSetup" class="k-card k-hidden">
      <h2 class="k-title">ساخت حساب KIMI</h2>
      <p class="k-muted">نام نمایشی و آیدی خودت را انتخاب کن.</p>

      <input id="kimiDisplayName" class="k-input"
        placeholder="نام نمایشی">

      <input id="kimiUsername" class="k-input"
        placeholder="آیدی انگلیسی، مانند kimi_user">

      <button id="kimiSaveProfile" class="k-btn" type="button">
        ساخت حساب
      </button>
    </section>

    <section id="kimiApp" class="k-hidden">
      <div class="k-card">
        <div class="k-top">
          <div>
            <h2 class="k-title">
              سلام، <span id="kimiMyName"></span>
            </h2>
            <div class="k-muted">
              آیدی شما: @<span id="kimiMyUsername"></span>
            </div>
          </div>
          <button id="kimiLogout" class="k-smallbtn" type="button">
            خروج
          </button>
        </div>

        <button id="kimiShowAccount" class="k-btn secondary" type="button">
          حساب کاربری
        </button>
      </div>

      <div id="kimiHome">
        <div class="k-card">
          <h3 class="k-title">جستجوی کاربران</h3>
          <input id="kimiSearchInput" class="k-input"
            placeholder="آیدی کاربر را وارد کن">

          <button id="kimiSearchButton" class="k-btn" type="button">
            جستجو
          </button>

          <div id="kimiSearchResults"></div>
        </div>

        <div class="k-card">
          <h3 class="k-title">گفتگوها</h3>
          <div id="kimiConversationList" class="k-empty">
            هنوز گفتگویی نداری.
          </div>
        </div>
      </div>

      <div id="kimiChatScreen" class="k-hidden">
        <div class="k-card">
          <div class="k-top">
            <div>
              <h3 class="k-title" id="kimiChatTitle">گفتگو</h3>
              <div class="k-muted" id="kimiChatUsername"></div>
            </div>

            <button id="kimiBackHome" class="k-smallbtn" type="button">
              بازگشت
            </button>
          </div>

          <div id="kimiMessages" class="k-chat"></div>

          <div class="k-message-form">
            <input id="kimiMessageInput" class="k-input"
              placeholder="پیامت را بنویس...">

            <button id="kimiSendMessage" class="k-btn" type="button">
              ارسال
            </button>
          </div>
        </div>
      </div>

      <div id="kimiAccountScreen" class="k-card k-hidden">
        <h3 class="k-title">حساب کاربری</h3>
        <p>نام: <span id="kimiAccountName"></span></p>
        <p>آیدی: @<span id="kimiAccountUsername"></span></p>

        <button id="kimiAccountBack" class="k-btn secondary" type="button">
          بازگشت
        </button>
      </div>
    </section>
  </div>
  `;

  document.body.appendChild(root);
}

/* -------------------- SUPABASE -------------------- */

async function kimiLoadSupabase() {
  if (window.supabase?.createClient) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("بارگذاری کتابخانه Supabase ناموفق بود."));

    document.head.appendChild(script);
  });
}

/* -------------------- AUTHENTICATION -------------------- */

function kimiSetAuthMode(mode) {
  kimiAuthMode = mode;

  const phone = mode === "phone";

  K("kimiPhoneTab").classList.toggle("active", phone);
  K("kimiEmailTab").classList.toggle("active", !phone);

  K("kimiIdentity").placeholder = phone
    ? "شماره با کد کشور، مانند +49123456789"
    : "ایمیل شما";

  K("kimiIdentity").value = "";
  K("kimiOtp").value = "";
  K("kimiOtpArea").classList.add("k-hidden");
}

async function kimiSendOtp() {
  const identity = K("kimiIdentity").value.trim();

  if (!identity) {
    return kimiNotice("شماره تلفن یا ایمیل را وارد کن.");
  }

  if (kimiBusy) return;

  if (kimiAuthMode === "phone" &&
      !/^\+[1-9]\d{7,14}$/.test(identity)) {
    return kimiNotice("شماره را با کد کشور وارد کن.");
  }

  if (kimiAuthMode === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)) {
    return kimiNotice("ایمیل معتبر وارد کن.");
  }

  kimiBusy = true;
  kimiSetBusy(K("kimiSendCode"), true, "در حال ارسال...");

  try {
    kimiIdentity = identity;

    const options = kimiAuthMode === "phone"
      ? { phone: identity }
      : { email: identity };

    const { error } = await kimiDB.auth.signInWithOtp(options);

    if (error) throw error;

    K("kimiOtpArea").classList.remove("k-hidden");

    kimiNotice(
      kimiAuthMode === "phone"
        ? "کد تأیید به شماره تلفن ارسال شد."
        : "کد تأیید به ایمیل ارسال شد."
    );
  } catch (error) {
    kimiHandleError(error, "ارسال کد انجام نشد.");
  } finally {
    kimiBusy = false;
    kimiSetBusy(K("kimiSendCode"), false);
  }
}

async function kimiVerifyOtp() {
  const token = K("kimiOtp").value.trim();

  if (!token) return kimiNotice("کد تأیید را وارد کن.");
  if (kimiBusy) return;

  kimiBusy = true;
  kimiSetBusy(K("kimiVerifyCode"), true, "در حال بررسی...");

  try {
    const options = kimiAuthMode === "phone"
      ? {
          phone: kimiIdentity,
          token,
          type: "sms"
        }
      : {
          email: kimiIdentity,
          token,
          type: "email"
        };

    const { data, error } = await kimiDB.auth.verifyOtp(options);

    if (error) throw error;

    kimiUser = data.user;

    if (!kimiUser) {
      throw new Error("حساب کاربری دریافت نشد.");
    }

    if (kimiAuthMode === "phone") {
      const { error: contactError } = await kimiDB
        .from("account_contacts")
        .upsert({
          user_id: kimiUser.id,
          phone_e164: kimiIdentity,
          phone_verified: true
        }, { onConflict: "user_id" });

      if (contactError) throw contactError;
    } else {
      const { data: contact, error: contactError } = await kimiDB
        .from("account_contacts")
        .select("phone_e164")
        .eq("user_id", kimiUser.id)
        .maybeSingle();

      if (contactError) throw contactError;

      if (!contact?.phone_e164) {
        K("kimiAuth").classList.add("k-hidden");
        K("kimiPhoneSetup").classList.remove("k-hidden");
        return;
      }
    }

    await kimiContinueLogin();
  } catch (error) {
    kimiHandleError(error, "کد تأیید نامعتبر است.");
  } finally {
    kimiBusy = false;
    kimiSetBusy(K("kimiVerifyCode"), false);
  }
}

async function kimiSaveRequiredPhone() {
  const phone = K("kimiRequiredPhone").value.trim();

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return kimiNotice("شماره را با کد کشور وارد کن.");
  }

  try {
    const { error } = await kimiDB
      .from("account_contacts")
      .upsert({
        user_id: kimiUser.id,
        phone_e164: phone,
        phone_verified: false
      }, { onConflict: "user_id" });

    if (error) throw error;

    K("kimiPhoneSetup").classList.add("k-hidden");
    await kimiContinueLogin();
  } catch (error) {
    kimiHandleError(error, "ثبت شماره انجام نشد.");
  }
}

/* -------------------- PROFILE -------------------- */

async function kimiContinueLogin() {
  K("kimiAuth").classList.add("k-hidden");
  K("kimiPhoneSetup").classList.add("k-hidden");

  const { data, error } = await kimiDB
    .from("profiles")
    .select("*")
    .eq("id", kimiUser.id)
    .maybeSingle();

  if (error) throw error;

  if (!data || !data.username) {
    K("kimiProfileSetup").classList.remove("k-hidden");
    return;
  }

  kimiProfile = data;

  await kimiEnsureKeys();
  kimiEnterApp();
}

async function kimiSaveProfile() {
  const displayName = K("kimiDisplayName").value.trim();
  const username = K("kimiUsername").value.trim().toLowerCase();

  if (!displayName) {
    return kimiNotice("نام نمایشی را وارد کن.");
  }

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return kimiNotice(
      "آیدی باید ۳ تا ۲۴ حرف انگلیسی، عدد یا زیرخط باشد."
    );
  }

  const button = K("kimiSaveProfile");
  kimiSetBusy(button, true, "در حال ساخت...");

  try {
    const { data: existing, error: checkError } = await kimiDB
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing && existing.id !== kimiUser.id) {
      throw new Error("این آیدی قبلاً انتخاب شده است.");
    }

    const { data, error } = await kimiDB
      .from("profiles")
      .upsert({
        id: kimiUser.id,
        username,
        display_name: displayName
      }, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;

    kimiProfile = data;

    await kimiEnsureKeys();

    K("kimiProfileSetup").classList.add("k-hidden");
    kimiEnterApp();
  } catch (error) {
    kimiHandleError(error, "ساخت حساب انجام نشد.");
  } finally {
    kimiSetBusy(button, false);
  }
}

/* -------------------- LOCAL KEY STORAGE -------------------- */

function kimiOpenKeyDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("KIMI_PRIVATE_KEYS", 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function kimiStorePrivateKey(userId, key) {
  const db = await kimiOpenKeyDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("keys", "readwrite");

    tx.objectStore("keys").put(key, userId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function kimiGetPrivateKey(userId) {
  const db = await kimiOpenKeyDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("keys", "readonly");
    const request = tx.objectStore("keys").get(userId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/* -------------------- CRYPTOGRAPHY -------------------- */

async function kimiEnsureKeys() {
  if (!window.crypto?.subtle) {
    throw new Error(
      "مرورگر از رمزگذاری امن پشتیبانی نمی‌کند."
    );
  }

  const stored = await kimiGetPrivateKey(kimiUser.id);

  if (stored) {
    kimiPrivateKey = await crypto.subtle.importKey(
      "jwk",
      stored,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      false,
      ["decrypt"]
    );

    if (!kimiProfile.public_key) {
      const publicJwk = {
        kty: stored.kty,
        n: stored.n,
        e: stored.e,
        alg: "RSA-OAEP-256",
        ext: true,
        key_ops: ["encrypt"]
      };

      const { data, error } = await kimiDB
        .from("profiles")
        .update({
          public_key: JSON.stringify(publicJwk)
        })
        .eq("id", kimiUser.id)
        .select()
        .single();

      if (error) throw error;

      kimiProfile = data;
    }

    return;
  }

  if (kimiProfile.public_key) {
    throw new Error(
      "کلید خصوصی این حساب در این مرورگر موجود نیست. " +
      "برای جلوگیری از خراب‌شدن پیام‌های قبلی، کلید جدید جایگزین نشد."
    );
  }

  const pair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );

  const privateJwk = await crypto.subtle.exportKey(
    "jwk",
    pair.privateKey
  );

  const publicJwk = await crypto.subtle.exportKey(
    "jwk",
    pair.publicKey
  );

  await kimiStorePrivateKey(kimiUser.id, privateJwk);

  const { data, error } = await kimiDB
    .from("profiles")
    .update({
      public_key: JSON.stringify(publicJwk)
    })
    .eq("id", kimiUser.id)
    .select()
    .single();

  if (error) throw error;

  kimiProfile = data;
  kimiPrivateKey = pair.privateKey;
}

async function kimiImportPublicKey(profile) {
  const jwk = kimiParsePublicKey(profile?.public_key);

  if (!jwk) {
    throw new Error(
      "این کاربر هنوز کلید امنیتی ندارد."
    );
  }

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    {
   
