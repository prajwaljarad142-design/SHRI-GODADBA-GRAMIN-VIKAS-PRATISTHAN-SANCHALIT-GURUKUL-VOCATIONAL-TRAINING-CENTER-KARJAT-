const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const langToggle = document.querySelector(".lang-toggle");
const admissionForm = document.getElementById("admissionForm");
const quickForm = document.getElementById("quickForm");
const formMessage = document.getElementById("formMessage");
const quickFormMessage = document.getElementById("quickFormMessage");
const brochureLink = document.getElementById("downloadBrochure");
const submissionTableBody = document.getElementById("submissionTableBody");
const submissionCount = document.getElementById("submissionCount");
const exportSubmissionsButton = document.getElementById("exportSubmissions");
const clearSubmissionsButton = document.getElementById("clearSubmissions");
const adminLoginCard = document.getElementById("adminLoginCard");
const adminPanel = document.getElementById("adminPanel");
const adminPhoneInput = document.getElementById("adminPhoneInput");
const sendOtpButton = document.getElementById("sendOtpButton");
const otpRow = document.getElementById("otpRow");
const adminOtpInput = document.getElementById("adminOtpInput");
const verifyOtpButton = document.getElementById("verifyOtpButton");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const OTP_API_BASE = "https://shri-godadba-gramin-vikas-pratisthan.onrender.com";
const ADMIN_TOKEN_KEY = "ggvp-admin-token";
let currentLanguage = "en";

const messages = {
  en: {
    enterAdminPhone: "Please enter the admin phone number.",
    sendingOtp: "Sending OTP...",
    otpSent: "OTP sent successfully. Please enter the OTP.",
    enterOtp: "Please enter the OTP.",
    verifyingOtp: "Verifying OTP...",
    fullFormSaved: "Thank you. Your application has been saved successfully.",
    quickFormSaved: "Thank you. Your enquiry has been saved successfully.",
    noSubmissions: "No student forms submitted yet.",
    exportEmpty: "No submissions available to export.",
    clearConfirm: "Clear all student submissions?",
    adminSessionExpired: "Admin session expired. Please verify OTP again.",
    sendOtpLabel: "Send OTP"
  },
  mr: {
    enterAdminPhone: "कृपया प्रशासनाचा फोन नंबर टाका.",
    sendingOtp: "ओटीपी पाठवला जात आहे...",
    otpSent: "ओटीपी पाठवला गेला आहे. कृपया ओटीपी टाका.",
    enterOtp: "कृपया ओटीपी टाका.",
    verifyingOtp: "ओटीपी तपासला जात आहे...",
    fullFormSaved: "धन्यवाद. तुमचा अर्ज यशस्वीरित्या सेव्ह झाला आहे.",
    quickFormSaved: "धन्यवाद. तुमची चौकशी यशस्वीरित्या सेव्ह झाली आहे.",
    noSubmissions: "अजून कोणताही विद्यार्थी फॉर्म सबमिट झालेला नाही.",
    exportEmpty: "एक्सपोर्ट करण्यासाठी कोणतीही माहिती उपलब्ध नाही.",
    clearConfirm: "सर्व विद्यार्थ्यांची माहिती हटवायची का?",
    adminSessionExpired: "प्रशासन सत्र संपले आहे. कृपया पुन्हा ओटीपी तपासा.",
    sendOtpLabel: "ओटीपी पाठवा"
  }
};

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if (langToggle) {
  langToggle.addEventListener("click", () => {
    currentLanguage = currentLanguage === "en" ? "mr" : "en";
    document.body.classList.toggle("marathi", currentLanguage === "mr");
    document.documentElement.lang = currentLanguage === "mr" ? "mr" : "en";
    langToggle.textContent = currentLanguage === "mr" ? "English" : "मराठी";
    applyLanguage();
    loadAdminSubmissions().catch(() => renderSubmissions([]));
  });
}

