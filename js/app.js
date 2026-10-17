"use strict";

/**
 * HALLOWEEN COMMUNITY RUN
 * Frontend registration handler.
 *
 * Frontend: GitHub Pages
 * Backend: Google Apps Script
 * Database: Google Sheets
 * Receipt storage: Google Drive
 */

// ======================================================
// 1. BACKEND CONFIGURATION
// ======================================================

const BACKEND_URL =
    "https://script.google.com/macros/s/AKfycbyC4ze71ncipLFuCuWhplTjR6fQHp9pyNavgGExu96D-ayTzEI-76ee2mRB2cUGyx1H/exec";


// ======================================================
// 2. HTML ELEMENTS
// ======================================================

const registrationForm =
    document.getElementById("registrationForm");

const paymentMethod =
    document.getElementById("paymentMethod");

const onlinePaymentSection =
    document.getElementById("onlinePaymentSection");

const paymentProof =
    document.getElementById("paymentProof");

const selectedFilesContainer =
    document.getElementById("selectedFiles");

const uploadError =
    document.getElementById("uploadError");

const submitButton =
    document.getElementById("submitButton");

const formMessage =
    document.getElementById("formMessage");


// ======================================================
// 3. UPLOAD RULES
// ======================================================

const MAX_FILES = 2;

const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf"
];

const ALLOWED_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".pdf"
];

let isSubmitting = false;


// ======================================================
// 4. DISPLAY MESSAGES
// ======================================================

function showMessage(message, type) {

    formMessage.textContent = message;

    formMessage.hidden = false;

    formMessage.dataset.type = type || "info";

    formMessage.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}


// ======================================================
// 5. PAYMENT METHOD
// ======================================================

function updatePaymentMethod() {

    const isOnline = ["AUB", "GCash"].includes(paymentMethod.value);

    onlinePaymentSection.hidden = !isOnline;

    paymentProof.required = isOnline;

    paymentProof.disabled = !isOnline;

    if (!isOnline) {
        paymentProof.value = "";
    }

    uploadError.hidden = true;

    uploadError.textContent = "";

}

// ======================================================
// DISPLAY AND REMOVE SELECTED RECEIPT FILES
// ======================================================

function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + " B";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


function renderSelectedFiles() {
    const files = Array.from(paymentProof.files || []);

    selectedFilesContainer.replaceChildren();

    files.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "selected-file-item";

        const info = document.createElement("div");
        info.className = "selected-file-info";

        const name = document.createElement("span");
        name.className = "selected-file-name";
        name.textContent = file.name;

        const size = document.createElement("span");
        size.className = "selected-file-size";
        size.textContent = formatFileSize(file.size);

        info.append(name, size);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-file-button";
        removeButton.textContent = "Remove";

        removeButton.setAttribute(
            "aria-label",
            "Remove " + file.name
        );

        removeButton.addEventListener("click", () => {
            const updatedFiles = Array.from(paymentProof.files);

            updatedFiles.splice(index, 1);

            const dataTransfer = new DataTransfer();

            updatedFiles.forEach((remainingFile) => {
                dataTransfer.items.add(remainingFile);
            });

            paymentProof.files = dataTransfer.files;

            renderSelectedFiles();

            const error = validateFiles(
                Array.from(paymentProof.files)
            );

            uploadError.textContent = error;
            uploadError.hidden = !error;
        });

        item.append(info, removeButton);

        selectedFilesContainer.appendChild(item);
    });
}

// ======================================================
// 6. VALIDATE RECEIPT FILES
// ======================================================

function validateFiles(files) {

    if (files.length > MAX_FILES) {
        return "You can upload a maximum of 2 files.";
    }

    let totalSize = 0;

    for (const file of files) {

        totalSize += file.size;

        const extension =
            "." + file.name.split(".").pop().toLowerCase();

        if (
            !ALLOWED_TYPES.includes(file.type) ||
            !ALLOWED_EXTENSIONS.includes(extension)
        ) {
            return "Only JPG, JPEG, PNG, and PDF files are allowed.";
        }

    }

    if (totalSize > MAX_TOTAL_BYTES) {
        return "The combined file size must not exceed 10 MB.";
    }

    return "";

}


// ======================================================
// 7. CONVERT RECEIPTS TO BASE64
// ======================================================

function fileToPayload(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            const result = String(reader.result || "");

            const comma = result.indexOf(",");

            if (comma < 0) {

                reject(
                    new Error("Could not read " + file.name + ".")
                );

                return;

            }

            resolve({

                name: file.name,

                mimeType: file.type,

                data: result.slice(comma + 1),

                size: file.size

            });

        };

        reader.onerror = () => {

            reject(
                new Error(
                    "Could not read " +
                    file.name +
                    ". Please select it again."
                )
            );

        };

        reader.readAsDataURL(file);

    });

}


// ======================================================
// 8. CREATE A SUBMISSION ID
// ======================================================

function createSubmissionId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {

        return window.crypto.randomUUID();

    }

    return (
        "hcr-" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2)
    );

}


// ======================================================
// 9. SUBMIT REGISTRATION TO GOOGLE APPS SCRIPT
// ======================================================

