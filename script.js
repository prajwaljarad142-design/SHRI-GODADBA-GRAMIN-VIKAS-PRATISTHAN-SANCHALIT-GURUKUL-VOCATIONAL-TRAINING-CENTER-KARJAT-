if (admissionForm && formMessage) {
  admissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(admissionForm);
    const submission = {
      type: "Full Form",
      name: formData.get("fullName")?.toString().trim() || "",
      phone: formData.get("phone")?.toString().trim() || "",
      email: formData.get("email")?.toString().trim() || "",
      address: formData.get("address")?.toString().trim() || "",
      course: formData.get("course")?.toString().trim() || "",
      submittedAt: new Date().toISOString()
    };

    try {
      await postJson(`${OTP_API_BASE}/api/submissions`, submission);
    } catch (e) {
      console.warn("Sheet save failed, saving locally only:", e.message);
    }

    addSubmission(submission); // still saves to localStorage as backup
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
  quickForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(quickForm);
    const submission = {
      type: "Quick Enquiry",
      name: formData.get("name")?.toString().trim() || "",
      phone: formData.get("phone")?.toString().trim() || "",
      email: "",
      address: "",
      course: formData.get("course")?.toString().trim() || "",
      submittedAt: new Date().toISOString()
    };

    try {
      await postJson(`${OTP_API_BASE}/api/submissions`, submission);
    } catch (e) {
      console.warn("Sheet save failed, saving locally only:", e.message);
    }

    addSubmission(submission);
    handleSuccess(
      quickFormMessage,
      currentLanguage === "mr"
        ? "धन्यवाद. तुमची चौकशी सेव्ह झाली आहे आणि आता प्रशासन विभागात दिसेल."
        : "Thank you. Your enquiry has been saved and is now visible in the admin section.",
      quickForm
    );
  });
}