if (brochureLink) {
  const brochureText = [
    "Godadba Gram Vikas Prathisthan Vocational Training Centre, Karjat",
    "Institute Code: MSB110141",
    "Course: Construction Supervisor Course",
    "Duration: 1 Year",
    "Fees: Rs. 16,000 Only",
    "Mode: Practical + Theory",
    "Affiliation: Government Affiliated Course - MSBVET",
    "Phone: 7666812148"
  ].join("\n");

  brochureLink.addEventListener("click", (event) => {
    event.preventDefault();
    const blob = new Blob([brochureText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const tempLink = document.createElement("a");
    tempLink.href = url;
    tempLink.download = brochureLink.getAttribute("download") || "brochure.txt";
    document.body.appendChild(tempLink);
    tempLink.click();
    tempLink.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function t(key) {
  return messages[currentLanguage][key] || messages.en[key] || key;
}

function normalizePhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function setAdminToken(token) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}

async function postJson(url, body, token = "") {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return requestJson(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

async function getJson(url, token = "") {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return requestJson(url, {
    method: "GET",
    headers
  });
}

async function deleteJson(url, token = "") {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return requestJson(url, {
    method: "DELETE",
    headers
  });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function renderSubmissions(submissions = []) {
  if (!submissionTableBody || !submissionCount) {
    return;
  }

  submissionCount.textContent = String(submissions.length);

  if (!submissions.length) {
    submissionTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">${t("noSubmissions")}</td>
      </tr>
    `;
    return;
  }

  submissionTableBody.innerHTML = submissions
    .slice()
    .reverse()
    .map((submission) => `
      <tr>
        <td>${submission.type === "Quick Enquiry" && currentLanguage === "mr" ? "झटपट चौकशी" : submission.type === "Full Form" && currentLanguage === "mr" ? "पूर्ण फॉर्म" : submission.type}</td>
        <td>${submission.name}</td>
        <td>${submission.phone}</td>
        <td>${submission.email || "-"}</td>
        <td>${submission.address || "-"}</td>
        <td>${currentLanguage === "mr" && submission.course === "Construction Supervisor Course" ? "कन्स्ट्रक्शन सुपरवायझर कोर्स" : submission.course}</td>
        <td>${formatDate(submission.submittedAt)}</td>
      </tr>
    `)
    .join("");
}

async function saveSubmission(data) {
  await postJson(`${OTP_API_BASE}/api/submissions`, data);
}

async function loadAdminSubmissions() {
  const token = getAdminToken();
  if (!token) {
    renderSubmissions([]);
    return;
  }

  try {
    const payload = await getJson(`${OTP_API_BASE}/api/admin/submissions`, token);
    renderSubmissions(payload.submissions || []);
  } catch (error) {
    if (error.message.includes("session")) {
      setAdminToken("");
      setAdminAccess(false);
      adminLoginMessage.textContent = t("adminSessionExpired");
    }
    throw error;
  }
}

function setAdminAccess(isAllowed) {
  if (!adminLoginCard || !adminPanel) {
    return;
  }

  adminLoginCard.style.display = isAllowed ? "none" : "block";
  adminPanel.classList.toggle("hidden", !isAllowed);
  if (!isAllowed && otpRow) {
    otpRow.classList.add("hidden");
  }
}

function applyLanguage() {
  const attributeName = currentLanguage === "mr" ? "data-mr" : "data-en";
  const placeholderName = currentLanguage === "mr" ? "data-mr-placeholder" : "data-en-placeholder";

  document.querySelectorAll("[data-en][data-mr]").forEach((node) => {
    const value = node.getAttribute(attributeName);
    if (value) {
      node.textContent = value;
    }
  });

  document.querySelectorAll("[data-en-placeholder][data-mr-placeholder]").forEach((node) => {
    const value = node.getAttribute(placeholderName);
    if (value) {
      node.setAttribute("placeholder", value);
    }
  });

  if (sendOtpButton) {
    sendOtpButton.textContent = sendOtpButton.disabled ? sendOtpButton.textContent : t("sendOtpLabel");
  }
}

function handleSuccess(messageNode, message, form) {
  messageNode.textContent = message;
  form.reset();
}

if (admissionForm && formMessage) {
  admissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(admissionForm);
    try {
      await saveSubmission({
        type: "Full Form",
        name: formData.get("fullName")?.toString().trim() || "",
        phone: formData.get("phone")?.toString().trim() || "",
        email: formData.get("email")?.toString().trim() || "",
        address: formData.get("address")?.toString().trim() || "",
        course: formData.get("course")?.toString().trim() || "",
        submittedAt: new Date().toISOString()
      });
      handleSuccess(formMessage, t("fullFormSaved"), admissionForm);
    } catch (error) {
      formMessage.textContent = error.message;
    }
  });
}

if (quickForm && quickFormMessage) {
  quickForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(quickForm);
    try {
      await saveSubmission({
        type: "Quick Enquiry",
        name: formData.get("name")?.toString().trim() || "",
        phone: formData.get("phone")?.toString().trim() || "",
        email: "",
        address: "",
        course: formData.get("course")?.toString().trim() || "",
        submittedAt: new Date().toISOString()
      });
      handleSuccess(quickFormMessage, t("quickFormSaved"), quickForm);
    } catch (error) {
      quickFormMessage.textContent = error.message;
    }
  });
}

if (sendOtpButton && adminPhoneInput && adminLoginMessage) {
  sendOtpButton.addEventListener("click", async () => {
    const phone = normalizePhoneNumber(adminPhoneInput.value);
    if (!phone) {
      adminLoginMessage.textContent = t("enterAdminPhone");
      return;
    }

    sendOtpButton.disabled = true;
    sendOtpButton.textContent = currentLanguage === "mr" ? "पाठवत आहे..." : "Sending...";
    adminLoginMessage.textContent = t("sendingOtp");

    try {
      await postJson(`${OTP_API_BASE}/api/admin/send-otp`, { phone });
      if (otpRow) {
        otpRow.classList.remove("hidden");
      }
      adminLoginMessage.textContent = t("otpSent");
    } catch (error) {
      adminLoginMessage.textContent = error.message;
    } finally {
      sendOtpButton.disabled = false;
      sendOtpButton.textContent = t("sendOtpLabel");
    }
  });
}

if (verifyOtpButton && adminPhoneInput && adminOtpInput && adminLoginMessage) {
  verifyOtpButton.addEventListener("click", async () => {
    const phone = normalizePhoneNumber(adminPhoneInput.value);
    const otp = adminOtpInput.value.trim();

    if (!otp) {
      adminLoginMessage.textContent = t("enterOtp");
      return;
    }

    adminLoginMessage.textContent = t("verifyingOtp");

    try {
      const payload = await postJson(`${OTP_API_BASE}/api/admin/verify-otp`, { phone, otp });
      setAdminToken(payload.token || "");
      setAdminAccess(true);
      adminLoginMessage.textContent = "";
      adminOtpInput.value = "";
      adminPhoneInput.value = "";
      await loadAdminSubmissions();
    } catch (error) {
      adminLoginMessage.textContent = error.message;
    }
  });
}

if (exportSubmissionsButton) {
  exportSubmissionsButton.addEventListener("click", async () => {
    try {
      const payload = await getJson(`${OTP_API_BASE}/api/admin/submissions`, getAdminToken());
      const submissions = payload.submissions || [];
      if (!submissions.length) {
        alert(t("exportEmpty"));
        return;
      }

      const headers = ["Type", "Name", "Phone", "Email", "Address", "Course", "Submitted At"];
      const rows = submissions.map((submission) => [
        submission.type,
        submission.name,
        submission.phone,
        submission.email || "",
        submission.address || "",
        submission.course,
        formatDate(submission.submittedAt)
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const tempLink = document.createElement("a");
      tempLink.href = url;
      tempLink.download = "student-submissions.csv";
      document.body.appendChild(tempLink);
      tempLink.click();
      tempLink.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      alert(error.message);
    }
  });
}

if (clearSubmissionsButton) {
  clearSubmissionsButton.addEventListener("click", async () => {
    const confirmed = window.confirm(t("clearConfirm"));
    if (!confirmed) {
      return;
    }

    try {
      await deleteJson(`${OTP_API_BASE}/api/admin/submissions`, getAdminToken());
      renderSubmissions([]);
    } catch (error) {
      alert(error.message);
    }
  });
}

if (adminLogoutButton) {
  adminLogoutButton.addEventListener("click", () => {
    setAdminToken("");
    setAdminAccess(false);
    renderSubmissions([]);
    if (adminOtpInput) {
      adminOtpInput.value = "";
    }
  });
}

applyLanguage();
if (getAdminToken()) {
  setAdminAccess(true);
  loadAdminSubmissions().catch(() => {
    setAdminToken("");
    setAdminAccess(false);
    renderSubmissions([]);
  });
} else {
  setAdminAccess(false);
  renderSubmissions([]);
}
