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
const STORAGE_KEY = "ggvp-student-submissions";
const OTP_API_BASE = "https://shri-godadba-gramin-vikas-pratisthan.onrender.com";
let currentLanguage = "en";

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
    renderSubmissions();
  });
}

if (brochureLink) {
  const brochureText = [
    "Godadba Gram Vikas Prathisthan Vocational Training Centre, Karjat",
    "Institute Code: MSB110141",
    "",
    "Course: Construction Supervisor Course",
    "Duration: 1 Year",
    "Fees: Rs. 16,000 Only",
    "Mode: Practical + Theory",
    "",
    "Benefits:",
    "- Certification Provided",
    "- Practical Site Experience",
    "- Guidance for ZP License up to Rs. 10 Lakhs work eligibility",
    "- Support from Experienced Staff",
    "",
    "Contact:",
    "Phone: 7666812148",
    "Location: At Post Karjat, Dist. Ahilyanagar, Tal. Karjat, Nagar Road, backside of Bhakti Mangal Karyalay"
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

function getSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSubmissions(submissions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

function normalizePhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function renderSubmissions() {
  if (!submissionTableBody || !submissionCount) {
    return;
  }

  const submissions = getSubmissions();
  submissionCount.textContent = String(submissions.length);

  if (!submissions.length) {
    submissionTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">${currentLanguage === "mr" ? "अजून कोणताही विद्यार्थी फॉर्म सबमिट झालेला नाही." : "No student forms submitted yet."}</td>
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

function addSubmission(data) {
  const submissions = getSubmissions();
  submissions.push(data);
  saveSubmissions(submissions);
  renderSubmissions();
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
}

function handleSuccess(messageNode, message, form) {
  messageNode.textContent = message;
  form.reset();
}

if (admissionForm && formMessage) {
  admissionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(admissionForm);
    addSubmission({
      type: "Full Form",
      name: formData.get("fullName")?.toString().trim() || "",
      phone: formData.get("phone")?.toString().trim() || "",
      email: formData.get("email")?.toString().trim() || "",
      address: formData.get("address")?.toString().trim() || "",
      course: formData.get("course")?.toString().trim() || "",
      submittedAt: new Date().toISOString()
    });
    handleSuccess(
      formMessage,
      currentLanguage === "mr"
        ? "धन्यवाद. तुमचा अर्ज सेव्ह झाला आहे आणि आता प्रशासन विभागात दिसेल. तात्काळ मदतीसाठी 7666812148 वर कॉल करा."
        : "Thank you. Your application has been recorded and is now visible in the admin section. Please call 7666812148 for immediate assistance.",
      admissionForm
    );
  });
}

if (quickForm && quickFormMessage) {
  quickForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(quickForm);
    addSubmission({
      type: "Quick Enquiry",
      name: formData.get("name")?.toString().trim() || "",
      phone: formData.get("phone")?.toString().trim() || "",
      email: "",
      address: "",
      course: formData.get("course")?.toString().trim() || "",
      submittedAt: new Date().toISOString()
    });
    handleSuccess(
      quickFormMessage,
      currentLanguage === "mr"
        ? "धन्यवाद. तुमची चौकशी सेव्ह झाली आहे आणि आता प्रशासन विभागात दिसेल."
        : "Thank you. Your enquiry has been saved and is now visible in the admin section.",
      quickForm
    );
  });
}

if (exportSubmissionsButton) {
  exportSubmissionsButton.addEventListener("click", () => {
    const submissions = getSubmissions();
    if (!submissions.length) {
      alert(currentLanguage === "mr" ? "एक्सपोर्ट करण्यासाठी कोणतीही माहिती उपलब्ध नाही." : "No submissions available to export.");
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
  });
}

if (clearSubmissionsButton) {
  clearSubmissionsButton.addEventListener("click", () => {
    const submissions = getSubmissions();
    if (!submissions.length) {
      alert(currentLanguage === "mr" ? "हटवण्यासाठी कोणतीही सेव्ह केलेली माहिती नाही." : "There are no saved submissions to clear.");
      return;
    }

    const confirmed = window.confirm(
      currentLanguage === "mr"
        ? "या ब्राउझरमधील सर्व सेव्ह विद्यार्थ्यांची माहिती हटवायची का?"
        : "Clear all saved student submissions from this browser?"
    );
    if (!confirmed) {
      return;
    }

    saveSubmissions([]);
    renderSubmissions();
  });
}

if (sendOtpButton && adminPhoneInput && adminLoginMessage) {
  sendOtpButton.addEventListener("click", async () => {
    const phone = normalizePhoneNumber(adminPhoneInput.value);
    if (!phone) {
      adminLoginMessage.textContent =
        currentLanguage === "mr"
          ? "कृपया प्रशासनाचा फोन नंबर टाका."
          : "Please enter the admin phone number.";
      return;
    }

    adminLoginMessage.textContent =
      currentLanguage === "mr"
        ? "OTP पाठवला जात आहे..."
        : "Sending OTP...";

    try {
      await postJson(`${OTP_API_BASE}/api/admin/send-otp`, { phone });
      if (otpRow) {
        otpRow.classList.remove("hidden");
      }
      adminLoginMessage.textContent =
        currentLanguage === "mr"
          ? "OTP पाठवला गेला आहे. कृपया OTP टाका."
          : "OTP sent successfully. Please enter the OTP.";
    } catch (error) {
      adminLoginMessage.textContent = error.message;
    }
  });
}

if (verifyOtpButton && adminPhoneInput && adminOtpInput && adminLoginMessage) {
  verifyOtpButton.addEventListener("click", async () => {
    const phone = normalizePhoneNumber(adminPhoneInput.value);
    const otp = adminOtpInput.value.trim();

    if (!otp) {
      adminLoginMessage.textContent =
        currentLanguage === "mr"
          ? "कृपया OTP टाका."
          : "Please enter the OTP.";
      return;
    }

    adminLoginMessage.textContent =
      currentLanguage === "mr"
        ? "OTP तपासला जात आहे..."
        : "Verifying OTP...";

    try {
      await postJson(`${OTP_API_BASE}/api/admin/verify-otp`, { phone, otp });
      setAdminAccess(true);
      adminLoginMessage.textContent = "";
      adminOtpInput.value = "";
      adminPhoneInput.value = "";
    } catch (error) {
      adminLoginMessage.textContent = error.message;
    }
  });
}

if (adminLogoutButton) {
  adminLogoutButton.addEventListener("click", () => {
    setAdminAccess(false);
    if (adminOtpInput) {
      adminOtpInput.value = "";
    }
  });
}

applyLanguage();
setAdminAccess(false);
renderSubmissions();