async function submitRegistration(payload) {

    const response = await fetch(BACKEND_URL, {

        method: "POST",

        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },

        body: JSON.stringify(payload),

        redirect: "follow"

    });

    if (!response.ok) {

        throw new Error(
            "The server returned HTTP " + response.status
        );

    }

    const result = await response.json();

    if (!result || result.success !== true) {

        throw new Error(
            result && result.message
                ? result.message
                : "The registration could not be completed."
        );

    }

    return result;

}


// ======================================================
// 10. PAYMENT METHOD EVENT
// ======================================================

paymentMethod.addEventListener(
    "change",
    updatePaymentMethod
);


// ======================================================
// 11. RECEIPT SELECTION EVENT
// ======================================================

paymentProof.addEventListener("change", () => {

    renderSelectedFiles();

    const error = validateFiles(
        Array.from(paymentProof.files || [])
    );

    uploadError.textContent = error;

    uploadError.hidden = !error;

});


// Initialize the payment section.

updatePaymentMethod();


// ======================================================
// 12. REGISTRATION FORM SUBMISSION
// ======================================================

registrationForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        formMessage.hidden = true;

        uploadError.hidden = true;


        // ----------------------------------------------
        // Read form values
        // ----------------------------------------------

        const email =
            document.getElementById("email").value.trim();

        const fullName =
            document.getElementById("fullName").value.trim();

        const sex =
            document.getElementById("sex").value;

        const amountInput =
            document.getElementById("amount").value;

        const amount = Number(amountInput);

        const method = paymentMethod.value;

        const waiverAccepted =
            document.getElementById("waiverAccepted").checked;

        const files =
            method !== "Pay Onsite"
                ? Array.from(paymentProof.files || [])
                : [];


        // ----------------------------------------------
        // Validate email
        // ----------------------------------------------

        if (
            !email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {

            showMessage(
                "Please enter a valid email address.",
                "error"
            );

            return;

        }


        // ----------------------------------------------
        // Validate full name
        // ----------------------------------------------

        if (!fullName || fullName.length > 150) {

            showMessage(
                "Please enter your full name (maximum 150 characters).",
                "error"
            );

            return;

        }


        // ----------------------------------------------
        // Validate sex
        // ----------------------------------------------

        if (!["Male", "Female"].includes(sex)) {

            showMessage(
                "Please select your sex.",
                "error"
            );

            return;

        }


        // ----------------------------------------------
        // Validate contribution
        // ----------------------------------------------

        if (
            !Number.isFinite(amount) ||
            amount < 100 ||
            amount > 1000000 ||
            Math.round(amount * 100) !== amount * 100
        ) {

            showMessage(
                "Enter a valid contribution of at least ₱100.",
                "error"
            );

            return;

        }


        // ----------------------------------------------
        // Validate payment method
        // ----------------------------------------------

        if (!["AUB", "GCash", "Pay Onsite"].includes(method)) {

            showMessage(
                "Please select a payment method.",
                "error"
            );

            return;

        }


        // ----------------------------------------------
        // Validate waiver
        // ----------------------------------------------

        if (!waiverAccepted) {

            showMessage(
                "Please accept the participation waiver before registering.",
                "error"
            );

            return;

        }


        // ----------------------------------------------
        // Validate payment receipts
        // ----------------------------------------------

        if (method !== "Pay Onsite") {

            const fileError = validateFiles(files);

            if (fileError) {

                uploadError.textContent = fileError;

                uploadError.hidden = false;

                return;

            }

            if (!files.length) {

                uploadError.textContent =
                    "Please upload at least one proof-of-payment file for online payment.";

                uploadError.hidden = false;

                return;

            }

        }


        // ----------------------------------------------
        // Begin submission
        // ----------------------------------------------

        isSubmitting = true;

        submitButton.disabled = true;

        const originalButtonText = submitButton.textContent;

        submitButton.textContent = "SUBMITTING...";

        showMessage(
            "Submitting your registration. Please keep this page open.",
            "info"
        );


        try {

            // Convert receipt files into upload payloads.

            const filePayloads = await Promise.all(
                files.map(fileToPayload)
            );


            // Build the registration payload.

            const payload = {

                submissionId: createSubmissionId(),

                email: email,

                fullName: fullName,

                sex: sex,

                paymentMethod: method,

                amount: amount,

                waiverAccepted: waiverAccepted,

                files: filePayloads,

                source: "Halloween Community Run Website"

            };


            // Send the request and read the backend response.

            const result = await submitRegistration(payload);


            // Display the confirmed result.

            showMessage(
                "Registration successful! Your reference number is " +
                result.registrationId +
                ". Please check your email for the confirmation message.",
                "success"
            );


            // Clear the form after confirmed success.

            registrationForm.reset();

            updatePaymentMethod();

        } catch (error) {

            console.error(
                "Registration submission error:",
                error
            );

            showMessage(
                "We could not confirm your registration. " +
                (error.message || "Please try again later.") +
                " Before resubmitting, check your email or contact Velocity 5000 to avoid duplicate registrations.",
                "error"
            );

        } finally {

            isSubmitting = false;

            submitButton.disabled = false;

            submitButton.textContent = originalButtonText;

        }

    }
);